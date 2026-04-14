import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable, indicatorWeightsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { signJwt, hashPassword, comparePassword, requireAuth, type AuthRequest } from '../auth';
import { INDICATOR_NAMES } from '../mlEngine';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });
    if (username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing.length > 0) return res.status(400).json({ message: 'Username already taken' });

    const isFirst = (await db.select().from(usersTable)).length === 0;
    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(usersTable).values({
      username,
      passwordHash,
      role: isFirst ? 'admin' : 'user',
    }).returning();

    // Global weights are shared — no per-user seeding needed

    const token = signJwt({ id: user.id, username: user.username, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
    });
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid username or password' });

    const token = signJwt({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json(req.user);
});

// Change own password (requires current password)
authRouter.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    console.error('[Auth] Change password error:', err);
    res.status(500).json({ message: err.message || 'Failed to change password' });
  }
});
