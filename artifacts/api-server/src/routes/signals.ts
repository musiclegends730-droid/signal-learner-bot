import { Router } from 'express';
import { db } from '@workspace/db';
import { signalsTable, indicatorWeightsTable } from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../auth';
import { generateSignal, computeWeightUpdates, INDICATOR_NAMES, type WeightMap } from '../mlEngine';
import { ensureGlobalWeightsExist, getGlobalUserId } from '../globalModel';

export const signalsRouter = Router();
signalsRouter.use(requireAuth);

// Fetch global weights as a WeightMap
async function getGlobalWeights(): Promise<{ rows: any[]; map: WeightMap }> {
  await ensureGlobalWeightsExist();
  const gId = await getGlobalUserId();
  const rows = await db.select().from(indicatorWeightsTable).where(eq(indicatorWeightsTable.userId, gId));
  const map: WeightMap = Object.fromEntries(
    INDICATOR_NAMES.map(n => {
      const row = rows.find(r => r.name === n);
      return [n, row ? parseFloat(String(row.weight)) : 1.0];
    })
  ) as WeightMap;
  return { rows, map };
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
    const { rows: weights } = await getGlobalWeights();

    const wins = signals.filter(s => s.result === 'WIN').length;
    const losses = signals.filter(s => s.result === 'LOSS').length;
    const decided = wins + losses;
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
    const { rows } = await getGlobalWeights();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

signalsRouter.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { asset, timeframe = '5m' } = req.body;
    if (!asset) return res.status(400).json({ message: 'Asset is required' });

    const { map: weights } = await getGlobalWeights();
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

    // Update the global shared model weights
    if (signal.indicators) {
      const { rows: weightsRows, map: currentWeights } = await getGlobalWeights();
      const gId = await getGlobalUserId();

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
            .where(and(eq(indicatorWeightsTable.id, row.id), eq(indicatorWeightsTable.userId, gId)));
        }
      }
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[Signal] Update result error:', err);
    res.status(500).json({ message: err.message });
  }
});
