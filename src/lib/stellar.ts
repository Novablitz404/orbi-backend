import {
  rpc,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  Operation,
  Horizon,
  nativeToScVal,
  scValToNative,
  xdr,
  Transaction,
} from '@stellar/stellar-sdk';
const IS_MAINNET = process.env.NETWORK === 'mainnet';

const SOROBAN_RPC_URL = IS_MAINNET
  ? 'https://mainnet.sorobanrpc.com'
  : 'https://soroban-testnet.stellar.org';

const HORIZON_URL = IS_MAINNET
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

const NETWORK_PASSPHRASE = IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET;

// Smart wallet factory contract
const FACTORY_CONTRACT_ID = IS_MAINNET
  ? (process.env.FACTORY_CONTRACT_ID_MAINNET ?? '')
  : (process.env.FACTORY_CONTRACT_ID_TESTNET ?? 'CA2CINEAPVJC4VXRUWHNH6ZRUUUGBMCWF3DZGC77OO5EMK7CKVDT2UWC');

// Smart wallet WASM hash (installed on-chain)
const SMART_WALLET_WASM_HASH = IS_MAINNET
  ? (process.env.SMART_WALLET_WASM_HASH_MAINNET ?? '')
  : (process.env.SMART_WALLET_WASM_HASH_TESTNET ?? 'cde3f02651571d538e2f82b818f4cf55c71d59ce39f902f9cd8a4313c3e8aff2');

// Relay policy contract — registers as Signer::Policy on each new wallet.
// Stores the relay Ed25519 key; rotation here propagates to all wallets with zero wallet touches.
const RELAY_POLICY_CONTRACT_ID = IS_MAINNET
  ? (process.env.RELAY_POLICY_CONTRACT_ID_MAINNET ?? '')
  : (process.env.RELAY_POLICY_CONTRACT_ID_TESTNET ?? 'CDBB3WPRFLJP65JENPZ4OIDYECGZIPTAAMWM4CXQPWY45W2QR2K54IIE');


// 1.5 XLM minimum reserve + 0.2 XLM fee buffer = 1.7 XLM total
const ACTIVATION_AMOUNT = '1.7';

function getSorobanServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
}

function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL, { allowHttp: false });
}

function getDeployerKeypair(): Keypair {
  const secret = process.env.STELLAR_DEPLOYER_SECRET;
  if (!secret) throw new Error('STELLAR_DEPLOYER_SECRET env var not set');
  return Keypair.fromSecret(secret);
}

/**
 * Create a Stellar account and fund it with enough XLM to cover
 * the base reserve (1 XLM) + USDC trustline reserve (0.5 XLM) + fee buffer (0.5 XLM).
 * The deployer pays. Returns the transaction hash.
 */
export async function createStellarAccount(stellarAddress: string): Promise<string> {
  const horizon = getHorizonServer();
  const deployer = getDeployerKeypair();

  const deployerAccount = await horizon.loadAccount(deployer.publicKey());

  const tx = new TransactionBuilder(deployerAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createAccount({
        destination: stellarAddress,
        startingBalance: ACTIVATION_AMOUNT,
      }),
    )
    .setTimeout(30)
    .build();

  tx.sign(deployer);

  const result = await horizon.submitTransaction(tx);
  return result.hash;
}


// ── Smart wallet helpers ──────────────────────────────────────────────────────

async function waitForTransaction(server: rpc.Server, hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  let result = await server.getTransaction(hash);
  let attempts = 0;
  while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    result = await server.getTransaction(hash);
    attempts++;
  }
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    // Surface the actual reason: parse resultXdr for the protocol-level
    // error code and decode diagnostic events to expose any contract panic.
    const failed = result as rpc.Api.GetFailedTransactionResponse;
    let resultCode = 'unknown';
    let innerCodes: string[] = [];
    try {
      const rxdr = (failed as any).resultXdr ?? (failed as any).envelopeXdr;
      if (rxdr) {
        const txResult = xdr.TransactionResult.fromXDR(rxdr.toXDR ? rxdr.toXDR() : rxdr, 'raw');
        resultCode = txResult.result().switch().name;
        const innerResult = (txResult.result() as any).innerResultPair?.();
        if (innerResult) {
          innerCodes.push(`inner=${innerResult.result().result().switch().name}`);
          const ops = innerResult.result().result().value?.();
          if (Array.isArray(ops)) {
            for (const op of ops) {
              innerCodes.push(`op=${op.switch().name}`);
              const tr = op.tr?.();
              if (tr) {
                const variant = tr.value?.();
                if (variant?.switch) innerCodes.push(`opInner=${variant.switch().name}`);
              }
            }
          }
        }
      }
    } catch (e) {
      innerCodes.push(`parseErr=${(e as Error).message}`);
    }
    const diagnostic = (failed.diagnosticEventsXdr ?? []).map((e: any) => {
      try { return scValToNative(xdr.DiagnosticEvent.fromXDR(e, 'base64').event().body().v0().data()); }
      catch { return null; }
    }).filter(Boolean);
    throw new Error(
      `Transaction failed: status=${result.status} hash=${hash} ` +
      `result=${resultCode} ${innerCodes.join(' ')} ` +
      `diagnostic=${JSON.stringify(diagnostic)}`,
    );
  }
  return result as rpc.Api.GetSuccessfulTransactionResponse;
}

/**
 * Deploy a new Orbi smart wallet via the factory contract.
 * passkey_id and public_key come from the app's WebAuthn registration response.
 * Returns the new wallet's contract address (C address).
 */
export async function deploySmartWallet(
  passkeyId: string,
  publicKey: string,
): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const factory = new Contract(FACTORY_CONTRACT_ID);

  const source = await server.getAccount(deployer.publicKey());

  const passkeyIdBytes = xdr.ScVal.scvBytes(Buffer.from(passkeyId, 'hex'));
  const publicKeyBytes = xdr.ScVal.scvBytes(Buffer.from(publicKey, 'hex'));
  const wasmHashBytes = xdr.ScVal.scvBytes(Buffer.from(SMART_WALLET_WASM_HASH, 'hex'));
  // Pass relay policy contract as Option<Address> — Some(address) encodes as scvAddress, None as scvVoid
  const relayPolicyScVal = RELAY_POLICY_CONTRACT_ID
    ? new Address(RELAY_POLICY_CONTRACT_ID).toScVal()
    : xdr.ScVal.scvVoid();

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(factory.call('deploy_wallet', wasmHashBytes, passkeyIdBytes, publicKeyBytes, relayPolicyScVal))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as rpc.Api.SimulateTransactionErrorResponse).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  const txResult = await waitForTransaction(server, sendResult.hash);

  if (!txResult.returnValue) throw new Error('No return value from factory');
  const contractAddress = scValToNative(txResult.returnValue) as string;

  return contractAddress;
}

/**
 * Rewrite the inner tx with the deployer's freshest sequence number, then sign.
 * The Soroban authorization preimage does not include the tx sequence, so
 * re-sequencing here doesn't invalidate the passkey signature attached by the
 * client.
 */
async function freshSignInner(
  innerXdr: string,
  deployer: Keypair,
  server: rpc.Server,
): Promise<Transaction> {
  const env = xdr.TransactionEnvelope.fromXDR(innerXdr, 'base64');
  if (env.switch().value !== xdr.EnvelopeType.envelopeTypeTx().value) {
    throw new Error('Inner envelope is not envelopeTypeTx');
  }

  const account = await server.getAccount(deployer.publicKey());
  account.incrementSequenceNumber();
  const newSeq = account.sequenceNumber();

  const v1 = env.v1();
  const tx = v1.tx();
  // SequenceNumber is a typedef for int64 in the Stellar XDR; the runtime class
  // is exposed but its types aren't always exported. Reuse the existing field's
  // constructor so we stay type-safe without an explicit xdr cast.
  const SeqNumCtor = (tx.seqNum() as any).constructor;
  tx.seqNum(SeqNumCtor.fromString(newSeq));
  v1.signatures([]);

  const innerTx = new Transaction(env.toXDR('base64'), NETWORK_PASSPHRASE);
  innerTx.sign(deployer);
  return innerTx;
}

/**
 * Fee-bump and submit a pre-signed transaction XDR from the app.
 * The app signs the inner transaction with the passkey; the backend
 * wraps it in a fee-bump so users never need XLM.
 *
 * Concurrency: every send consumes the deployer's sequence number, so
 * simultaneous submits race. We refetch the freshest sequence on each attempt
 * and retry on txBadSeq with jittered backoff.
 */
export async function submitFeeBump(innerXdr: string): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const innerTx = await freshSignInner(innerXdr, deployer, server);

    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      deployer,
      String(Number(BASE_FEE) * 10),
      innerTx,
      NETWORK_PASSPHRASE,
    );
    feeBump.sign(deployer);

    const sendResult = await server.sendTransaction(feeBump);
    if (sendResult.status === 'ERROR') {
      const errStr = JSON.stringify(sendResult.errorResult);
      lastError = new Error(`Submit failed: ${errStr}`);
      const isSeqError = errStr.includes('txBadSeq') || errStr.includes('badSeq');
      if (!isSeqError || attempt === MAX_ATTEMPTS - 1) throw lastError;
      await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 250)));
      continue;
    }

    await waitForTransaction(server, sendResult.hash);
    return sendResult.hash;
  }

  throw lastError ?? new Error('Submit failed after retries');
}

/**
 * Submit a guardian recovery proposal on behalf of a guardian.
 * The guardian signs a message off-chain; the backend submits the
 * propose_recovery contract call.
 */
export async function proposeRecovery(
  walletContractId: string,
  guardianKey: string,       // hex Ed25519 public key
  guardianSignature: string, // hex Ed25519 signature
  newPasskeyId: string,      // hex credential ID
  newPublicKey: string,      // hex 65-byte public key
): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const wallet = new Contract(walletContractId);

  const source = await server.getAccount(deployer.publicKey());

  // Build Signer::Secp256r1 ScVal manually matching the contract enum
  const newSigner = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Secp256r1'),
    xdr.ScVal.scvBytes(Buffer.from(newPasskeyId, 'hex')),
    xdr.ScVal.scvBytes(Buffer.from(newPublicKey, 'hex')),
    xdr.ScVal.scvVec([xdr.ScVal.scvVoid()]),  // SignerExpiration(None)
    xdr.ScVal.scvVec([xdr.ScVal.scvVoid()]),  // SignerLimits(None)
    xdr.ScVal.scvSymbol('Persistent'),         // SignerStorage
  ]);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(wallet.call(
      'propose_recovery',
      xdr.ScVal.scvBytes(Buffer.from(guardianKey, 'hex')),
      newSigner,
      xdr.ScVal.scvBytes(Buffer.from(guardianSignature, 'hex')),
    ))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as rpc.Api.SimulateTransactionErrorResponse).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}

/**
 * Operator compliance freeze — blocks all outgoing operations on the wallet.
 * reason: case reference string stored immutably on-chain for audit trail.
 * Cannot be lifted by the wallet owner; only operatorUnfreezeWallet clears it.
 */
export async function operatorFreezeWallet(
  walletContractId: string,
  reason: string,
): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const wallet = new Contract(walletContractId);
  const source = await server.getAccount(deployer.publicKey());

  const reasonBytes = xdr.ScVal.scvBytes(Buffer.from(reason, 'utf8'));

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(wallet.call('operator_freeze', reasonBytes))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}
/**
 * Lift a compliance freeze placed by the operator.
 */
export async function operatorUnfreezeWallet(walletContractId: string): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const wallet = new Contract(walletContractId);
  const source = await server.getAccount(deployer.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(wallet.call('operator_unfreeze'))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}
/**
 * Update the factory-level tier limits. Affects all future wallet deployments.
 * Existing wallets keep their current limit until their tier is explicitly reset.
 */
export async function setFactoryTierLimits(
  unverifiedStroops: number,
  verifiedStroops: number,
): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const factory = new Contract(FACTORY_CONTRACT_ID);
  const source = await server.getAccount(deployer.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(factory.call(
      'set_tier_limits',
      nativeToScVal(BigInt(unverifiedStroops), { type: 'i128' }),
      nativeToScVal(BigInt(verifiedStroops), { type: 'i128' }),
    ))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}
/**
 * Read the current tier limits from the factory.
 * Returns unverified and verified daily limits in stroops.
 */
export async function getTierLimits(): Promise<{ unverified: number; verified: number }> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const factory = new Contract(FACTORY_CONTRACT_ID);
  const source = await server.getAccount(deployer.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(factory.call('get_tier_limits'))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  const result = scValToNative(
    (simResult as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
  ) as [bigint, bigint];
  return { unverified: Number(result[0]), verified: Number(result[1]) };
}

/**
 * Set the daily spending limit on a specific wallet contract.
 * Called when upgrading a user's tier (e.g. after KYC verification).
 * limitStroops: USDC amount in stroops (7 decimal places). 0 = remove limit.
 */
export async function setWalletDailyLimit(
  walletContractId: string,
  limitStroops: number,
): Promise<string> {
  const server = getSorobanServer();
  const deployer = getDeployerKeypair();
  const wallet = new Contract(walletContractId);
  const source = await server.getAccount(deployer.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(wallet.call('set_daily_limit', nativeToScVal(BigInt(limitStroops), { type: 'i128' })))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${(simResult as any).error}`);
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(deployer);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  await waitForTransaction(server, sendResult.hash);
  return sendResult.hash;
}


