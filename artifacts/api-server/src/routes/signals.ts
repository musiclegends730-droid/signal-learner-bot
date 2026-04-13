import { Router } from 'express';
import { db } from '@workspace/db';
import { signalsTable, indicatorWeightsTable } from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../auth';
import { generateSignal, computeWeightUpdates, INDICATOR_NAMES, type WeightMap } from '../mlEngine';
import { SUPPORTED_ASSETS } from '../marketData';

export const signalsRouter = Router();
signalsRouter.use(requireAuth);

signalsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const signals = await db
      .select()
      .from(signalsTable)
      .where(eq(signalsTable.userId, req.user!.id))
      .orderBy(desc(signalsTable.createdAt))
      .limit(100);
    res.json(signals);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

signalsRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const signals = await db
      .select()
      .from(signalsTable)
      .where(eq(signalsTable.userId, req.user!.id));
    const weights = await db
      .select()
      .from(indicatorWeightsTable)
      .where(eq(indicatorWeightsTable.userId, req.user!.id));

    const wins = signals.filter(s => s.result === 'WIN').length;
    const losses = signals.filter(s => s.result === 'LOSS').length;
    const decided = wins + losses;
    const winRate = decided === 0 ? 0 : (wins / decided) * 100;

    const pendingSignals = signals.filter(s => s.result === 'PENDING');
    const currentConfidence = pendingSignals.length > 0
      ? pendingSignals.reduce((a, s) => a + s.confidence, 0) / pendingSignals.length
      : 0;

    res.json({
      totalSignals: signals.length,
      wins,
      losses,
      winRate: Math.round(winRate * 10) / 10,
      currentConfidence: Math.round(currentConfidence),
      indicatorWeights: weights,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

signalsRouter.get('/weights', async (req: AuthRequest, res) => {
  try {
    const weights = await db
      .select()
      .from(indicatorWeightsTable)
      .where(eq(indicatorWeightsTable.userId, req.user!.id));
    res.json(weights);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

signalsRouter.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { asset, timeframe = '5m' } = req.body;
    if (!asset) return res.status(400).json({ message: 'Asset is required' });

    const weightsRows = await db
      .select()
      .from(indicatorWeightsTable)
      .where(eq(indicatorWeightsTable.userId, req.user!.id));

    const weights: WeightMap = Object.fromEntries(
      INDICATOR_NAMES.map(n => {
        const row = weightsRows.find(r => r.name === n);
        return [n, row ? parseFloat(String(row.weight)) : 1.0];
      })
    ) as WeightMap;

    const decision = await generateSignal(asset, timeframe, weights);

    const [signal] = await db.insert(signalsTable).values({
      userId: req.user!.id,
      asset,
      action: decision.action,
      price: decision.price.toFixed(5),
      confidence: decision.confidence,
      result: 'PENDING',
      indicators: decision.indicators as any,
      timeframe,
    }).returning();

    res.status(201).json(signal);
  } catch (err: any) {
    console.error('[Signal] Generate error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate signal' });
  }
});

signalsRouter.patch('/:id/result', async (req: AuthRequest, res) => {
  try {
    const { result } = req.body;
    const id = Number(req.params.id);
    if (!['WIN', 'LOSS'].includes(result)) {
      return res.status(400).json({ message: 'Result must be WIN or LOSS' });
    }

    const [signal] = await db
      .select()
      .from(signalsTable)
      .where(and(eq(signalsTable.id, id), eq(signalsTable.userId, req.user!.id)));

    if (!signal) return res.status(404).json({ message: 'Signal not found' });

    const [updated] = await db
      .update(signalsTable)
      .set({ result })
      .where(eq(signalsTable.id, id))
      .returning();

    if (signal.indicators) {
      const weightsRows = await db
        .select()
        .from(indicatorWeightsTable)
        .where(eq(indicatorWeightsTable.userId, req.user!.id));

      const currentWeights: WeightMap = Object.fromEntries(
        INDICATOR_NAMES.map(n => {
          const row = weightsRows.find(r => r.name === n);
          return [n, row ? parseFloat(String(row.weight)) : 1.0];
        })
      ) as WeightMap;

      const newWeights = computeWeightUpdates(
        signal.indicators as any,
        signal.action as 'BUY' | 'SELL',
        result,
        currentWeights
      );

      for (const name of INDICATOR_NAMES) {
        const row = weightsRows.find(r => r.name === name);
        const isCorrect = (result === 'WIN' && (signal.indicators as any)[name]?.direction === signal.action) ||
          (result === 'LOSS' && (signal.indicators as any)[name]?.direction !== signal.action &&
            (signal.indicators as any)[name]?.direction !== 'NEUTRAL');
        if (row) {
          await db.update(indicatorWeightsTable)
            .set({
              weight: String(newWeights[name]),
              correctPredictions: isCorrect ? row.correctPredictions + 1 : row.correctPredictions,
              totalPredictions: row.totalPredictions + 1,
              updatedAt: new Date(),
            })
            .where(eq(indicatorWeightsTable.id, row.id));
        }
      }
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[Signal] Update result error:', err);
    res.status(500).json({ message: err.message });
  }
});
