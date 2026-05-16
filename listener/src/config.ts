import dotenv from 'dotenv';

dotenv.config();

function getInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

function getStr(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export const NETWORK = getStr('NETWORK', 'local');

export const RPC_URL =
  NETWORK === 'amoy' ? getStr('AMOY_RPC_URL') : getStr('LOCAL_RPC_URL', 'http://localhost:8545');

export const REDIS_URL = getStr('REDIS_URL', 'redis://localhost:6379');

// Dynamic confirmations: local=1, amoy=6
export const CONFIRMATIONS = getInt('CONFIRMATIONS', NETWORK === 'local' ? 1 : 6);

export const RELAYER = {
  PRIVATE_KEY: getStr('RELAYER_PRIVATE_KEY'),
  RATE_LIMIT_RPM: getInt('RELAYER_RATE_LIMIT_RPM', 10),
};

export const CONTRACTS = {
  EXCHANGE: getStr('EXCHANGE_ADDRESS'),
  CP_TOKEN: getStr('CP_TOKEN_ADDRESS'),
  XP_TOKEN: getStr('XP_TOKEN_ADDRESS'),
  TASK_REWARD_MANAGER: getStr('TASK_REWARD_MANAGER_ADDRESS'),
};

export const SCANNER = {
  POLL_INTERVAL_MS: getInt('SCANNER_POLL_INTERVAL_MS', 2000),
  START_BLOCK: getInt('SCANNER_START_BLOCK', 0),
  MAX_RETRIES: getInt('SCANNER_MAX_RETRIES', 5),
};
