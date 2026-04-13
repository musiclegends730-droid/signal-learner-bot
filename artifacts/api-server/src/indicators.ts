export type IndicatorVote = {
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  value: number;
  confidence: number;
};

export type IndicatorSnapshot = {
  rsi: IndicatorVote;
  macd: IndicatorVote;
  bollingerBands: IndicatorVote;
  emaCross: IndicatorVote;
  stochastic: IndicatorVote;
  priceAction: IndicatorVote;
  atr: IndicatorVote;
  williamsR: IndicatorVote;
  cci: IndicatorVote;
  adx: IndicatorVote;
  obv: IndicatorVote;
  parabolicSar: IndicatorVote;
  roc: IndicatorVote;
  mfi: IndicatorVote;
  donchianChannel: IndicatorVote;
  ichimoku: IndicatorVote;
};

export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const mean = avg(arr);
  return Math.sqrt(avg(arr.map(v => (v - mean) ** 2)));
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    result.push(avg(values.slice(i - period + 1, i + 1)));
  }
  return result;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = avg(gains);
  let avgLoss = avg(losses);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function rsiSignal(closes: number[]): IndicatorVote {
  const rsi = calculateRSI(closes);
  if (rsi < 20) return { direction: 'BUY', value: rsi, confidence: 95 };
  if (rsi < 30) return { direction: 'BUY', value: rsi, confidence: 88 };
  if (rsi < 38) return { direction: 'BUY', value: rsi, confidence: 72 };
  if (rsi > 80) return { direction: 'SELL', value: rsi, confidence: 95 };
  if (rsi > 70) return { direction: 'SELL', value: rsi, confidence: 88 };
  if (rsi > 62) return { direction: 'SELL', value: rsi, confidence: 72 };
  return { direction: 'NEUTRAL', value: rsi, confidence: 0 };
}

function stochasticK(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const hiSlice = highs.slice(i - period + 1, i + 1);
    const loSlice = lows.slice(i - period + 1, i + 1);
    const hh = Math.max(...hiSlice);
    const ll = Math.min(...loSlice);
    result.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  return result;
}

export function stochasticSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 20) return { direction: 'NEUTRAL', value: 50, confidence: 0 };
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const kLine = stochasticK(highs, lows, closes, 14);
  const dLine: number[] = [];
  for (let i = 2; i < kLine.length; i++) {
    dLine.push((kLine[i] + kLine[i - 1] + kLine[i - 2]) / 3);
  }
  if (dLine.length === 0) return { direction: 'NEUTRAL', value: 50, confidence: 0 };
  const d = dLine[dLine.length - 1];
  const prevD = dLine[dLine.length - 2] ?? d;
  if (d < 15 && d > prevD) return { direction: 'BUY', value: d, confidence: 92 };
  if (d < 20) return { direction: 'BUY', value: d, confidence: 82 };
  if (d < 30) return { direction: 'BUY', value: d, confidence: 68 };
  if (d > 85 && d < prevD) return { direction: 'SELL', value: d, confidence: 92 };
  if (d > 80) return { direction: 'SELL', value: d, confidence: 82 };
  if (d > 70) return { direction: 'SELL', value: d, confidence: 68 };
  return { direction: 'NEUTRAL', value: d, confidence: 0 };
}

export function macdSignal(closes: number[]): IndicatorVote {
  if (closes.length < 40) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLineRaw = ema(macdLine.slice(-18), 9);
  const lastMACD = macdLine[macdLine.length - 1];
  const prevMACD = macdLine[macdLine.length - 2];
  const lastSig = signalLineRaw[signalLineRaw.length - 1];
  const prevSig = signalLineRaw[signalLineRaw.length - 2] ?? lastSig;
  const hist = lastMACD - lastSig;
  const prevHist = prevMACD - (prevSig ?? lastSig);
  if (prevHist <= 0 && hist > 0) return { direction: 'BUY', value: hist, confidence: 88 };
  if (prevHist >= 0 && hist < 0) return { direction: 'SELL', value: hist, confidence: 88 };
  const histAcc = hist - prevHist;
  if (hist > 0 && histAcc > 0) return { direction: 'BUY', value: hist, confidence: 62 };
  if (hist < 0 && histAcc < 0) return { direction: 'SELL', value: hist, confidence: 62 };
  if (hist > 0 && histAcc < 0 && histAcc / (Math.abs(hist) + 1e-10) < -0.3)
    return { direction: 'SELL', value: hist, confidence: 55 };
  if (hist < 0 && histAcc > 0 && histAcc / (Math.abs(hist) + 1e-10) > 0.3)
    return { direction: 'BUY', value: hist, confidence: 55 };
  return { direction: 'NEUTRAL', value: hist, confidence: 0 };
}

export function bollingerBandsSignal(closes: number[]): IndicatorVote {
  if (closes.length < 20) return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
  const last20 = closes.slice(-20);
  const mid = avg(last20);
  const sd = stdDev(last20);
  const upper = mid + 2 * sd;
  const lower = mid - 2 * sd;
  const price = closes[closes.length - 1];
  const bPct = sd === 0 ? 0.5 : (price - lower) / (upper - lower);
  if (bPct <= 0.00) return { direction: 'BUY', value: bPct, confidence: 95 };
  if (bPct <= 0.15) return { direction: 'BUY', value: bPct, confidence: 88 };
  if (bPct <= 0.30) return { direction: 'BUY', value: bPct, confidence: 72 };
  if (bPct <= 0.45) return { direction: 'BUY', value: bPct, confidence: 58 };
  if (bPct >= 1.00) return { direction: 'SELL', value: bPct, confidence: 95 };
  if (bPct >= 0.85) return { direction: 'SELL', value: bPct, confidence: 88 };
  if (bPct >= 0.70) return { direction: 'SELL', value: bPct, confidence: 72 };
  if (bPct >= 0.55) return { direction: 'SELL', value: bPct, confidence: 58 };
  return { direction: 'NEUTRAL', value: bPct, confidence: 0 };
}

export function emaCrossSignal(closes: number[]): IndicatorVote {
  if (closes.length < 25) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  const diff = fast[fast.length - 1] - slow[slow.length - 1];
  const prevDiff = fast[fast.length - 2] - slow[slow.length - 2];
  const prevPrevDiff = fast[fast.length - 3] - slow[slow.length - 3];
  if (prevDiff <= 0 && diff > 0) return { direction: 'BUY', value: diff, confidence: 90 };
  if (prevDiff >= 0 && diff < 0) return { direction: 'SELL', value: diff, confidence: 90 };
  const diffAccel = (diff - prevDiff) - (prevDiff - prevPrevDiff);
  const pct = Math.abs(diff / (slow[slow.length - 1] + 1e-10)) * 100;
  const conf = Math.min(80, 50 + pct * 3);
  if (diff > 0) {
    if (diffAccel < -pct * 0.3) return { direction: 'SELL', value: diff, confidence: 62 };
    return { direction: 'BUY', value: diff, confidence: conf };
  }
  if (diff < 0) {
    if (diffAccel > pct * 0.3) return { direction: 'BUY', value: diff, confidence: 62 };
    return { direction: 'SELL', value: diff, confidence: conf };
  }
  return { direction: 'NEUTRAL', value: 0, confidence: 0 };
}

export function priceActionSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 10) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const recent = candles.slice(-6);
  const last = recent[recent.length - 1];
  const bodies = recent.map(c => Math.abs(c.close - c.open));
  const avgBody = avg(bodies);
  const lastBody = bodies[bodies.length - 1];
  const bulls = recent.filter(c => c.close > c.open).length;
  const bears = recent.filter(c => c.close <= c.open).length;
  const prevC = candles[candles.length - 2];
  const currC = candles[candles.length - 1];
  const bullishEngulfing =
    prevC.close < prevC.open &&
    currC.close > currC.open &&
    currC.open < prevC.close &&
    currC.close > prevC.open;
  const bearishEngulfing =
    prevC.close > prevC.open &&
    currC.close < currC.open &&
    currC.open > prevC.close &&
    currC.close < prevC.open;
  if (bullishEngulfing && lastBody > avgBody * 1.3)
    return { direction: 'BUY', value: lastBody / avgBody, confidence: 90 };
  if (bearishEngulfing && lastBody > avgBody * 1.3)
    return { direction: 'SELL', value: lastBody / avgBody, confidence: 90 };
  const range = last.high - last.low;
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);
  if (range > 0) {
    const lowerPct = lowerWick / range;
    const upperPct = upperWick / range;
    if (lowerPct > 0.6 && lastBody / range < 0.3)
      return { direction: 'BUY', value: lowerPct, confidence: 78 };
    if (upperPct > 0.6 && lastBody / range < 0.3)
      return { direction: 'SELL', value: upperPct, confidence: 78 };
  }
  if (bulls >= 5) return { direction: 'BUY', value: bulls / 6, confidence: 65 };
  if (bears >= 5) return { direction: 'SELL', value: bears / 6, confidence: 65 };
  if (bulls === 4) return { direction: 'BUY', value: 4 / 6, confidence: 55 };
  if (bears === 4) return { direction: 'SELL', value: 4 / 6, confidence: 55 };
  return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
}

export function atrSignal(candles: MarketCandle[], period = 14): IndicatorVote {
  if (candles.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    ));
  }
  const atrValues: number[] = [avg(trs.slice(0, period))];
  for (let i = period; i < trs.length; i++) {
    atrValues.push((atrValues[atrValues.length - 1] * (period - 1) + trs[i]) / period);
  }
  const currentATR = atrValues[atrValues.length - 1];
  const prevATR = atrValues[atrValues.length - 2] ?? currentATR;
  const last = candles[candles.length - 1];
  const price = last.close;
  const atrPct = (currentATR / price) * 100;
  const isExpanding = currentATR > prevATR * 1.05;
  const isContracting = currentATR < prevATR * 0.95;
  const bullish = last.close > last.open;
  if (atrPct > 1.5 && isExpanding && bullish)
    return { direction: 'BUY', value: currentATR, confidence: 75 };
  if (atrPct > 1.5 && isExpanding && !bullish)
    return { direction: 'SELL', value: currentATR, confidence: 75 };
  if (isContracting)
    return { direction: 'NEUTRAL', value: currentATR, confidence: 0 };
  return { direction: 'NEUTRAL', value: currentATR, confidence: 0 };
}

export function williamsRSignal(candles: MarketCandle[], period = 14): IndicatorVote {
  if (candles.length < period) return { direction: 'NEUTRAL', value: -50, confidence: 0 };
  const slice = candles.slice(-period);
  const hh = Math.max(...slice.map(c => c.high));
  const ll = Math.min(...slice.map(c => c.low));
  const last = candles[candles.length - 1].close;
  const wR = hh === ll ? -50 : ((hh - last) / (hh - ll)) * -100;
  const prevSlice = candles.slice(-period - 1, -1);
  const prevHH = Math.max(...prevSlice.map(c => c.high));
  const prevLL = Math.min(...prevSlice.map(c => c.low));
  const prevClose = candles[candles.length - 2].close;
  const prevWR = prevHH === prevLL ? -50 : ((prevHH - prevClose) / (prevHH - prevLL)) * -100;
  if (wR < -80 && wR > prevWR) return { direction: 'BUY', value: wR, confidence: 88 };
  if (wR < -80) return { direction: 'BUY', value: wR, confidence: 75 };
  if (wR < -70) return { direction: 'BUY', value: wR, confidence: 62 };
  if (wR > -20 && wR < prevWR) return { direction: 'SELL', value: wR, confidence: 88 };
  if (wR > -20) return { direction: 'SELL', value: wR, confidence: 75 };
  if (wR > -30) return { direction: 'SELL', value: wR, confidence: 62 };
  return { direction: 'NEUTRAL', value: wR, confidence: 0 };
}

export function cciSignal(candles: MarketCandle[], period = 20): IndicatorVote {
  if (candles.length < period) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const typicals = candles.map(c => (c.high + c.low + c.close) / 3);
  const tp = typicals[typicals.length - 1];
  const tpSlice = typicals.slice(-period);
  const tpMean = avg(tpSlice);
  const meanDev = avg(tpSlice.map(v => Math.abs(v - tpMean)));
  const cci = meanDev === 0 ? 0 : (tp - tpMean) / (0.015 * meanDev);
  if (cci < -200) return { direction: 'BUY', value: cci, confidence: 92 };
  if (cci < -100) return { direction: 'BUY', value: cci, confidence: 82 };
  if (cci < -80) return { direction: 'BUY', value: cci, confidence: 68 };
  if (cci > 200) return { direction: 'SELL', value: cci, confidence: 92 };
  if (cci > 100) return { direction: 'SELL', value: cci, confidence: 82 };
  if (cci > 80) return { direction: 'SELL', value: cci, confidence: 68 };
  return { direction: 'NEUTRAL', value: cci, confidence: 0 };
}

export function adxSignal(candles: MarketCandle[], period = 14): IndicatorVote {
  if (candles.length < period * 2 + 1) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trList: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const upMove = c.high - p.high;
    const downMove = p.low - c.low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trList.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  function wilderSmooth(arr: number[], p: number): number[] {
    const initial = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    const out: number[] = [initial];
    for (let i = p; i < arr.length; i++) {
      out.push(out[out.length - 1] * (p - 1) / p + arr[i] / p);
    }
    return out;
  }
  const sTR = wilderSmooth(trList, period);
  const sPDM = wilderSmooth(plusDM, period);
  const sMDM = wilderSmooth(minusDM, period);
  const pDI = sTR.map((tr, i) => tr === 0 ? 0 : (sPDM[i] / tr) * 100);
  const mDI = sTR.map((tr, i) => tr === 0 ? 0 : (sMDM[i] / tr) * 100);
  const dx = pDI.map((p, i) => {
    const sum = p + mDI[i];
    return sum === 0 ? 0 : (Math.abs(p - mDI[i]) / sum) * 100;
  });
  const adxValues = wilderSmooth(dx, period);
  const adx = Math.min(100, adxValues[adxValues.length - 1]);
  const lastPDI = pDI[pDI.length - 1];
  const lastMDI = mDI[mDI.length - 1];
  if (adx < 20) return { direction: 'NEUTRAL', value: adx, confidence: 0 };
  if (adx >= 25 && lastPDI > lastMDI) return { direction: 'BUY', value: adx, confidence: Math.min(92, 55 + adx * 0.7) };
  if (adx >= 25 && lastMDI > lastPDI) return { direction: 'SELL', value: adx, confidence: Math.min(92, 55 + adx * 0.7) };
  return { direction: 'NEUTRAL', value: adx, confidence: 0 };
}

export function obvSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 20) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const obvValues: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close;
    const curr = candles[i].close;
    const vol = candles[i].volume;
    if (curr > prev) obvValues.push(obvValues[obvValues.length - 1] + vol);
    else if (curr < prev) obvValues.push(obvValues[obvValues.length - 1] - vol);
    else obvValues.push(obvValues[obvValues.length - 1]);
  }
  const obv10 = avg(obvValues.slice(-10));
  const obv3 = avg(obvValues.slice(-3));
  const current = obvValues[obvValues.length - 1];
  const price10Ago = candles[candles.length - 10]?.close ?? candles[0].close;
  const priceCurrent = candles[candles.length - 1].close;
  const priceUp = priceCurrent > price10Ago;
  const obvUp = current > obv10;
  if (obvUp && priceUp) return { direction: 'BUY', value: current, confidence: 78 };
  if (!obvUp && !priceUp) return { direction: 'SELL', value: current, confidence: 78 };
  if (obvUp && !priceUp) return { direction: 'BUY', value: current, confidence: 70 };
  if (!obvUp && priceUp) return { direction: 'SELL', value: current, confidence: 70 };
  return { direction: 'NEUTRAL', value: current, confidence: 0 };
}

export function parabolicSarSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 10) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  let rising = true;
  let sar = candles[0].low;
  let ep = candles[0].high;
  let af = 0.02;
  const maxAF = 0.2;
  const sarValues: number[] = [sar];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);
    if (rising) {
      if (c.low < sar) {
        rising = false;
        sar = ep;
        ep = c.low;
        af = 0.02;
      } else {
        if (c.high > ep) {
          ep = c.high;
          af = Math.min(af + 0.02, maxAF);
        }
        sar = Math.min(sar, candles[i - 1].low, i > 1 ? candles[i - 2].low : candles[i - 1].low);
      }
    } else {
      if (c.high > sar) {
        rising = true;
        sar = ep;
        ep = c.high;
        af = 0.02;
      } else {
        if (c.low < ep) {
          ep = c.low;
          af = Math.min(af + 0.02, maxAF);
        }
        sar = Math.max(sar, candles[i - 1].high, i > 1 ? candles[i - 2].high : candles[i - 1].high);
      }
    }
    sarValues.push(sar);
  }
  const price = candles[candles.length - 1].close;
  const lastSAR = sarValues[sarValues.length - 1];
  if (rising && price > lastSAR) return { direction: 'BUY', value: lastSAR, confidence: 80 };
  if (!rising && price < lastSAR) return { direction: 'SELL', value: lastSAR, confidence: 80 };
  return { direction: 'NEUTRAL', value: lastSAR, confidence: 0 };
}

export function rocSignal(closes: number[], period = 12): IndicatorVote {
  if (closes.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const roc = ((closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]) * 100;
  const prevRoc = ((closes[closes.length - 2] - closes[closes.length - 2 - period]) / closes[closes.length - 2 - period]) * 100;
  if (roc > 5) return { direction: 'BUY', value: roc, confidence: Math.min(90, 65 + roc) };
  if (roc > 2) return { direction: 'BUY', value: roc, confidence: 65 };
  if (roc > 0 && prevRoc < 0) return { direction: 'BUY', value: roc, confidence: 72 };
  if (roc < -5) return { direction: 'SELL', value: roc, confidence: Math.min(90, 65 + Math.abs(roc)) };
  if (roc < -2) return { direction: 'SELL', value: roc, confidence: 65 };
  if (roc < 0 && prevRoc > 0) return { direction: 'SELL', value: roc, confidence: 72 };
  return { direction: 'NEUTRAL', value: roc, confidence: 0 };
}

export function mfiSignal(candles: MarketCandle[], period = 14): IndicatorVote {
  if (candles.length < period + 1) return { direction: 'NEUTRAL', value: 50, confidence: 0 };
  const typicals = candles.map(c => (c.high + c.low + c.close) / 3);
  let posFlow = 0;
  let negFlow = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const mf = typicals[i] * candles[i].volume;
    if (typicals[i] > typicals[i - 1]) posFlow += mf;
    else if (typicals[i] < typicals[i - 1]) negFlow += mf;
  }
  const mfr = negFlow === 0 ? 100 : posFlow / negFlow;
  const mfi = 100 - 100 / (1 + mfr);
  if (mfi < 10) return { direction: 'BUY', value: mfi, confidence: 92 };
  if (mfi < 20) return { direction: 'BUY', value: mfi, confidence: 85 };
  if (mfi < 30) return { direction: 'BUY', value: mfi, confidence: 70 };
  if (mfi > 90) return { direction: 'SELL', value: mfi, confidence: 92 };
  if (mfi > 80) return { direction: 'SELL', value: mfi, confidence: 85 };
  if (mfi > 70) return { direction: 'SELL', value: mfi, confidence: 70 };
  return { direction: 'NEUTRAL', value: mfi, confidence: 0 };
}

export function donchianChannelSignal(candles: MarketCandle[], period = 20): IndicatorVote {
  if (candles.length < period) return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
  const slice = candles.slice(-period);
  const upper = Math.max(...slice.map(c => c.high));
  const lower = Math.min(...slice.map(c => c.low));
  const mid = (upper + lower) / 2;
  const price = candles[candles.length - 1].close;
  if (upper === lower) return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
  const pos = (price - lower) / (upper - lower);
  const prevSlice = candles.slice(-period - 1, -1);
  const prevUpper = Math.max(...prevSlice.map(c => c.high));
  const prevLower = Math.min(...prevSlice.map(c => c.low));
  const prevPrice = candles[candles.length - 2].close;
  const prevPos = (prevPrice - prevLower) / (prevUpper - prevLower || 1);
  if (price >= upper) return { direction: 'BUY', value: pos, confidence: 85 };
  if (price <= lower) return { direction: 'SELL', value: pos, confidence: 85 };
  if (pos > 0.7 && prevPos < 0.7) return { direction: 'BUY', value: pos, confidence: 68 };
  if (pos < 0.3 && prevPos > 0.3) return { direction: 'SELL', value: pos, confidence: 68 };
  if (pos > 0.6) return { direction: 'BUY', value: pos, confidence: 55 };
  if (pos < 0.4) return { direction: 'SELL', value: pos, confidence: 55 };
  return { direction: 'NEUTRAL', value: pos, confidence: 0 };
}

export function ichimokuSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 52) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  function midpointOf(arr: MarketCandle[], start: number, end: number): number {
    const slice = arr.slice(start, end);
    return (Math.max(...slice.map(c => c.high)) + Math.min(...slice.map(c => c.low))) / 2;
  }
  const n = candles.length;
  const tenkan = midpointOf(candles, n - 9, n);
  const kijun = midpointOf(candles, n - 26, n);
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = midpointOf(candles, n - 52, n);
  const price = candles[n - 1].close;
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBot = Math.min(senkouA, senkouB);
  const bullCloud = senkouA > senkouB;
  if (price > cloudTop && tenkan > kijun && bullCloud)
    return { direction: 'BUY', value: price, confidence: 88 };
  if (price > cloudTop && tenkan > kijun)
    return { direction: 'BUY', value: price, confidence: 75 };
  if (price > cloudTop)
    return { direction: 'BUY', value: price, confidence: 60 };
  if (price < cloudBot && tenkan < kijun && !bullCloud)
    return { direction: 'SELL', value: price, confidence: 88 };
  if (price < cloudBot && tenkan < kijun)
    return { direction: 'SELL', value: price, confidence: 75 };
  if (price < cloudBot)
    return { direction: 'SELL', value: price, confidence: 60 };
  return { direction: 'NEUTRAL', value: price, confidence: 0 };
}

export function analyzeCandles(candles: MarketCandle[]): IndicatorSnapshot {
  const closes = candles.map(c => c.close);
  return {
    rsi: rsiSignal(closes),
    macd: macdSignal(closes),
    bollingerBands: bollingerBandsSignal(closes),
    emaCross: emaCrossSignal(closes),
    stochastic: stochasticSignal(candles),
    priceAction: priceActionSignal(candles),
    atr: atrSignal(candles),
    williamsR: williamsRSignal(candles),
    cci: cciSignal(candles),
    adx: adxSignal(candles),
    obv: obvSignal(candles),
    parabolicSar: parabolicSarSignal(candles),
    roc: rocSignal(closes),
    mfi: mfiSignal(candles),
    donchianChannel: donchianChannelSignal(candles),
    ichimoku: ichimokuSignal(candles),
  };
}
