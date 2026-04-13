import type { MarketCandle } from './indicators';

export const SUPPORTED_ASSETS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF',
  'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'BTC-USD', 'ETH-USD', 'XRP-USD', 'SOL-USD', 'BNB-USD',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META',
  'SPY', 'QQQ', 'GLD', 'EURUSD=X'
];

const TIMEFRAME_MAP: Record<string, { interval: string; range: string }> = {
  '1m':  { interval: '1m',  range: '1d' },
  '5m':  { interval: '5m',  range: '5d' },
  '15m': { interval: '15m', range: '5d' },
  '30m': { interval: '30m', range: '10d' },
  '1h':  { interval: '60m', range: '30d' },
  '4h':  { interval: '1d',  range: '3mo' },
  '1d':  { interval: '1d',  range: '6mo' },
};

export async function fetchCandles(asset: string, timeframe = '5m'): Promise<MarketCandle[]> {
  const tf = TIMEFRAME_MAP[timeframe] ?? TIMEFRAME_MAP['5m'];
  const ticker = asset.includes('/') ? asset.replace('/', '') + '=X' : asset;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${tf.interval}&range=${tf.range}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance error ${response.status} for ${asset}`);
  }

  const data = await response.json() as any;
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${asset}`);

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q || !timestamps.length) throw new Error(`No quote data for ${asset}`);

  const candles: MarketCandle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i] ?? 0;
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ time: timestamps[i], open: o, high: h, low: l, close: c, volume: v });
  }

  return candles;
}
