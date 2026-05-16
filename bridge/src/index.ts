import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ethers } from 'ethers';
import { PORT, RPC_URL, CONTRACTS, RELAYER_PRIVATE_KEY, RELAYER_GAS_PRICE } from './config.js';
import { getEventsByUser, getTransactionsByUser, getPrices } from './redis.js';

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
  'function swapCPforCP(uint256 categoryIn, uint256 categoryOut, uint256 amountIn, uint256 minAmountOut) external',
];

const TASK_REWARD_MANAGER_ABI = [
  'function completeTask(uint8 taskType, address user, uint256 categoryId, string metadata) external',
  'function batchMint(uint256 categoryId, address[] recipients, uint256[] amounts) external',
];

const ERC20_ABI = ['function balanceOf(address) external view returns (uint256)'];
const ERC1155_ABI = ['function balanceOf(address,uint256) external view returns (uint256)'];

let exchange: ethers.Contract | null = null;
let cpToken: ethers.Contract | null = null;
let xpToken: ethers.Contract | null = null;
let taskRewardManager: ethers.Contract | null = null;
let relayerWallet: ethers.Wallet | null = null;

function initContracts() {
  if (CONTRACTS.EXCHANGE)
    exchange = new ethers.Contract(CONTRACTS.EXCHANGE, EXCHANGE_ABI, provider);
  if (CONTRACTS.CP_TOKEN) cpToken = new ethers.Contract(CONTRACTS.CP_TOKEN, ERC1155_ABI, provider);
  if (CONTRACTS.XP_TOKEN) xpToken = new ethers.Contract(CONTRACTS.XP_TOKEN, ERC20_ABI, provider);
  if (CONTRACTS.TASK_REWARD_MANAGER)
    taskRewardManager = new ethers.Contract(
      CONTRACTS.TASK_REWARD_MANAGER,
      TASK_REWARD_MANAGER_ABI,
      provider,
    );

  if (RELAYER_PRIVATE_KEY) {
    relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log('[Bridge] Relayer wallet initialized');
  }
}
initContracts();

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bridge', ts: Date.now() });
});

// ── WebSocket/SSE: Live Rates ──────────────────────────────────────
/**
 * @swagger
 * /ws/rates:
 *   get:
 *     summary: Server-Sent Events for live CP/XP rates
 *     description: Subscribe to receive price updates every 10 seconds
 *     responses:
 *       200:
 *         description: SSE stream established
 */
app.get('/ws/rates', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendRates = async () => {
    try {
      const prices = await getPrices();
      const data = `data: ${JSON.stringify({ rates: prices, ts: Date.now() })}\n\n`;
      res.write(data);
    } catch (error) {
      console.error('[SSE] Error sending rates:', error);
    }
  };

  // Send initial rates
  await sendRates();

  // Send rates every 10 seconds
  const interval = setInterval(sendRates, 10000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log('[SSE] Client disconnected');
  });
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

// ── Exchange: All Rates ───────────────────────────────────────────
/**
 * @swagger
 * /exchange/rates:
 *   get:
 *     summary: Get all category rates with surge info
 *     responses:
 *       200:
 *         description: All rates with change24h and surge data
 */
app.get('/exchange/rates', async (_req, res) => {
  try {
    const prices = await getPrices();
    res.json(prices);
  } catch (error) {
    console.error('[Bridge] Rates error:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// ── Exchange: Single Rate ────────────────────────────────────────
/**
 * @swagger
 * /exchange/rate/{categoryId}:
 *   get:
 *     summary: Get single category rate with surge info
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category rate with change24h and surge data
 *       404:
 *         description: Category not found
 */
app.get('/exchange/rate/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const prices = await getPrices();
    const rate = prices[categoryId];

    if (!rate) {
      return res.status(404).json({ error: 'Category rate not found' });
    }

    res.json(rate);
  } catch (error) {
    console.error('[Bridge] Single rate error:', error);
    res.status(500).json({ error: 'Failed to fetch rate' });
  }
});

// ── Exchange: Chart Data ────────────────────────────────────────
/**
 * @swagger
 * /exchange/chart/{categoryId}:
 *   get:
 *     summary: Get historical price chart data for a category
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: Historical price data points
 */
app.get('/exchange/chart/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const period = (req.query.period as string) || '24h';

    // For now, return mock historical data
    // In production, this should query a time-series database
    const now = Date.now();
    const intervals: Record<string, number> = {
      '1h': 60 * 1000, // 1 minute intervals
      '24h': 5 * 60 * 1000, // 5 minute intervals
      '7d': 60 * 60 * 1000, // 1 hour intervals
      '30d': 4 * 60 * 60 * 1000, // 4 hour intervals
    };

    const interval = intervals[period] || intervals['24h'];
    const points = [];
    let timestamp =
      now -
      (period === '1h'
        ? 60 * 60 * 1000
        : period === '24h'
          ? 24 * 60 * 60 * 1000
          : period === '7d'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000);

    // Get current price
    const prices = await getPrices();
    const currentRate = prices[categoryId];

    if (!currentRate) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Generate synthetic historical data based on current rate and change24h
    while (timestamp <= now) {
      const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const timeFactor = (now - timestamp) / (24 * 60 * 60 * 1000); // Days ago
      const trendAdjustment = currentRate.change24h * timeFactor * 0.5;
      const price = currentRate.rate * (1 + randomVariation + trendAdjustment);

      points.push({
        timestamp,
        price: Math.max(0.01, price),
      });

      timestamp += interval;
    }

    res.json({
      categoryId,
      period,
      points,
    });
  } catch (error) {
    console.error('[Bridge] Chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
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

// ── Exchange: Relayer Swap (Gasless) ────────────────────────────────
/**
 * @swagger
 * /exchange/swap:
 *   post:
 *     summary: Execute gasless swap via relayer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               categoryIn:
 *                 type: string
 *               categoryOut:
 *                 type: string
 *               amountIn:
 *                 type: string
 *               minAmountOut:
 *                 type: string
 *               signature:
 *                 type: string
 *               deadline:
 *                 type: string
 *     responses:
 *       200:
 *         description: Swap executed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
app.post('/exchange/swap', async (req, res) => {
  try {
    if (!exchange || !relayerWallet) {
      return res.status(503).json({ error: 'Exchange or relayer not configured' });
    }

    const { user, categoryIn, categoryOut, amountIn, minAmountOut, signature, deadline } = req.body;

    // Validate required fields
    if (
      !user ||
      !categoryIn ||
      !categoryOut ||
      !amountIn ||
      !minAmountOut ||
      !signature ||
      !deadline
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check deadline
    if (BigInt(deadline) < BigInt(Math.floor(Date.now() / 1000))) {
      return res.status(400).json({ error: 'Transaction expired' });
    }

    // Verify EIP-712 signature
    const domain = {
      name: 'E-Trade Finance',
      version: '1',
      chainId: (await provider.getNetwork()).chainId,
      verifyingContract: CONTRACTS.EXCHANGE,
    };

    const types = {
      Swap: [
        { name: 'user', type: 'address' },
        { name: 'categoryIn', type: 'uint256' },
        { name: 'categoryOut', type: 'uint256' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'minAmountOut', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      user,
      categoryIn: BigInt(categoryIn),
      categoryOut: BigInt(categoryOut),
      amountIn: BigInt(amountIn),
      minAmountOut: BigInt(minAmountOut),
      deadline: BigInt(deadline),
    };

    const signerAddr = ethers.verifyTypedData(domain, types, value, signature);
    if (signerAddr.toLowerCase() !== user.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Execute swap using sendTransaction with encoded call
    const swapInterface = new ethers.Interface(EXCHANGE_ABI);
    const swapData = swapInterface.encodeFunctionData('swapCPforCP', [
      BigInt(categoryIn),
      BigInt(categoryOut),
      BigInt(amountIn),
      BigInt(minAmountOut),
    ]);

    const tx = await relayerWallet.sendTransaction({
      to: CONTRACTS.EXCHANGE,
      data: swapData,
      gasPrice: BigInt(RELAYER_GAS_PRICE),
    });

    console.log('[Bridge] Swap tx submitted:', tx.hash);

    // Wait for transaction
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed.toString(),
    });
  } catch (error) {
    console.error('[Bridge] Swap error:', error);
    res.status(500).json({
      error: 'Swap failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

// ── Tasks: Verify (Trigger Task Completion) ─────────────────────
/**
 * @swagger
 * /tasks/verify:
 *   post:
 *     summary: Trigger task completion and mint CP tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               taskType:
 *                 type: number
 *               categoryId:
 *                 type: string
 *               metadata:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
app.post('/tasks/verify', async (req, res) => {
  try {
    if (!taskRewardManager || !relayerWallet) {
      return res.status(503).json({ error: 'TaskRewardManager or relayer not configured' });
    }

    const { userId, taskType, categoryId, metadata } = req.body;

    // Validate required fields
    if (!userId || taskType === undefined || !categoryId || !metadata) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Task type validation (0-4)
    if (taskType < 0 || taskType > 4) {
      return res.status(400).json({ error: 'Invalid task type (must be 0-4)' });
    }

    // Execute task completion using sendTransaction with encoded call
    const trmInterface = new ethers.Interface(TASK_REWARD_MANAGER_ABI);
    const taskData = trmInterface.encodeFunctionData('completeTask', [
      taskType,
      userId,
      BigInt(categoryId),
      metadata,
    ]);

    const tx = await relayerWallet.sendTransaction({
      to: CONTRACTS.TASK_REWARD_MANAGER,
      data: taskData,
      gasPrice: BigInt(RELAYER_GAS_PRICE),
    });

    console.log('[Bridge] Task completion tx submitted:', tx.hash);

    // Wait for transaction
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed.toString(),
      userId,
      taskType,
      categoryId,
    });
  } catch (error) {
    console.error('[Bridge] Task verification error:', error);
    res.status(500).json({
      error: 'Task verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ── Checkout: Validate Discount ─────────────────────────────────
/**
 * @swagger
 * /checkout/validate-discount:
 *   post:
 *     summary: Validate CP discount against margin cap and slippage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: string
 *               cpAmount:
 *                 type: string
 *               xpDiscount:
 *                 type: string
 *               marginCapPercent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Discount validation result
 */
app.post('/checkout/validate-discount', async (req, res) => {
  try {
    const { categoryId, cpAmount, xpDiscount, marginCapPercent = '30' } = req.body;

    // Validate required fields
    if (!categoryId || !cpAmount || !xpDiscount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cpAmountBig = BigInt(cpAmount);
    const xpDiscountBig = BigInt(xpDiscount);
    const marginCapBig = BigInt(marginCapPercent);

    // Get current price for the category from Redis
    const prices = await getPrices();
    const currentPrice = prices[categoryId];

    if (!currentPrice) {
      return res.status(400).json({ error: 'Category price not found' });
    }

    // Calculate expected XP value of CP amount
    const priceScaled = BigInt(Math.floor(currentPrice * 1_000_000));
    const expectedXpValue = (cpAmountBig * priceScaled) / 1_000_000n;

    // Validate discount doesn't exceed margin cap
    const maxAllowedDiscount = (expectedXpValue * marginCapBig) / 100n;
    if (xpDiscountBig > maxAllowedDiscount) {
      return res.json({
        valid: false,
        reason: 'ERR_MARGIN_CAP_EXCEEDED',
        expectedXpValue: expectedXpValue.toString(),
        maxAllowedDiscount: maxAllowedDiscount.toString(),
        requestedDiscount: xpDiscountBig.toString(),
      });
    }

    // Validate slippage (allow 5% slippage)
    const slippagePercent = 5n;
    const minExpectedValue = (expectedXpValue * (100n - slippagePercent)) / 100n;
    const maxExpectedValue = (expectedXpValue * (100n + slippagePercent)) / 100n;

    if (xpDiscountBig < minExpectedValue || xpDiscountBig > maxExpectedValue) {
      return res.json({
        valid: false,
        reason: 'ERR_SLIPPAGE_EXCEEDED',
        expectedXpValue: expectedXpValue.toString(),
        minExpectedValue: minExpectedValue.toString(),
        maxExpectedValue: maxExpectedValue.toString(),
        requestedDiscount: xpDiscountBig.toString(),
      });
    }

    // Discount is valid
    res.json({
      valid: true,
      expectedXpValue: expectedXpValue.toString(),
      requestedDiscount: xpDiscountBig.toString(),
      currentPrice,
      marginCapPercent: marginCapPercent,
    });
  } catch (error) {
    console.error('[Bridge] Discount validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

// ── XP: Apply Discount (Alias for Developer 1) ───────────────────
/**
 * @swagger
 * /xp/apply-discount:
 *   post:
 *     summary: Apply CP discount to product price
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               productPrice:
 *                 type: string
 *               maxDiscountPercent:
 *                 type: number
 *                 default: 30
 *     responses:
 *       200:
 *         description: Discount applied successfully
 */
app.post('/xp/apply-discount', async (req, res) => {
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
