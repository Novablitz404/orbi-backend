import {
  rpc,
  Keypair,
  TransactionBuilder,
  Transaction,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  xdr,
} from '@stellar/stellar-sdk';
import { randomUUID } from 'crypto';
import {
  insertBundleEntry,
  claimPendingBundle,
  updateBundleEntries,
  getBundleEntry,
  BundleRow,
} from './supabase';

const IS_MAINNET = process.env.NETWORK === 'mainnet';

const SOROBAN_RPC_URL = IS_MAINNET
  ? 'https://mainnet.sorobanrpc.com'
  : 'https://soroban-testnet.stellar.org';

const NETWORK_PASSPHRASE = IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET;

const BUNDLER_CONTRACT_ID = IS_MAINNET
  ? (process.env.BUNDLER_CONTRACT_ID_MAINNET ?? '')
  : (process.env.BUNDLER_CONTRACT_ID_TESTNET ?? '');

// Max calls per batch tx — stay well under Soroban's ~70KB tx size limit.
const CHUNK_SIZE = 50;

export interface BundleCall {
  contractId: string;
  function: string;
  argsXdr: string[]; // base64 ScVal XDR for each argument
}

function getSorobanServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
}

function getDeployerKeypair(): Keypair {
  const secret = process.env.STELLAR_DEPLOYER_SECRET;
  if (!secret) throw new Error('STELLAR_DEPLOYER_SECRET env var not set');
  return Keypair.fromSecret(secret);
}

// Build a ScVal map matching the bundler's Call struct.
// Keys must be in lexicographic order (args < contract < function) — Soroban requirement.
function buildCallScVal(row: BundleRow): xdr.ScVal {
  const args = xdr.ScVal.scvVec(
    (JSON.parse(row.args_xdr) as string[]).map(a => xdr.ScVal.fromXDR(a, 'base64')),
  );
  const contract = new Address(row.contract_id).toScVal();
  const fn_ = xdr.ScVal.scvSymbol(row.function);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('args'),     val: args }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('contract'), val: contract }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('function'), val: fn_ }),
  ]);
}

async function waitForTransaction(
  server: rpc.Server,
  hash: string,
): Promise<void> {
  let result = await server.getTransaction(hash);
  let attempts = 0;
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    result = await server.getTransaction(hash);
    attempts++;
  }
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Batch transaction failed: status=${result.status} hash=${hash}`);
  }
}

async function submitBatch(entries: BundleRow[]): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const bundler = new Contract(BUNDLER_CONTRACT_ID);

  const callsScVal = xdr.ScVal.scvVec(entries.map(buildCallScVal));
  const userAuthEntries = entries.map(e =>
    xdr.SorobanAuthorizationEntry.fromXDR(e.auth_entry_xdr, 'base64'),
  );

  const source = await server.getAccount(deployer.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(bundler.call('execute_batch', callsScVal))
    .setTimeout(30)
    .build();

  // Attach signed auth entries BEFORE simulation so Soroban runs in enforcement
  // mode rather than recording mode. Required for non-root auth (bundler →
  // token.transfer) and for secp256r1 auth (smart wallet passkey signatures).
  const preTx = tx.toEnvelope();
  preTx.v1().tx().operations()[0].body().invokeHostFunctionOp().auth(userAuthEntries);
  const txWithAuth = new Transaction(preTx.toXDR('base64'), NETWORK_PASSPHRASE);

  const simResult = await server.simulateTransaction(txWithAuth);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation failed: ${(simResult as rpc.Api.SimulateTransactionErrorResponse).error}`,
    );
  }

  // assembleTransaction sets fees + soroban resource data from the simulation.
  // Pass the original tx (not txWithAuth) so assembleTransaction has a clean base.
  const assembled = rpc.assembleTransaction(tx, simResult).build();

  // Re-attach after assembleTransaction (it may overwrite the auth field).
  const envelope = assembled.toEnvelope();
  envelope.v1().tx().operations()[0].body().invokeHostFunctionOp().auth(userAuthEntries);

  const finalTx = new Transaction(envelope.toXDR('base64'), NETWORK_PASSPHRASE);
  finalTx.sign(deployer);

  const sendResult = await server.sendTransaction(finalTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}

// Drain the entire queue in CHUNK_SIZE batches, one after another.
export async function flush(): Promise<void> {
  while (true) {
    const batchId = randomUUID();
    const entries = await claimPendingBundle(batchId, CHUNK_SIZE);
    if (entries.length === 0) break;

    try {
      const hash = await submitBatch(entries);
      await updateBundleEntries(batchId, 'done', hash);
    } catch (err) {
      await updateBundleEntries(batchId, 'failed', undefined, (err as Error).message);
    }
  }
}

export async function enqueue(authEntryXdr: string, call: BundleCall): Promise<string> {
  return insertBundleEntry({
    auth_entry_xdr: authEntryXdr,
    contract_id: call.contractId,
    function: call.function,
    args_xdr: JSON.stringify(call.argsXdr),
  });
}

export async function getStatus(id: string) {
  return getBundleEntry(id);
}
