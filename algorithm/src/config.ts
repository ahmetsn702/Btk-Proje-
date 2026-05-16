import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

function getStr(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export const REDIS_URL = getStr('REDIS_URL', 'redis://localhost:6379');
export const ALGO_PORT = Number(getStr('ALGO_PORT', '4000'));
