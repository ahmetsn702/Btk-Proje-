import { ethers } from 'ethers';
import { RPC_URL, CONFIRMATIONS, SCANNER, CONTRACTS } from './config.js';
import {
  getLastProcessedBlock,
  setLastProcessedBlock,
  storeEvent,
  confirmEvent,
  getPendingEventsUpToBlock,
} from './redis.js';
import type { EventLog } from './types.js';

// Minimal event ABIs for scanning
const SWAP_EVENT = ethers.id('Swap(address,uint256,uint256,uint256,uint256,uint256)');
const TASK_COMPLETED_EVENT = ethers.id('TaskCompleted(address,uint256,uint256,uint256,uint256)');
const TRANSFER_SINGLE_EVENT = ethers.id('TransferSingle(address,address,address,uint256,uint256)');
const TRANSFER_EVENT = ethers.id('Transfer(address,address,uint256)');

const provider = new ethers.WebSocketProvider(RPC_URL);

const CONTRACT_MAP: Record<string, string> = {};
if (CONTRACTS.EXCHANGE) CONTRACT_MAP[CONTRACTS.EXCHANGE.toLowerCase()] = 'Exchange';
if (CONTRACTS.CP_TOKEN) CONTRACT_MAP[CONTRACTS.CP_TOKEN.toLowerCase()] = 'CP';
if (CONTRACTS.XP_TOKEN) CONTRACT_MAP[CONTRACTS.XP_TOKEN.toLowerCase()] = 'XP';
if (CONTRACTS.TASK_REWARD_MANAGER)
  CONTRACT_MAP[CONTRACTS.TASK_REWARD_MANAGER.toLowerCase()] = 'TaskRewardManager';

const EVENT_MAP: Record<string, string> = {
  [SWAP_EVENT]: 'Swap',
  [TASK_COMPLETED_EVENT]: 'TaskCompleted',
  [TRANSFER_SINGLE_EVENT]: 'TransferSingle',
  [TRANSFER_EVENT]: 'Transfer',
};

let running = false;

export async function startScanner(onEvent?: (event: EventLog) => void): Promise<void> {
  if (running) return;
  running = true;

  let lastBlock = await getLastProcessedBlock();
  if (lastBlock === 0) {
    lastBlock = SCANNER.START_BLOCK;
  }

  console.log(`[Scanner] Starting from block ${lastBlock}, confirmations=${CONFIRMATIONS}`);

  while (running) {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastBlock) {
        await sleep(SCANNER.POLL_INTERVAL_MS);
        continue;
      }

      const toBlock = Math.min(currentBlock, lastBlock + 100); // batch max 100 blocks
      await scanRange(lastBlock + 1, toBlock, onEvent);

      // Confirm pending events that now have enough confirmations
      const confirmedUpTo = toBlock - CONFIRMATIONS;
      if (confirmedUpTo >= 0) {
        const pendingKeys = await getPendingEventsUpToBlock(confirmedUpTo);
        for (const key of pendingKeys) {
          const parts = key.split(':');
          const txHash = parts[1];
          const logIndex = parseInt(parts[2], 10);
          await confirmEvent(txHash, logIndex, CONFIRMATIONS);
          if (onEvent) {
            const raw = await (await import('./redis.js')).redis.get(key);
            if (raw) onEvent(JSON.parse(raw));
          }
        }
      }

      lastBlock = toBlock;
      await setLastProcessedBlock(lastBlock);
    } catch (err) {
      console.error('[Scanner] Error:', err);
      await sleep(SCANNER.POLL_INTERVAL_MS * 2);
    }
  }
}

export function stopScanner(): void {
  running = false;
}

async function scanRange(
  fromBlock: number,
  toBlock: number,
  onEvent?: (event: EventLog) => void,
): Promise<void> {
  const addresses = [...Object.keys(CONTRACT_MAP)];
  if (addresses.length === 0) return;

  const logs = await provider.getLogs({
    fromBlock,
    toBlock,
    address: addresses,
    topics: [[SWAP_EVENT, TASK_COMPLETED_EVENT, TRANSFER_SINGLE_EVENT, TRANSFER_EVENT]],
  });

  for (const log of logs) {
    const contract = CONTRACT_MAP[log.address.toLowerCase()];
    if (!contract) continue;

    const eventSig = log.topics[0];
    const eventName = EVENT_MAP[eventSig];
    if (!eventName) continue;

    const event: EventLog = {
      txHash: log.transactionHash,
      logIndex: log.index,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      contract,
      event: eventName,
      args: decodeArgs(eventSig, log.topics, log.data),
      status: 'pending',
      confirmations: 0,
    };

    await storeEvent(event);
    if (onEvent) onEvent(event);
  }

  console.log(`[Scanner] Scanned blocks ${fromBlock}-${toBlock}, ${logs.length} logs`);
}

function decodeArgs(
  eventSig: string,
  topics: readonly string[],
  data: string,
): Record<string, unknown> {
  try {
    if (eventSig === SWAP_EVENT) {
      const abi = new ethers.AbiCoder();
      const decoded = abi.decode(['uint256', 'uint256', 'uint256', 'uint256', 'uint256'], data);
      return {
        user: ethers.getAddress('0x' + topics[1].slice(26)),
        categoryIn: decoded[0].toString(),
        categoryOut: decoded[1].toString(),
        amountIn: decoded[2].toString(),
        amountOut: decoded[3].toString(),
        fee: decoded[4].toString(),
      };
    }
    if (eventSig === TASK_COMPLETED_EVENT) {
      const abi = new ethers.AbiCoder();
      const decoded = abi.decode(['uint256', 'uint256', 'uint256', 'uint256'], data);
      return {
        user: ethers.getAddress('0x' + topics[1].slice(26)),
        taskId: decoded[0].toString(),
        categoryId: decoded[1].toString(),
        amount: decoded[2].toString(),
        timestamp: decoded[3].toString(),
      };
    }
    if (eventSig === TRANSFER_SINGLE_EVENT) {
      const abi = new ethers.AbiCoder();
      const decoded = abi.decode(['uint256', 'uint256'], data);
      return {
        operator: ethers.getAddress('0x' + topics[1].slice(26)),
        from: ethers.getAddress('0x' + topics[2].slice(26)),
        to: ethers.getAddress('0x' + topics[3].slice(26)),
        id: decoded[0].toString(),
        value: decoded[1].toString(),
      };
    }
    if (eventSig === TRANSFER_EVENT) {
      const abi = new ethers.AbiCoder();
      const decoded = abi.decode(['uint256'], data);
      return {
        from: ethers.getAddress('0x' + topics[1].slice(26)),
        to: ethers.getAddress('0x' + topics[2].slice(26)),
        value: decoded[0].toString(),
      };
    }
  } catch {
    // ignore decode errors
  }
  return {};
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
