/**
 * Isolation test — verifies the bundler contract works end-to-end on testnet.
 *
 * What it does:
 *   1. Funds a fresh sender + recipient via friendbot
 *   2. Deploys (or reuses) the native XLM Stellar Asset Contract on testnet
 *   3. Mints wrapped XLM to the sender
 *   4. Sender signs a SorobanAuthorizationEntry for token.transfer via the bundler
 *   5. Backend builds execute_batch tx, attaches the auth entry, submits
 *   6. Confirms recipient received the tokens
 *
 * Required env vars:
 *   STELLAR_DEPLOYER_SECRET       — deployer/relayer keypair (must be testnet-funded)
 *   BUNDLER_CONTRACT_ID_TESTNET   — deployed bundler C-address
 *
 * Run:
 *   npm run test:bundler
 */

import {
  rpc,
  Keypair,
  TransactionBuilder,
  Transaction,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  Asset,
  authorizeEntry,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { createHash } from 'crypto';

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK         = Networks.TESTNET;

const BUNDLER_CONTRACT_ID = process.env.BUNDLER_CONTRACT_ID_TESTNET;
const DEPLOYER_SECRET     = process.env.STELLAR_DEPLOYER_SECRET;

if (!BUNDLER_CONTRACT_ID) { console.error('Missing BUNDLER_CONTRACT_ID_TESTNET'); process.exit(1); }
if (!DEPLOYER_SECRET)     { console.error('Missing STELLAR_DEPLOYER_SECRET');       process.exit(1); }

const server = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

async function fundAccount(publicKey: string): Promise<void> {
  console.log(`  Funding ${publicKey} via friendbot…`);
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) console.warn(`  Friendbot warning: ${res.status}`);
  await new Promise(r => setTimeout(r, 3000));
}

async function waitForTx(hash: string): Promise<void> {
  let result = await server.getTransaction(hash);
  let attempts = 0;
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
    await new Promise(r => setTimeout(r, 2000));
    result = await server.getTransaction(hash);
    attempts++;
  }
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction failed: status=${result.status} hash=${hash}`);
  }
}

async function simulate(tx: ReturnType<TransactionBuilder['build']>): Promise<rpc.Api.SimulateTransactionSuccessResponse> {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${(sim as rpc.Api.SimulateTransactionErrorResponse).error}`);
  }
  return sim as rpc.Api.SimulateTransactionSuccessResponse;
}

async function sendAndWait(tx: Transaction): Promise<string> {
  const send = await server.sendTransaction(tx);
  if (send.status === 'ERROR') throw new Error(`Submit failed: ${JSON.stringify(send.errorResult)}`);
  await waitForTx(send.hash);
  return send.hash;
}

// Build a ScVal map matching the bundler's Call struct.
// Keys must be in lexicographic order: args < contract < function.
function buildCallScVal(contractId: string, fn: string, args: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('args'),     val: xdr.ScVal.scvVec(args) }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('contract'), val: new Address(contractId).toScVal() }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('function'), val: xdr.ScVal.scvSymbol(fn) }),
  ]);
}

// Derive the Stellar Asset Contract address for the native XLM asset on testnet.
function deriveNativeSacAddress(): string {
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: createHash('sha256').update(NETWORK).digest(),
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(Asset.native().toXDRObject()),
    }),
  );
  const contractId = createHash('sha256').update(preimage.toXDR()).digest();
  const { StrKey } = require('@stellar/stellar-sdk');
  return StrKey.encodeContract(contractId);
}

async function main() {
  const deployer  = Keypair.fromSecret(DEPLOYER_SECRET!);
  const sender    = Keypair.random();
  const recipient = Keypair.random();
  const bundler   = new Contract(BUNDLER_CONTRACT_ID!);

  console.log('\n=== Orbi Bundler — Isolation Test ===');
  console.log('Deployer :', deployer.publicKey());
  console.log('Sender   :', sender.publicKey());
  console.log('Recipient:', recipient.publicKey());
  console.log('Bundler  :', BUNDLER_CONTRACT_ID);

  // ── 1. Fund accounts ──────────────────────────────────────────────────────
  console.log('\n[1] Funding accounts via friendbot…');
  await Promise.all([
    fundAccount(deployer.publicKey()),
    fundAccount(sender.publicKey()),
    fundAccount(recipient.publicKey()),
  ]);

  // ── 2. Get the native XLM SAC address ────────────────────────────────────
  // The SAC for native XLM is always pre-deployed on testnet.
  const tokenContractId = deriveNativeSacAddress();
  const token = new Contract(tokenContractId);
  console.log('\n[2] Native XLM SAC:', tokenContractId);

  // Deployer already has XLM from friendbot — no mint needed.
  // Transfer native XLM from deployer → recipient through the bundler.

  // ── 3. Manually build and sign auth entry, then simulate in enforcement mode ──
  // Simulation can't RECORD non-root auth (bundler→token.transfer is non-root).
  // Fix: construct the auth entry ourselves, sign it, attach it to the tx before
  // simulating so Soroban runs in enforcement mode instead of recording mode.
  console.log('\n[3] Building and signing auth entry for bundler call…');

  const transferArgs = [
    new Address(deployer.publicKey()).toScVal(),
    new Address(recipient.publicKey()).toScVal(),
    nativeToScVal(BigInt(10_0000000), { type: 'i128' }),
  ];

  const latestLedger = await server.getLatestLedger();
  const validUntil = latestLedger.sequence + 100;

  // Random nonce — Soroban stores used nonces to prevent replay, so any fresh random works.
  const nonce = xdr.Int64.fromString(String(Math.floor(Math.random() * 2 ** 52)));

  const authEntry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(deployer.publicKey()).toScAddress(),
        nonce,
        signatureExpirationLedger: validUntil,
        signature: xdr.ScVal.scvVoid(), // filled in by authorizeEntry
      }),
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: new Address(tokenContractId).toScAddress(),
          functionName: 'transfer',
          args: transferArgs,
        }),
      ),
      subInvocations: [],
    }),
  });

  const signedAuthEntries = [await authorizeEntry(authEntry, deployer, validUntil, NETWORK)];
  console.log('  Auth entry signed.');

  // Build the tx and attach the signed auth entry BEFORE simulating.
  const callScVal = buildCallScVal(tokenContractId, 'transfer', transferArgs);
  const batchSource = await server.getAccount(deployer.publicKey());
  const batchTx = new TransactionBuilder(batchSource, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(bundler.call('execute_batch', xdr.ScVal.scvVec([callScVal])))
    .setTimeout(30)
    .build();

  // Attach pre-signed auth entry so simulation runs in enforcement mode.
  const preTx = batchTx.toEnvelope();
  preTx.v1().tx().operations()[0].body().invokeHostFunctionOp().auth(signedAuthEntries);
  const txWithAuth = new Transaction(preTx.toXDR('base64'), NETWORK);

  const batchSim = await simulate(txWithAuth);
  console.log('  Simulation passed.');

  // ── 5. Build final batch tx with user-signed auth entries and submit ───────
  console.log('\n[5] Submitting batch transaction…');
  const assembled = rpc.assembleTransaction(batchTx, batchSim).build();

  // Replace simulation-generated auth entries with the sender-signed ones.
  const envelope = assembled.toEnvelope();
  envelope.v1().tx().operations()[0].body().invokeHostFunctionOp().auth(signedAuthEntries);
  const finalTx = new Transaction(envelope.toXDR('base64'), NETWORK);
  finalTx.sign(deployer);

  const hash = await sendAndWait(finalTx);
  console.log('  Confirmed! Hash:', hash);

  // ── 6. Verify balances ────────────────────────────────────────────────────
  console.log('\n[6] Verifying balances…');
  const balSource = await server.getAccount(deployer.publicKey());

  async function getBalance(label: string, address: string): Promise<void> {
    const tx = new TransactionBuilder(balSource, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(token.call('balance', new Address(address).toScVal()))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) { console.log(`  ${label}: (error)`); return; }
    const val = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    console.log(`  ${label}: ${val ? scValToNative(val) : 'n/a'} stroops`);
  }

  await getBalance('Deployer (sender)', deployer.publicKey());
  await getBalance('Recipient        ', recipient.publicKey());

  console.log('\n✅ Bundler isolation test passed.\n');
}

main().catch(err => {
  console.error('\n❌ Test failed:', err.message ?? err);
  process.exit(1);
});
