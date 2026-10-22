import { assertSameOrigin, limit } from '@/lib/access-security';
import { getClientIp } from '@/lib/auth';
import { db, audit } from '@/lib/db';
import { verifyPassword, createSession, SESSION_COOKIE, logLogin, hashPassword } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await limit('login-ip', await getClientIp(), 50, 15);
    const body = await readJson(req, 4000);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return fail('Informe e-mail e senha.', 400);

    if (email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) return fail('E-mail ou senha incorretos.', 401);
    await limit('login-email', email, 10, 15);
    const portal = String(body.portal || '');
    const portals: Record<string, string[]> = { empresa: ['CLIENTE'], candidato: ['CANDIDATO'], equipe: ['ADMIN', 'RECRUTADOR'] };
    if (portal && !portals[portal]) return fail('Acesso inválido.', 400);

    const user = await db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      await logLogin(user?.id || '', false, email);
      return fail('E-mail ou senha incorretos.', 401);
    }
    if (!user.active) {
      return fail(`Conta inativa. ${user.blocked_reason ? 'Motivo: ' + user.blocked_reason : ''}`, 403);
    }

    if (portal && !portals[portal].includes(user.role)) {
      await logLogin(user.id, false, email);
      return fail('Esta conta pertence a outro perfil. Escolha a entrada correta.', 403);
    }
    const token = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https'),
      path: '/',
      maxAge: 7 * 86400,
    });
    await logLogin(user.id, true);
    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      candidate_id: user.candidate_id,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
