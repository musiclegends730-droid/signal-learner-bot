import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable, signalsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin, type AuthRequest } from '../auth';

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    const allSignals = await db.select().from(signalsTable);

    const result = users.map(u => {
      const userSignals = allSignals.filter(s => s.userId === u.id);
      const wins = userSignals.filter(s => s.result === 'WIN').length;
      const losses = userSignals.filter(s => s.result === 'LOSS').length;
      const decided = wins + losses;
      const winRate = decided === 0 ? 0 : Math.round((wins / decided) * 1000) / 10;
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        signalCount: userSignals.length,
        winRate,
        createdAt: u.createdAt,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, message: `User ${user.username} deleted` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
