import { validPassword, PASSWORD_RULE, assertSameOrigin } from '@/lib/access-security';
/** Gestão de usuários (admin) e reembolso de pedidos. */
import { db, id, audit, now } from '@/lib/db';
import { getSessionUser, getClientIp, hashPassword } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { refundOrder } from '@/lib/payments';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const rows = await db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.city, u.state, u.active, u.blocked_reason,
                u.last_login, u.created_at, c.name AS company_name
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
         ORDER BY u.created_at DESC`
      )
      .all();
    return ok(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const role = String(b.role || '');
    if (name.length < 3) return fail('Nome inválido.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('E-mail inválido.', 400);
    if (!validPassword(password)) return fail(PASSWORD_RULE, 400);
    if (!['ADMIN', 'RECRUTADOR', 'CLIENTE'].includes(role)) return fail('Perfil inválido.', 400);
    if (await db.prepare('SELECT id FROM users WHERE lower(email)=lower(?)').get(email)) return fail('E-mail já cadastrado.', 409);
    if (role === 'CLIENTE' && !b.company_id) return fail('Cliente precisa de empresa vinculada.', 400);

    const userId = id('usr');
    await db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, phone, city, state, company_id) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(userId, name, email, hashPassword(password), role, String(b.phone || ''), String(b.city || ''), String(b.state || ''), b.company_id || null);
    await audit(user.id, 'usuario_criado', 'users', userId, { role }, await getClientIp());
    return ok({ id: userId }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const b = await readJson(req);
    const targetId = String(b.id || '');
    const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!target) return fail('Usuário não encontrado.', 404);

    if (b.action === 'ativar' || b.action === 'bloquear') {
      const active = b.action === 'ativar' ? 1 : 0;
      await db.prepare(`UPDATE users SET active = ?, blocked_reason = ?, updated_at = datetime('now') WHERE id = ?`).run(
        active, active ? null : String(b.motivo || 'Bloqueado pelo administrador'), targetId
      );
      if (!active) await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
      await audit(user.id, active ? 'usuario_ativado' : 'usuario_bloqueado', 'users', targetId, { motivo: b.motivo }, await getClientIp());
      return ok({ msg: active ? 'Usuário ativado.' : 'Usuário bloqueado.' });
    }

    if (b.action === 'resetar_senha') {
      const nova = String(b.password || '');
      if (!validPassword(nova)) return fail(PASSWORD_RULE, 400);
      await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hashPassword(nova), targetId);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
      await audit(user.id, 'senha_resetada', 'users', targetId, undefined, await getClientIp());
      return ok({ msg: 'Senha redefinida e sessões encerradas.' });
    }

    return fail('Ação inválida.', 400);
  } catch (e) {
    return handleApiError(e);
  }
}
