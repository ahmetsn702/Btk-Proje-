import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ethers } from 'ethers';
import { PORT, RPC_URL, RELAYER_URL, CONTRACTS } from './config.js';
import { getEventsByUser, getTransactionsByUser } from './redis.js';

const app = express();
app.use(express.json());

// ── Swagger Setup ─────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BTK Bridge API',
      version: '1.0.0',
      description: 'Web3↔Web2 API micro-service for Developer 1',
    },
  },
  apis: ['src/index.ts'],
};
const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// ── Provider & Contracts ─────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);

const EXCHANGE_ABI = [
  'function getQuote(uint256 categoryIn, uint256 categoryOut, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee)',
  'function priceMultiplier(uint256) external view returns (uint256)',
  'function xpPool() external view returns (uint256)',
  'function cpPool(uint256) external view returns (uint256)',
];

const ERC20_ABI = ['function balanceOf(address) external view returns (uint256)'];
const ERC1155_ABI = ['function balanceOf(address,uint256) external view returns (uint256)'];

let exchange: ethers.Contract | null = null;
let cpToken: ethers.Contract | null = null;
let xpToken: ethers.Contract | null = null;

function initContracts() {
  if (CONTRACTS.EXCHANGE)
    exchange = new ethers.Contract(CONTRACTS.EXCHANGE, EXCHANGE_ABI, provider);
  if (CONTRACTS.CP_TOKEN) cpToken = new ethers.Contract(CONTRACTS.CP_TOKEN, ERC1155_ABI, provider);
  if (CONTRACTS.XP_TOKEN) xpToken = new ethers.Contract(CONTRACTS.XP_TOKEN, ERC20_ABI, provider);
}
initContracts();

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bridge', ts: Date.now() });
});

// ── Exchange: Quote ─────────────────────────────────────────────
/**
 * @swagger
 * /exchange/quote:
 *   get:
 *     summary: Get swap quote (slippage inclusive)
 *     parameters:
 *       - in: query
 *         name: in
 *         schema: { type: string }
 *       - in: query
 *         name: out
 *         schema: { type: string }
 *       - in: query
 *         name: amount
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quote result
 */
app.get('/exchange/quote', async (req, res) => {
  if (!exchange) return res.status(503).json({ error: 'Exchange not configured' });
  const catIn = BigInt(req.query.in as string);
  const catOut = BigInt(req.query.out as string);
  const amount = BigInt(req.query.amount as string);
  const [amountOut, fee] = await exchange.getQuote(catIn, catOut, amount);
  res.json({ amountIn: amount.toString(), amountOut: amountOut.toString(), fee: fee.toString() });
});

// ── Exchange: Market Status ──────────────────────────────────────
app.get('/exchange/market-status', async (_req, res) => {
  if (!exchange || !cpToken) return res.status(503).json({ error: 'Contracts not configured' });
  const xp = await exchange.xpPool();
  const cats = [1n, 2n, 3n];
  const prices = [];
  for (const cat of cats) {
    const mult = await exchange.priceMultiplier(cat);
    const pool = await exchange.cpPool(cat);
    prices.push({ categoryId: cat.toString(), multiplier: mult.toString(), pool: pool.toString() });
  }
  res.json({ xpPool: xp.toString(), categories: prices });
});

// ── Exchange: History ───────────────────────────────────────────
app.get('/exchange/history/:userId', async (req, res) => {
  const events = await getEventsByUser(req.params.userId);
  res.json({ user: req.params.userId, events });
});

// ── Users: Balances ──────────────────────────────────────────────
app.get('/users/:userId/balances', async (req, res) => {
  if (!cpToken || !xpToken) return res.status(503).json({ error: 'Tokens not configured' });
  const user = req.params.userId;
  const xp = await xpToken.balanceOf(user);
  const balances: Record<string, string> = {};
  for (const cat of [1n, 2n, 3n]) {
    const bal = await cpToken.balanceOf(user, cat);
    balances[cat.toString()] = bal.toString();
  }
  res.json({ user, xp: xp.toString(), cp: balances });
});

// ── Users: Transactions ─────────────────────────────────────────
app.get('/users/:userId/transactions', async (req, res) => {
  const txs = await getTransactionsByUser(req.params.userId);
  res.json({ user: req.params.userId, transactions: txs });
});

// ── Tasks: Verify ────────────────────────────────────────────────
app.post('/tasks/:id/verify', async (req, res) => {
  const taskId = req.params.id;
  const { signature, message, signer } = req.body;
  const resp = await fetch(`${RELAYER_URL}/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signature, message, signer }),
  });
  const data = await resp.json();
  res.status(resp.status).json({ taskId, ...data });
});

// ── Checkout: Apply Discount ────────────────────────────────────
app.post('/checkout/apply-discount', async (req, res) => {
  const { userId, productPrice, maxDiscountPercent = 30 } = req.body;
  if (!cpToken || !xpToken) return res.status(503).json({ error: 'Tokens not configured' });

  // Read user's CP balances
  const balances: Record<string, bigint> = {};
  for (const cat of [1n, 2n, 3n]) {
    balances[cat.toString()] = await cpToken.balanceOf(userId, cat);
  }

  // Compute max applicable discount without exceeding margin cap
  const maxDiscount = (BigInt(productPrice) * BigInt(maxDiscountPercent)) / 100n;
  const totalCp = Object.values(balances).reduce((a, b) => a + b, 0n);

  // Simple linear discount: 1 CP = 1 unit of discount (up to max)
  const discount = totalCp < maxDiscount ? totalCp : maxDiscount;
  const finalPrice = BigInt(productPrice) - discount;

  res.json({
    userId,
    productPrice: productPrice.toString(),
    maxDiscountPercent,
    discount: discount.toString(),
    finalPrice: finalPrice.toString(),
    cpBalances: Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, v.toString()])),
  });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Bridge] API listening on http://localhost:${PORT}`);
  console.log(`[Bridge] Docs at http://localhost:${PORT}/docs`);
});
