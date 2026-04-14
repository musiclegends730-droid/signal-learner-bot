import { Router } from 'express';
import { db } from '@workspace/db';
import { signalsTable, indicatorWeightsTable } from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../auth';
import { generateSignal, computeWeightUpdates, INDICATOR_NAMES, type WeightMap } from '../mlEngine';
import { SUPPORTED_ASSETS } from '../marketData';

export const signalsRouter = Router();
signalsRouter.use(requireAuth);

// Ensure all indicator weight rows exist for a user (handles new indicators added later)
async function ensureWeightsExist(userId: number) {
  const existing = await db.select().from(indicatorWeightsTable).where(eq(indicatorWeightsTable.userId, userId));
  const existingNames = new Set(existing.map(r => r.name));
  const missing = INDICATOR_NAMES.filter(n => !existingNames.has(n));
  if (missing.length > 0) {
    await db.insert(indicatorWeightsTable).values(
      missing.map(name => ({ userId, name, weight: '1.0', correctPredictions: 0, totalPredictions: 0 }))
    );
  }
}

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
    const signals = await db.select().from(signalsTable).where(eq(signalsTable.userId, req.user!.id));
    const weights = await db.select().from(indicatorWeightsTable).where(eq(indicatorWeightsTable.userId, req.user!.id));

    const wins = signals.filter(s => s.result === 'WIN').length;
    const losses = signals.filter(s => s.result === 'LOSS').length;
    const decided = wins + losses;

    // Return as decimal 0-1 so frontend can multiply by 100
    const winRate = decided === 0 ? 0 : wins / decided;

    const closedSignals = signals.filter(s => s.result !== 'PENDING');
    const currentConfidence = closedSignals.length > 0
      ? closedSignals.reduce((a, s) => a + s.confidence, 0) / closedSignals.length
      : signals.length > 0
        ? signals.reduce((a, s) => a + s.confidence, 0) / signals.length
        : 0;

    res.json({
      totalSignals: signals.length,
      wins,
      losses,
      winRate: Math.round(winRate * 10000) / 10000,
      currentConfidence: Math.round(currentConfidence),
      indicatorWeights: weights,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

signalsRouter.get('/weights', async (req: AuthRequest, res) => {
  try {
    await ensureWeightsExist(req.user!.id);
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

    await ensureWeightsExist(req.user!.id);

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
    if (signal.result !== 'PENDING') return res.status(400).json({ message: 'Signal result already set' });

    const [updated] = await db
      .update(signalsTable)
      .set({ result })
      .where(eq(signalsTable.id, id))
      .returning();

    if (signal.indicators) {
      await ensureWeightsExist(req.user!.id);
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
        const indicatorVote = (signal.indicators as any)[name];
        const isCorrect =
          (result === 'WIN' && indicatorVote?.direction === signal.action) ||
          (result === 'LOSS' && indicatorVote?.direction !== signal.action && indicatorVote?.direction !== 'NEUTRAL');
        if (row) {
          await db.update(indicatorWeightsTable)
            .set({
              weight: String(newWeights[name as keyof WeightMap] ?? row.weight),
              correctPredictions: isCorrect ? row.correctPredictions + 1 : row.correctPredictions,
              totalPredictions: row.totalPredictions + 1,
              updatedAt: new Date(),
            })
            .where(eq(indicatorWeightsTable.id, row.id));
        } else {
          await db.insert(indicatorWeightsTable).values({
            userId: req.user!.id,
            name,
            weight: String(newWeights[name as keyof WeightMap] ?? 1.0),
            correctPredictions: isCorrect ? 1 : 0,
            totalPredictions: 1,
          });
        }
      }
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[Signal] Update result error:', err);
    res.status(500).json({ message: err.message });
  }
});
