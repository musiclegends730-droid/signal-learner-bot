import { analyzeCandles } from './indicators';
import { fetchCandles } from './marketData';
import type { IndicatorSnapshot, IndicatorVote } from './indicators';

export const INDICATOR_NAMES = [
  'rsi', 'macd', 'bollingerBands', 'emaCross', 'stochastic', 'priceAction',
  'atr', 'williamsR', 'cci', 'adx', 'obv', 'parabolicSar', 'roc', 'mfi',
  'donchianChannel', 'ichimoku',
  'hma', 'vwap', 'supertrend', 'elderRay', 'cmo', 'maRibbon',
  'trix', 'squeezeMomentum', 'keltnerChannel', 'pivotPoints'
] as const;

export type IndicatorName = typeof INDICATOR_NAMES[number];
export type WeightMap = Record<IndicatorName, number>;

export type SignalDecision = {
  action: 'BUY' | 'SELL';
  confidence: number;
  price: number;
  indicators: IndicatorSnapshot;
};

// Trend indicators get a 1.3x multiplier — they are best for Pocket Option accuracy
const TREND_INDICATORS = new Set([
  'hma', 'supertrend', 'maRibbon', 'adx', 'ichimoku', 'emaCross',
  'parabolicSar', 'trix', 'keltnerChannel', 'vwap'
]);

export function computeSignal(
  indicators: IndicatorSnapshot,
  weights: WeightMap
): { action: 'BUY' | 'SELL'; confidence: number } {
  let buyWeightedScore = 0;
  let sellWeightedScore = 0;
  let buyVoteCount = 0;
  let sellVoteCount = 0;
  let totalWeight = 0;

  for (const name of INDICATOR_NAMES) {
    const vote: IndicatorVote = (indicators as any)[name];
    if (!vote || vote.direction === 'NEUTRAL') continue;

    const baseWeight = weights[name] ?? 1.0;
    const trendMultiplier = TREND_INDICATORS.has(name) ? 1.3 : 1.0;
    const w = baseWeight * trendMultiplier;
    const score = w * (vote.confidence / 100);

    totalWeight += w;

    if (vote.direction === 'BUY') {
      buyWeightedScore += score;
      buyVoteCount++;
    } else {
      sellWeightedScore += score;
      sellVoteCount++;
    }
  }

  const totalActive = buyVoteCount + sellVoteCount;
  if (totalActive === 0) return { action: 'BUY', confidence: 50 };

  const totalScore = buyWeightedScore + sellWeightedScore;
  let action: 'BUY' | 'SELL';
  let winningScore: number;
  let winCount: number;
  let loseCount: number;

  if (buyVoteCount > sellVoteCount) {
    action = 'BUY';
    winningScore = buyWeightedScore;
    winCount = buyVoteCount;
    loseCount = sellVoteCount;
  } else if (sellVoteCount > buyVoteCount) {
    action = 'SELL';
    winningScore = sellWeightedScore;
    winCount = sellVoteCount;
    loseCount = buyVoteCount;
  } else {
    action = buyWeightedScore >= sellWeightedScore ? 'BUY' : 'SELL';
    winningScore = Math.max(buyWeightedScore, sellWeightedScore);
    winCount = buyVoteCount;
    loseCount = sellVoteCount;
  }

  const scoreDominance = totalScore > 0 ? winningScore / totalScore : 0.5;
  const voteDominance = totalActive > 0 ? (winCount - loseCount) / totalActive : 0;

  // Weight score dominance higher when more indicators agree
  const agreementRatio = winCount / totalActive;
  const blended = (scoreDominance * 0.6) + ((voteDominance * 0.5 + 0.5) * 0.25) + (agreementRatio * 0.15);

  const minConf = 51;
  const maxConf = 96;
  const confidence = Math.round(minConf + blended * (maxConf - minConf));

  return { action, confidence };
}

export function computeWeightUpdates(
  indicators: IndicatorSnapshot,
  action: 'BUY' | 'SELL',
  result: 'WIN' | 'LOSS',
  currentWeights: WeightMap
): WeightMap {
  const newWeights = { ...currentWeights };
  const learningRate = 0.06;
  const minWeight = 0.15;
  const maxWeight = 4.0;

  for (const name of INDICATOR_NAMES) {
    const vote: IndicatorVote = (indicators as any)[name];
    if (!vote || vote.direction === 'NEUTRAL') continue;
    const agreed = vote.direction === action;
    const wasRight = (result === 'WIN' && agreed) || (result === 'LOSS' && !agreed);
    const currentW = currentWeights[name] ?? 1.0;
    // Scale learning rate by confidence of the indicator's vote
    const confidenceScale = (vote.confidence / 100);
    const lr = learningRate * confidenceScale;
    if (wasRight) {
      newWeights[name] = Math.min(maxWeight, currentW * (1 + lr));
    } else {
      newWeights[name] = Math.max(minWeight, currentW * (1 - lr));
    }
  }

  return newWeights;
}

export async function generateSignal(
  asset: string,
  timeframe: string,
  weights: WeightMap
): Promise<SignalDecision> {
  const candles = await fetchCandles(asset, timeframe);
  if (!candles || candles.length < 60) {
    throw new Error(`Not enough candle data for ${asset} (got ${candles?.length ?? 0}, need 60+)`);
  }
  const indicators = analyzeCandles(candles);
  const { action, confidence } = computeSignal(indicators, weights);
  const price = candles[candles.length - 1].close;
  return { action, confidence, price, indicators };
}
