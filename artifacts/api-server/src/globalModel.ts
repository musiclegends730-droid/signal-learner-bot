/**
 * Global shared AI model — one model for all users.
 * Weights are stored under a hidden system user so the FK constraint is satisfied.
 */
import { db } from '@workspace/db';
import { usersTable, indicatorWeightsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { hashPassword } from './auth';
import { INDICATOR_NAMES } from './mlEngine';

const SYSTEM_USERNAME = '__system__';
let _globalUserId: number | null = null;

export async function getGlobalUserId(): Promise<number> {
  if (_globalUserId !== null) return _globalUserId;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, SYSTEM_USERNAME));
  if (existing) {
    _globalUserId = existing.id;
    return _globalUserId;
  }
  // Create the system user with an unguessable password
  const pw = await hashPassword(Math.random().toString(36) + Date.now().toString(36) + Math.random().toString(36));
  const [created] = await db.insert(usersTable).values({
    username: SYSTEM_USERNAME,
    passwordHash: pw,
    role: 'system',
  }).returning();
  _globalUserId = created.id;
  return _globalUserId;
}

export async function ensureGlobalWeightsExist(): Promise<void> {
  const gId = await getGlobalUserId();
  const existing = await db.select().from(indicatorWeightsTable).where(eq(indicatorWeightsTable.userId, gId));
  const existingNames = new Set(existing.map(r => r.name));
  const missing = INDICATOR_NAMES.filter(n => !existingNames.has(n));
  if (missing.length > 0) {
    await db.insert(indicatorWeightsTable).values(
      missing.map(name => ({ userId: gId, name, weight: '1.0', correctPredictions: 0, totalPredictions: 0 }))
    );
  }
}
