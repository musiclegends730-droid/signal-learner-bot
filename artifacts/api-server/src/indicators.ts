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
  hma: IndicatorVote;
  vwap: IndicatorVote;
  supertrend: IndicatorVote;
  elderRay: IndicatorVote;
  cmo: IndicatorVote;
  maRibbon: IndicatorVote;
  trix: IndicatorVote;
  squeezeMomentum: IndicatorVote;
  keltnerChannel: IndicatorVote;
  pivotPoints: IndicatorVote;
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

function wma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    let weightedSum = 0;
    let weightSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;
      weightedSum += values[i - j] * weight;
      weightSum += weight;
    }
    result.push(weightedSum / weightSum);
  }
  return result;
}

function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    result.push(avg(values.slice(i - period + 1, i + 1)));
  }
  return result;
}

function wilderSmooth(arr: number[], p: number): number[] {
  if (arr.length < p) return arr.map(() => 0);
  const initial = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
  const out: number[] = [initial];
  for (let i = p; i < arr.length; i++) {
    out.push(out[out.length - 1] * (p - 1) / p + arr[i] / p);
  }
  return out;
}

// ─── INDICATOR 1: RSI ──────────────────────────────────────────────────────

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

// ─── INDICATOR 2: MACD ─────────────────────────────────────────────────────

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
  if (hist > 0 && histAcc > 0) return { direction: 'BUY', value: hist, confidence: 68 };
  if (hist < 0 && histAcc < 0) return { direction: 'SELL', value: hist, confidence: 68 };
  if (hist > 0 && histAcc < 0 && histAcc / (Math.abs(hist) + 1e-10) < -0.3)
    return { direction: 'SELL', value: hist, confidence: 55 };
  if (hist < 0 && histAcc > 0 && histAcc / (Math.abs(hist) + 1e-10) > 0.3)
    return { direction: 'BUY', value: hist, confidence: 55 };
  return { direction: 'NEUTRAL', value: hist, confidence: 0 };
}

// ─── INDICATOR 3: BOLLINGER BANDS ──────────────────────────────────────────

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

// ─── INDICATOR 4: EMA CROSS (9/21) ─────────────────────────────────────────

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

// ─── INDICATOR 5: STOCHASTIC ───────────────────────────────────────────────

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

// ─── INDICATOR 6: PRICE ACTION ─────────────────────────────────────────────

export function priceActionSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 10) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const recent = candles.slice(-6);
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
  const dojiBody = Math.abs(currC.close - currC.open) / (currC.high - currC.low + 1e-10);
  const hammer =
    dojiBody < 0.3 &&
    (Math.min(currC.open, currC.close) - currC.low) / (currC.high - currC.low + 1e-10) > 0.6;
  const shootingStar =
    dojiBody < 0.3 &&
    (currC.high - Math.max(currC.open, currC.close)) / (currC.high - currC.low + 1e-10) > 0.6;
  if (bullishEngulfing && lastBody > avgBody * 1.2)
    return { direction: 'BUY', value: lastBody / avgBody, confidence: 90 };
  if (bearishEngulfing && lastBody > avgBody * 1.2)
    return { direction: 'SELL', value: lastBody / avgBody, confidence: 90 };
  if (hammer) return { direction: 'BUY', value: dojiBody, confidence: 80 };
  if (shootingStar) return { direction: 'SELL', value: dojiBody, confidence: 80 };
  const range = currC.high - currC.low;
  const lowerWick = Math.min(currC.open, currC.close) - currC.low;
  const upperWick = currC.high - Math.max(currC.open, currC.close);
  if (range > 0) {
    const lowerPct = lowerWick / range;
    const upperPct = upperWick / range;
    if (lowerPct > 0.6 && dojiBody < 0.3) return { direction: 'BUY', value: lowerPct, confidence: 78 };
    if (upperPct > 0.6 && dojiBody < 0.3) return { direction: 'SELL', value: upperPct, confidence: 78 };
  }
  if (bulls >= 5) return { direction: 'BUY', value: bulls / 6, confidence: 65 };
  if (bears >= 5) return { direction: 'SELL', value: bears / 6, confidence: 65 };
  if (bulls === 4) return { direction: 'BUY', value: 4 / 6, confidence: 55 };
  if (bears === 4) return { direction: 'SELL', value: 4 / 6, confidence: 55 };
  return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
}

// ─── INDICATOR 7: ATR ──────────────────────────────────────────────────────

export function atrSignal(candles: MarketCandle[], period = 14): IndicatorVote {
  if (candles.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
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
  const bullish = last.close > last.open;
  if (atrPct > 1.5 && isExpanding && bullish) return { direction: 'BUY', value: currentATR, confidence: 75 };
  if (atrPct > 1.5 && isExpanding && !bullish) return { direction: 'SELL', value: currentATR, confidence: 75 };
  return { direction: 'NEUTRAL', value: currentATR, confidence: 0 };
}

// ─── INDICATOR 8: WILLIAMS %R ──────────────────────────────────────────────

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

// ─── INDICATOR 9: CCI ──────────────────────────────────────────────────────

export function cciSignal(candles: MarketCandle[], period = 20): IndicatorVote {
  if (candles.length < period) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const typicals = candles.map(c => (c.high + c.low + c.close) / 3);
  const tp = typicals[typicals.length - 1];
  const tpSlice = typicals.slice(-period);
  const tpMean = avg(tpSlice);
  const meanDev = avg(tpSlice.map(v => Math.abs(v - tpMean)));
  const cci = meanDev === 0 ? 0 : (tp - tpMean) / (0.015 * meanDev);
  const prevTypicals = typicals.slice(-period - 1, -1);
  const prevTP = prevTypicals[prevTypicals.length - 1];
  const prevMean = avg(prevTypicals);
  const prevDev = avg(prevTypicals.map(v => Math.abs(v - prevMean)));
  const prevCCI = prevDev === 0 ? 0 : (prevTP - prevMean) / (0.015 * prevDev);
  if (cci < -200) return { direction: 'BUY', value: cci, confidence: 92 };
  if (cci < -100) return { direction: 'BUY', value: cci, confidence: 82 };
  if (cci < -80) return { direction: 'BUY', value: cci, confidence: 68 };
  if (cci < 0 && prevCCI < -100 && cci > prevCCI) return { direction: 'BUY', value: cci, confidence: 72 };
  if (cci > 200) return { direction: 'SELL', value: cci, confidence: 92 };
  if (cci > 100) return { direction: 'SELL', value: cci, confidence: 82 };
  if (cci > 80) return { direction: 'SELL', value: cci, confidence: 68 };
  if (cci > 0 && prevCCI > 100 && cci < prevCCI) return { direction: 'SELL', value: cci, confidence: 72 };
  return { direction: 'NEUTRAL', value: cci, confidence: 0 };
}

// ─── INDICATOR 10: ADX ─────────────────────────────────────────────────────

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

// ─── INDICATOR 11: OBV ─────────────────────────────────────────────────────

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
  const obvAccel = obv3 > obv10;
  if (obvUp && priceUp && obvAccel) return { direction: 'BUY', value: current, confidence: 85 };
  if (obvUp && priceUp) return { direction: 'BUY', value: current, confidence: 75 };
  if (!obvUp && !priceUp && !obvAccel) return { direction: 'SELL', value: current, confidence: 85 };
  if (!obvUp && !priceUp) return { direction: 'SELL', value: current, confidence: 75 };
  if (obvUp && !priceUp) return { direction: 'BUY', value: current, confidence: 65 };
  if (!obvUp && priceUp) return { direction: 'SELL', value: current, confidence: 65 };
  return { direction: 'NEUTRAL', value: current, confidence: 0 };
}

// ─── INDICATOR 12: PARABOLIC SAR ───────────────────────────────────────────

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
        if (c.high > ep) { ep = c.high; af = Math.min(af + 0.02, maxAF); }
        sar = Math.min(sar, candles[i - 1].low, i > 1 ? candles[i - 2].low : candles[i - 1].low);
      }
    } else {
      if (c.high > sar) {
        rising = true;
        sar = ep;
        ep = c.high;
        af = 0.02;
      } else {
        if (c.low < ep) { ep = c.low; af = Math.min(af + 0.02, maxAF); }
        sar = Math.max(sar, candles[i - 1].high, i > 1 ? candles[i - 2].high : candles[i - 1].high);
      }
    }
    sarValues.push(sar);
  }
  const price = candles[candles.length - 1].close;
  const lastSAR = sarValues[sarValues.length - 1];
  const priceDist = Math.abs(price - lastSAR) / price * 100;
  const confBonus = Math.min(12, priceDist * 2);
  if (rising && price > lastSAR) return { direction: 'BUY', value: lastSAR, confidence: Math.round(75 + confBonus) };
  if (!rising && price < lastSAR) return { direction: 'SELL', value: lastSAR, confidence: Math.round(75 + confBonus) };
  return { direction: 'NEUTRAL', value: lastSAR, confidence: 0 };
}

// ─── INDICATOR 13: ROC ─────────────────────────────────────────────────────

export function rocSignal(closes: number[], period = 12): IndicatorVote {
  if (closes.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const roc = ((closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]) * 100;
  const prevRoc = ((closes[closes.length - 2] - closes[closes.length - 2 - period]) / closes[closes.length - 2 - period]) * 100;
  if (roc > 5) return { direction: 'BUY', value: roc, confidence: Math.min(90, 65 + roc) };
  if (roc > 2) return { direction: 'BUY', value: roc, confidence: 65 };
  if (roc > 0 && prevRoc < 0) return { direction: 'BUY', value: roc, confidence: 75 };
  if (roc < -5) return { direction: 'SELL', value: roc, confidence: Math.min(90, 65 + Math.abs(roc)) };
  if (roc < -2) return { direction: 'SELL', value: roc, confidence: 65 };
  if (roc < 0 && prevRoc > 0) return { direction: 'SELL', value: roc, confidence: 75 };
  return { direction: 'NEUTRAL', value: roc, confidence: 0 };
}

// ─── INDICATOR 14: MFI ─────────────────────────────────────────────────────

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

// ─── INDICATOR 15: DONCHIAN CHANNEL ────────────────────────────────────────

export function donchianChannelSignal(candles: MarketCandle[], period = 20): IndicatorVote {
  if (candles.length < period) return { direction: 'NEUTRAL', value: 0.5, confidence: 0 };
  const slice = candles.slice(-period);
  const upper = Math.max(...slice.map(c => c.high));
  const lower = Math.min(...slice.map(c => c.low));
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

// ─── INDICATOR 16: ICHIMOKU ────────────────────────────────────────────────

export function ichimokuSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 52) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  function midpoint(arr: MarketCandle[], start: number, end: number): number {
    const sl = arr.slice(start, end);
    return (Math.max(...sl.map(c => c.high)) + Math.min(...sl.map(c => c.low))) / 2;
  }
  const n = candles.length;
  const tenkan = midpoint(candles, n - 9, n);
  const kijun = midpoint(candles, n - 26, n);
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = midpoint(candles, n - 52, n);
  const price = candles[n - 1].close;
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBot = Math.min(senkouA, senkouB);
  const bullCloud = senkouA > senkouB;
  if (price > cloudTop && tenkan > kijun && bullCloud) return { direction: 'BUY', value: price, confidence: 88 };
  if (price > cloudTop && tenkan > kijun) return { direction: 'BUY', value: price, confidence: 78 };
  if (price > cloudTop) return { direction: 'BUY', value: price, confidence: 62 };
  if (price < cloudBot && tenkan < kijun && !bullCloud) return { direction: 'SELL', value: price, confidence: 88 };
  if (price < cloudBot && tenkan < kijun) return { direction: 'SELL', value: price, confidence: 78 };
  if (price < cloudBot) return { direction: 'SELL', value: price, confidence: 62 };
  return { direction: 'NEUTRAL', value: price, confidence: 0 };
}

// ─── INDICATOR 17: HULL MOVING AVERAGE ────────────────────────────────────

export function hmaSignal(closes: number[], period = 20): IndicatorVote {
  if (closes.length < period * 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.round(Math.sqrt(period));
  const wmaFull = wma(closes, period);
  const wmaHalf = wma(closes, halfPeriod);
  const minLen = Math.min(wmaFull.length, wmaHalf.length);
  const diff = wmaHalf.slice(-minLen).map((v, i) => 2 * v - wmaFull[wmaFull.length - minLen + i]);
  if (diff.length < sqrtPeriod) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const hmaValues = wma(diff, sqrtPeriod);
  const current = hmaValues[hmaValues.length - 1];
  const prev = hmaValues[hmaValues.length - 2] ?? current;
  const prev2 = hmaValues[hmaValues.length - 3] ?? prev;
  const rising = current > prev && prev > prev2;
  const falling = current < prev && prev < prev2;
  const slope = ((current - prev) / (Math.abs(prev) + 1e-10)) * 100;
  const conf = Math.min(92, 65 + Math.abs(slope) * 10);
  if (rising) return { direction: 'BUY', value: current, confidence: Math.round(conf) };
  if (falling) return { direction: 'SELL', value: current, confidence: Math.round(conf) };
  if (current > prev) return { direction: 'BUY', value: current, confidence: 55 };
  if (current < prev) return { direction: 'SELL', value: current, confidence: 55 };
  return { direction: 'NEUTRAL', value: current, confidence: 0 };
}

// ─── INDICATOR 18: VWAP ───────────────────────────────────────────────────

export function vwapSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 20) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const recent = candles.slice(-50);
  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  for (const c of recent) {
    const tp = (c.high + c.low + c.close) / 3;
    cumulativeTPV += tp * (c.volume || 1);
    cumulativeVol += c.volume || 1;
  }
  const vwap = cumulativeTPV / cumulativeVol;
  const price = candles[candles.length - 1].close;
  const deviation = ((price - vwap) / vwap) * 100;
  const absDeviation = Math.abs(deviation);
  const conf = Math.min(90, 58 + absDeviation * 4);
  if (deviation > 1.5) return { direction: 'SELL', value: vwap, confidence: Math.round(conf) };
  if (deviation > 0.5) return { direction: 'SELL', value: vwap, confidence: 62 };
  if (deviation > 0.1) return { direction: 'SELL', value: vwap, confidence: 55 };
  if (deviation < -1.5) return { direction: 'BUY', value: vwap, confidence: Math.round(conf) };
  if (deviation < -0.5) return { direction: 'BUY', value: vwap, confidence: 62 };
  if (deviation < -0.1) return { direction: 'BUY', value: vwap, confidence: 55 };
  return { direction: 'NEUTRAL', value: vwap, confidence: 0 };
}

// ─── INDICATOR 19: SUPERTREND ─────────────────────────────────────────────

export function supertrendSignal(candles: MarketCandle[], period = 10, multiplier = 3): IndicatorVote {
  if (candles.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const atrVals: number[] = [avg(trs.slice(0, period))];
  for (let i = period; i < trs.length; i++) {
    atrVals.push((atrVals[atrVals.length - 1] * (period - 1) + trs[i]) / period);
  }
  let upTrend = true;
  let upperBand = 0;
  let lowerBand = 0;
  const price = candles[candles.length - 1].close;
  for (let i = 1; i < candles.length - 1; i++) {
    const atrIdx = i - 1;
    const c = candles[i];
    const hl2 = (c.high + c.low) / 2;
    const atr = atrVals[Math.min(atrIdx, atrVals.length - 1)];
    const newUpper = hl2 + multiplier * atr;
    const newLower = hl2 - multiplier * atr;
    upperBand = upperBand === 0 ? newUpper : (newUpper < upperBand || candles[i - 1].close > upperBand ? newUpper : upperBand);
    lowerBand = lowerBand === 0 ? newLower : (newLower > lowerBand || candles[i - 1].close < lowerBand ? newLower : lowerBand);
    if (c.close > upperBand) upTrend = true;
    else if (c.close < lowerBand) upTrend = false;
  }
  const trendLine = upTrend ? lowerBand : upperBand;
  const dist = Math.abs(price - trendLine) / price * 100;
  const conf = Math.min(92, 68 + dist * 3);
  if (upTrend) return { direction: 'BUY', value: trendLine, confidence: Math.round(conf) };
  return { direction: 'SELL', value: trendLine, confidence: Math.round(conf) };
}

// ─── INDICATOR 20: ELDER RAY ──────────────────────────────────────────────

export function elderRaySignal(candles: MarketCandle[], period = 13): IndicatorVote {
  if (candles.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const closes = candles.map(c => c.close);
  const emaVals = ema(closes, period);
  const lastEMA = emaVals[emaVals.length - 1];
  const prevEMA = emaVals[emaVals.length - 2];
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const bullPower = last.high - lastEMA;
  const bearPower = last.low - lastEMA;
  const prevBull = prev.high - prevEMA;
  const prevBear = prev.low - prevEMA;
  const bullRising = bullPower > prevBull;
  const bearRising = bearPower > prevBear;
  if (bearPower < 0 && bearRising && closes[closes.length - 1] > lastEMA)
    return { direction: 'BUY', value: bullPower, confidence: 82 };
  if (bearPower < 0 && bearRising)
    return { direction: 'BUY', value: bullPower, confidence: 68 };
  if (bullPower > 0 && !bullRising && closes[closes.length - 1] < lastEMA)
    return { direction: 'SELL', value: bearPower, confidence: 82 };
  if (bullPower > 0 && !bullRising)
    return { direction: 'SELL', value: bearPower, confidence: 68 };
  if (bullPower < 0 && bearPower < 0) return { direction: 'SELL', value: bearPower, confidence: 60 };
  if (bullPower > 0 && bearPower > 0) return { direction: 'BUY', value: bullPower, confidence: 60 };
  return { direction: 'NEUTRAL', value: bullPower, confidence: 0 };
}

// ─── INDICATOR 21: CHANDE MOMENTUM OSCILLATOR ─────────────────────────────

export function cmoSignal(closes: number[], period = 14): IndicatorVote {
  if (closes.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  let upSum = 0;
  let downSum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) upSum += diff;
    else downSum += Math.abs(diff);
  }
  const cmo = upSum + downSum === 0 ? 0 : ((upSum - downSum) / (upSum + downSum)) * 100;
  const prevUpSum = { v: 0 };
  const prevDownSum = { v: 0 };
  for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) prevUpSum.v += diff;
    else prevDownSum.v += Math.abs(diff);
  }
  const prevCMO = prevUpSum.v + prevDownSum.v === 0 ? 0 :
    ((prevUpSum.v - prevDownSum.v) / (prevUpSum.v + prevDownSum.v)) * 100;
  const conf = Math.min(92, 58 + Math.abs(cmo) * 0.5);
  if (cmo > 50) return { direction: 'BUY', value: cmo, confidence: Math.round(conf) };
  if (cmo > 20) return { direction: 'BUY', value: cmo, confidence: 62 };
  if (cmo > 0 && prevCMO < 0) return { direction: 'BUY', value: cmo, confidence: 72 };
  if (cmo < -50) return { direction: 'SELL', value: cmo, confidence: Math.round(conf) };
  if (cmo < -20) return { direction: 'SELL', value: cmo, confidence: 62 };
  if (cmo < 0 && prevCMO > 0) return { direction: 'SELL', value: cmo, confidence: 72 };
  return { direction: 'NEUTRAL', value: cmo, confidence: 0 };
}

// ─── INDICATOR 22: MA RIBBON (5/8/13/21/34/55 EMA) ────────────────────────

export function maRibbonSignal(closes: number[]): IndicatorVote {
  if (closes.length < 60) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const periods = [5, 8, 13, 21, 34, 55];
  const emaValues = periods.map(p => {
    const e = ema(closes, p);
    return { period: p, current: e[e.length - 1], prev: e[e.length - 2] };
  });
  let bullCount = 0;
  let bearCount = 0;
  let aligned = true;
  for (let i = 0; i < emaValues.length - 1; i++) {
    if (emaValues[i].current > emaValues[i + 1].current) bullCount++;
    else { bearCount++; aligned = false; }
  }
  const rising = emaValues.every(e => e.current > e.prev);
  const falling = emaValues.every(e => e.current < e.prev);
  const spread = (emaValues[0].current - emaValues[emaValues.length - 1].current) / emaValues[emaValues.length - 1].current * 100;
  const conf = Math.min(95, 65 + Math.abs(spread) * 5);
  if (bullCount === 5 && rising) return { direction: 'BUY', value: spread, confidence: Math.round(conf) };
  if (bullCount === 5) return { direction: 'BUY', value: spread, confidence: 72 };
  if (bullCount >= 4 && rising) return { direction: 'BUY', value: spread, confidence: 65 };
  if (bearCount === 5 && falling) return { direction: 'SELL', value: spread, confidence: Math.round(conf) };
  if (bearCount === 5) return { direction: 'SELL', value: spread, confidence: 72 };
  if (bearCount >= 4 && falling) return { direction: 'SELL', value: spread, confidence: 65 };
  return { direction: 'NEUTRAL', value: spread, confidence: 0 };
}

// ─── INDICATOR 23: TRIX ────────────────────────────────────────────────────

export function trixSignal(closes: number[], period = 15): IndicatorVote {
  if (closes.length < period * 4) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const ema1 = ema(closes, period);
  const ema2 = ema(ema1, period);
  const ema3 = ema(ema2, period);
  const trixLine = ema3.map((v, i, arr) => i === 0 ? 0 : ((v - arr[i - 1]) / (arr[i - 1] + 1e-10)) * 100);
  const signalLine = sma(trixLine.slice(-9), 9);
  const trixLast = trixLine[trixLine.length - 1];
  const trixPrev = trixLine[trixLine.length - 2];
  const sigLast = signalLine[signalLine.length - 1] ?? 0;
  const sigPrev = signalLine[signalLine.length - 2] ?? sigLast;
  const crossAbove = trixPrev < sigPrev && trixLast > sigLast;
  const crossBelow = trixPrev > sigPrev && trixLast < sigLast;
  if (crossAbove) return { direction: 'BUY', value: trixLast, confidence: 85 };
  if (crossBelow) return { direction: 'SELL', value: trixLast, confidence: 85 };
  if (trixLast > 0 && trixLast > trixPrev) return { direction: 'BUY', value: trixLast, confidence: 62 };
  if (trixLast < 0 && trixLast < trixPrev) return { direction: 'SELL', value: trixLast, confidence: 62 };
  return { direction: 'NEUTRAL', value: trixLast, confidence: 0 };
}

// ─── INDICATOR 24: SQUEEZE MOMENTUM (TTM) ─────────────────────────────────

export function squeezeMomentumSignal(candles: MarketCandle[], period = 20): IndicatorVote {
  if (candles.length < period + 5) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const closes = candles.map(c => c.close);
  const recent = closes.slice(-period);
  const mid = avg(recent);
  const sd = stdDev(recent);
  const bbUpper = mid + 2 * sd;
  const bbLower = mid - 2 * sd;
  const atrPeriod = candles.slice(-period);
  const trs = atrPeriod.slice(1).map((c, i) => Math.max(
    c.high - c.low,
    Math.abs(c.high - atrPeriod[i].close),
    Math.abs(c.low - atrPeriod[i].close)
  ));
  const atrVal = avg(trs);
  const keltnerUpper = mid + 1.5 * atrVal;
  const keltnerLower = mid - 1.5 * atrVal;
  const squeezeOn = bbUpper < keltnerUpper && bbLower > keltnerLower;
  const highestHigh = Math.max(...candles.slice(-period).map(c => c.high));
  const lowestLow = Math.min(...candles.slice(-period).map(c => c.low));
  const midHL = (highestHigh + lowestLow) / 2;
  const delta = closes[closes.length - 1] - (mid + midHL) / 2;
  const prevDelta = closes[closes.length - 2] - avg(closes.slice(-period - 1, -1));
  if (!squeezeOn && delta > 0 && delta > prevDelta)
    return { direction: 'BUY', value: delta, confidence: 88 };
  if (!squeezeOn && delta < 0 && delta < prevDelta)
    return { direction: 'SELL', value: delta, confidence: 88 };
  if (!squeezeOn && delta > 0)
    return { direction: 'BUY', value: delta, confidence: 70 };
  if (!squeezeOn && delta < 0)
    return { direction: 'SELL', value: delta, confidence: 70 };
  return { direction: 'NEUTRAL', value: delta, confidence: 0 };
}

// ─── INDICATOR 25: KELTNER CHANNEL ────────────────────────────────────────

export function keltnerChannelSignal(candles: MarketCandle[], period = 20, mult = 2): IndicatorVote {
  if (candles.length < period + 2) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const closes = candles.map(c => c.close);
  const emaVals = ema(closes, period);
  const lastEMA = emaVals[emaVals.length - 1];
  const trs = candles.slice(1).map((c, i) => Math.max(
    c.high - c.low,
    Math.abs(c.high - candles[i].close),
    Math.abs(c.low - candles[i].close)
  ));
  const atrVals: number[] = [avg(trs.slice(0, period))];
  for (let i = period; i < trs.length; i++) {
    atrVals.push((atrVals[atrVals.length - 1] * (period - 1) + trs[i]) / period);
  }
  const lastATR = atrVals[atrVals.length - 1];
  const upper = lastEMA + mult * lastATR;
  const lower = lastEMA - mult * lastATR;
  const price = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 2];
  const pos = (price - lower) / (upper - lower);
  const prevPos = (prevPrice - (emaVals[emaVals.length - 2] - mult * (atrVals[atrVals.length - 2] ?? lastATR))) /
    ((upper - lower) || 1);
  if (price > upper) return { direction: 'BUY', value: pos, confidence: 88 };
  if (price < lower) return { direction: 'SELL', value: pos, confidence: 88 };
  if (pos > 0.75 && prevPos < 0.75) return { direction: 'BUY', value: pos, confidence: 70 };
  if (pos < 0.25 && prevPos > 0.25) return { direction: 'SELL', value: pos, confidence: 70 };
  if (pos > 0.65) return { direction: 'BUY', value: pos, confidence: 58 };
  if (pos < 0.35) return { direction: 'SELL', value: pos, confidence: 58 };
  return { direction: 'NEUTRAL', value: pos, confidence: 0 };
}

// ─── INDICATOR 26: PIVOT POINTS ───────────────────────────────────────────

export function pivotPointsSignal(candles: MarketCandle[]): IndicatorVote {
  if (candles.length < 5) return { direction: 'NEUTRAL', value: 0, confidence: 0 };
  const prev = candles[candles.length - 2];
  const pivot = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * pivot - prev.low;
  const s1 = 2 * pivot - prev.high;
  const r2 = pivot + (prev.high - prev.low);
  const s2 = pivot - (prev.high - prev.low);
  const price = candles[candles.length - 1].close;
  const distToR1 = Math.abs(price - r1) / price * 100;
  const distToS1 = Math.abs(price - s1) / price * 100;
  const distToR2 = Math.abs(price - r2) / price * 100;
  const distToS2 = Math.abs(price - s2) / price * 100;
  if (price >= r2) return { direction: 'SELL', value: pivot, confidence: 88 };
  if (price >= r1 && distToR1 < 0.3) return { direction: 'SELL', value: pivot, confidence: 78 };
  if (price <= s2) return { direction: 'BUY', value: pivot, confidence: 88 };
  if (price <= s1 && distToS1 < 0.3) return { direction: 'BUY', value: pivot, confidence: 78 };
  if (price > pivot && price < r1) return { direction: 'BUY', value: pivot, confidence: 58 };
  if (price < pivot && price > s1) return { direction: 'SELL', value: pivot, confidence: 58 };
  return { direction: 'NEUTRAL', value: pivot, confidence: 0 };
}

// ─── MASTER ANALYSIS ──────────────────────────────────────────────────────

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
    hma: hmaSignal(closes),
    vwap: vwapSignal(candles),
    supertrend: supertrendSignal(candles),
    elderRay: elderRaySignal(candles),
    cmo: cmoSignal(closes),
    maRibbon: maRibbonSignal(closes),
    trix: trixSignal(closes),
    squeezeMomentum: squeezeMomentumSignal(candles),
    keltnerChannel: keltnerChannelSignal(candles),
    pivotPoints: pivotPointsSignal(candles),
  };
}
