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
export const RELAYER_URL = getStr('RELAYER_URL', 'http://localhost:3000');
export const PORT = getInt('PORT', 3002);

export const CONTRACTS = {
  EXCHANGE: getStr('EXCHANGE_ADDRESS'),
  CP_TOKEN: getStr('CP_TOKEN_ADDRESS'),
  XP_TOKEN: getStr('XP_TOKEN_ADDRESS'),
  TASK_REWARD_MANAGER: getStr('TASK_REWARD_MANAGER_ADDRESS'),
};
