/**
 * Autenticação e sessões (cookies httpOnly + tabela sessions).
 * Senhas com bcrypt. Nenhuma chave secreta sai do servidor.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { db, id, audit } from './db';

export const SESSION_COOKIE = 'lc_session';
const SESSION_DAYS = 7;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}
export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECRUTADOR' | 'CLIENTE' | 'CANDIDATO';
  company_id: string | null;
  candidate_id: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id('ses'), userId, hashToken(token), expires, await getClientIp(), ((await headers()).get('user-agent') || '').slice(0, 250));
  await db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(userId);
  return token;
}

export async function destroySession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.company_id, u.candidate_id, u.city, u.state, u.phone, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND u.active = 1`
    )
    .get(hashToken(token)) as (SessionUser & { expires_at: string }) | undefined;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    return null;
  }
  return row;
}

export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (h.get('x-forwarded-for') || h.get('x-real-ip') || 'local').split(',')[0].trim().slice(0, 60);
  } catch {
    return 'local';
  }
}

export async function requireUser(roles?: SessionUser['role'][]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const err: any = new Error('Não autenticado');
    err.status = 401;
    throw err;
  }
  if (roles && !roles.includes(user.role)) {
    const err: any = new Error('Sem permissão para esta ação');
    err.status = 403;
    throw err;
  }
  return user;
}

export async function logLogin(userId: string, ok: boolean, email?: string) {
  await audit(userId || null, ok ? 'login_sucesso' : 'login_falha', 'users', userId || undefined, ok ? undefined : { email: email?.slice(0, 3) + '***' }, await getClientIp());
}
