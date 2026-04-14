import { Router } from 'express';
import { SUPPORTED_ASSETS } from '../marketData';

export const tickerRouter = Router();

// Simple in-memory cache — refresh every 30s
let cache: { data: TickerEntry[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000;

export interface TickerEntry {
  asset: string;
  price: number;
  change: number;
  changePercent: number;
}

async function fetchTicker(asset: string): Promise<TickerEntry | null> {
  try {
    const ticker = asset.includes('/') ? asset.replace('/', '') + '=X' : asset;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
    if (price == null || prevClose == null) return null;

    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return {
      asset,
      price: Math.round(price * 100000) / 100000,
      change: Math.round(change * 100000) / 100000,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch {
    return null;
  }
}

tickerRouter.get('/ticker', async (_req, res) => {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return res.json(cache.data);
    }

    // Fetch top assets only (not all 26 to stay fast)
    const assetsToFetch = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD',
      'BTC-USD', 'ETH-USD', 'SOL-USD',
      'AAPL', 'TSLA', 'NVDA', 'GOOGL', 'SPY',
    ];

    const results = await Promise.all(assetsToFetch.map(fetchTicker));
    const data = results.filter((r): r is TickerEntry => r !== null);

    cache = { data, timestamp: Date.now() };
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
