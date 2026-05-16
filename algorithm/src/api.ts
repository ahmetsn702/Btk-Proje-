import express from 'express';
import { PriceResult } from './types.js';

let latestPrices: PriceResult[] = [];

export function updatePrices(prices: PriceResult[]) {
  latestPrices = prices;
}

export function startApiServer(port: number = 4000) {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'algorithm', timestamp: new Date().toISOString() });
  });

  // Geliştirici 1'in beklediği endpoint
  // GET /exchange/rate?in=categoryId&out=categoryId
  app.get('/exchange/rate', (req, res) => {
    const { in: inCat, out: outCat } = req.query;

    if (!inCat || !outCat) {
      res.status(400).json({ error: 'Missing in or out categoryId' });
      return;
    }

    const inPrice = latestPrices.find((p) => p.categoryId === String(inCat));
    const outPrice = latestPrices.find((p) => p.categoryId === String(outCat));

    if (!inPrice || !outPrice) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Swap oranı: 1 inCat = ? outCat
    const swapRate = inPrice.rate > 0 ? outPrice.rate / inPrice.rate : 0;

    res.json({
      inCategory: String(inCat),
      outCategory: String(outCat),
      rate: Math.round(swapRate * 1_000_000) / 1_000_000,
      inPrice,
      outPrice,
    });
  });

  // Tüm kategorilerin fiyat listesi (piyasa ekranı için)
  app.get('/exchange/market-status', (_req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      categories: latestPrices,
    });
  });

  // Tek kategori detayı
  app.get('/exchange/quote', (req, res) => {
    const { in: inCat, out: outCat, amount } = req.query;
    if (!inCat || !outCat || !amount) {
      res.status(400).json({ error: 'Missing in, out or amount' });
      return;
    }

    const inPrice = latestPrices.find((p) => p.categoryId === String(inCat));
    const outPrice = latestPrices.find((p) => p.categoryId === String(outCat));

    if (!inPrice || !outPrice) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const amt = Number(amount);
    const rate = inPrice.rate > 0 ? outPrice.rate / inPrice.rate : 0;
    const estimatedOut = amt * rate;
    const slippage = 0.003; // %0.3
    const minAmountOut = estimatedOut * (1 - slippage);

    res.json({
      inCategory: String(inCat),
      outCategory: String(outCat),
      amountIn: amt,
      estimatedOut: Math.round(estimatedOut * 1_000_000) / 1_000_000,
      minAmountOut: Math.round(minAmountOut * 1_000_000) / 1_000_000,
      slippageBps: 30,
      rate,
    });
  });

  const server = app.listen(port, () => {
    console.log(`Algorithm API listening on http://localhost:${port}`);
  });

  return server;
}
