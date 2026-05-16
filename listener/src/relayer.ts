import { ethers } from 'ethers';
import { RPC_URL, RELAYER } from './config.js';
import { checkRateLimit, setRelayerNonce, getRelayerNonce } from './redis.js';
import type { RelayerRequest, RelayerResponse } from './types.js';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER.PRIVATE_KEY, provider);

const DOMAIN = {
  name: 'BTK-Exchange-Relayer',
  version: '1',
  chainId: 31337, // overridden per request if needed
};

const TYPES = {
  RelayRequest: [
    { name: 'to', type: 'address' },
    { name: 'data', type: 'bytes' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export async function relay(req: RelayerRequest): Promise<RelayerResponse> {
  if (!RELAYER.PRIVATE_KEY || RELAYER.PRIVATE_KEY.length < 20) {
    return { status: 'rejected', error: 'Relayer not configured' };
  }

  // Rate limit
  const allowed = await checkRateLimit(req.signer, RELAYER.RATE_LIMIT_RPM);
  if (!allowed) {
    return { status: 'rejected', error: 'Rate limit exceeded' };
  }

  // Deadline check
  const now = Math.floor(Date.now() / 1000);
  if (req.message.deadline < now) {
    return { status: 'rejected', error: 'Deadline expired' };
  }

  // Signature verification
  const domain = { ...DOMAIN, chainId: (await provider.getNetwork()).chainId.toString() };
  const recovered = ethers.verifyTypedData(domain, TYPES, req.message, req.signature);
  if (recovered.toLowerCase() !== req.signer.toLowerCase()) {
    return { status: 'rejected', error: 'Invalid signature' };
  }

  // Nonce check (prevent replay)
  const lastNonce = await getRelayerNonce(req.signer);
  if (req.message.nonce <= lastNonce) {
    return { status: 'rejected', error: 'Nonce already used' };
  }

  try {
    const tx = await wallet.sendTransaction({
      to: req.message.to,
      data: req.message.data,
      value: BigInt(req.message.value),
    });

    await setRelayerNonce(req.signer, req.message.nonce);
    return { txHash: tx.hash, status: 'submitted' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'failed', error: msg };
  }
}

export function getDomain() {
  return { ...DOMAIN };
}

export function getTypes() {
  return { ...TYPES };
}
