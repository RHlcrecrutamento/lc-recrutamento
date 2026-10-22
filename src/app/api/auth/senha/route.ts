import { cookies } from 'next/headers';
import { db, audit } from '@/lib/db';
import { requireUser, getClientIp, hashPassword, verifyPassword, SESSION_COOKIE } from '@/lib/auth';
import { ok, fail, readJson, handleApiError } from '@/lib/http';
import { assertSameOrigin, limit, validPassword, PASSWORD_RULE } from '@/lib/access-security';
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    await limit('change-password', user.id, 6, 15);
    const b = await readJson(req, 4000);
    const current = String(b.current || '');
    const password = String(b.password || '');
    if (!validPassword(password)) return fail(PASSWORD_RULE);
    if (current === password) return fail('Escolha uma senha diferente da atual.');
    const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (Buffer.byteLength(current, 'utf8') > 72 || !verifyPassword(current, row.password_hash)) return fail('Senha atual incorreta.', 400);
    const nextHash = hashPassword(password);
    await db.transaction(async () => {
      const updated = await db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ? AND password_hash = ?")
        .run(nextHash, user.id, row.password_hash);
      if (!updated.changes) { const e: any = new Error('Sua senha foi alterada em outra sessão. Entre novamente.'); e.status = 409; throw e; }
      await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    })();
    (await cookies()).delete(SESSION_COOKIE);
    await audit(user.id, 'senha_alterada', 'users', user.id, undefined, await getClientIp());
    return ok({ msg: 'Senha alterada. Todas as sessões foram encerradas. Entre novamente.' });
  } catch (e) { return handleApiError(e); }
}
