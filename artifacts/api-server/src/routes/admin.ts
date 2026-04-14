import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable, signalsTable, indicatorWeightsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin, hashPassword, type AuthRequest } from '../auth';

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
      // Return as decimal 0-1 so frontend can multiply by 100
      const winRate = decided === 0 ? 0 : wins / decided;
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        signalCount: userSignals.length,
        winRate: Math.round(winRate * 10000) / 10000,
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
    if (id === req.user!.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, message: `User ${user.username} deleted` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Admin reset a user's password
adminRouter.post('/users/:id/reset-password', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));

    res.json({ success: true, message: `Password reset for ${user.username}` });
  } catch (err: any) {
    console.error('[Admin] Reset password error:', err);
    res.status(500).json({ message: err.message || 'Failed to reset password' });
  }
});
