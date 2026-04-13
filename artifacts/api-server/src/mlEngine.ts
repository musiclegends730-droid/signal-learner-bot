import { analyzeCandles } from './indicators';
import { fetchCandles } from './marketData';
import type { IndicatorSnapshot, IndicatorVote } from './indicators';

export const INDICATOR_NAMES = [
  'rsi', 'macd', 'bollingerBands', 'emaCross', 'stochastic', 'priceAction',
  'atr', 'williamsR', 'cci', 'adx', 'obv', 'parabolicSar', 'roc', 'mfi',
  'donchianChannel', 'ichimoku'
] as const;

export type IndicatorName = typeof INDICATOR_NAMES[number];
export type WeightMap = Record<IndicatorName, number>;

export type SignalDecision = {
  action: 'BUY' | 'SELL';
  confidence: number;
  price: number;
  indicators: IndicatorSnapshot;
};

export function computeSignal(
  indicators: IndicatorSnapshot,
  weights: WeightMap
): { action: 'BUY' | 'SELL'; confidence: number } {
  let buyWeightedScore = 0;
  let sellWeightedScore = 0;
  let buyVoteCount = 0;
  let sellVoteCount = 0;

  for (const name of INDICATOR_NAMES) {
    const vote: IndicatorVote = (indicators as any)[name];
    if (!vote || vote.direction === 'NEUTRAL') continue;
    const w = weights[name] ?? 1.0;
    const score = w * (vote.confidence / 100);
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
  const blended = (scoreDominance * 0.65) + ((voteDominance * 0.5 + 0.5) * 0.35);

  const minConf = 52;
  const maxConf = 97;
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
  const learningRate = 0.05;
  const minWeight = 0.2;
  const maxWeight = 3.0;

  for (const name of INDICATOR_NAMES) {
    const vote: IndicatorVote = (indicators as any)[name];
    if (!vote || vote.direction === 'NEUTRAL') continue;
    const agreed = vote.direction === action;
    const wasRight = (result === 'WIN' && agreed) || (result === 'LOSS' && !agreed);
    const currentW = currentWeights[name] ?? 1.0;
    if (wasRight) {
      newWeights[name] = Math.min(maxWeight, currentW * (1 + learningRate));
    } else {
      newWeights[name] = Math.max(minWeight, currentW * (1 - learningRate));
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
  if (!candles || candles.length < 55) {
    throw new Error(`Not enough candle data for ${asset} (got ${candles?.length ?? 0}, need 55)`);
  }
  const indicators = analyzeCandles(candles);
  const { action, confidence } = computeSignal(indicators, weights);
  const price = candles[candles.length - 1].close;
  return { action, confidence, price, indicators };
}
