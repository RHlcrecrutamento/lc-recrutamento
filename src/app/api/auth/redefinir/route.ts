import { db, audit } from '@/lib/db';
import { hashPassword, getClientIp } from '@/lib/auth';
import { ok, fail, readJson, handleApiError } from '@/lib/http';
import { assertSameOrigin, limit, digest, validPassword, PASSWORD_RULE } from '@/lib/access-security';
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await limit('reset-ip', await getClientIp(), 20, 15);
    const b = await readJson(req, 4000);
    const token = String(b.token || '');
    const password = String(b.password || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return fail('Link inválido ou expirado. Solicite outro.');
    if (!validPassword(password)) return fail(PASSWORD_RULE);
    const passwordHash = hashPassword(password);
    const userId = await db.transaction(async () => {
      const reset = await db.prepare(`SELECT * FROM password_resets WHERE token_hash = ? FOR UPDATE`).get(digest(token));
      if (!reset || reset.expires_at <= new Date().toISOString()) return null;
      // Comparação com hash emitido invalida links antigos após qualquer troca de senha.
      const result = await db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ? AND active = 1 AND password_hash = ?`).run(passwordHash, reset.user_id, reset.password_hash_at_issue);
      if (!result.changes) return null;
      await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(reset.user_id);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(reset.user_id);
      return reset.user_id;
    })();
    if (!userId) return fail('Link inválido ou expirado. Solicite outro.');
    await audit(userId, 'senha_redefinida_link', 'users', userId, undefined, await getClientIp());
    return ok({ msg: 'Senha redefinida. Entre novamente com sua nova senha.' });
  } catch (e) { return handleApiError(e); }
}
