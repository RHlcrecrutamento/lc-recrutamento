import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail, readJson, handleApiError } from '@/lib/http';
import { assertSameOrigin, limit, mailConfigured, sendPasswordLink } from '@/lib/access-security';
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const admin = await requireUser(['ADMIN']);
    await limit('invite-admin', admin.id, 20, 60);
    const b = await readJson(req, 4000);
    const user = await db.prepare('SELECT id, email, password_hash, role FROM users WHERE id = ? AND active = 1').get(String(b.id || ''));
    if (!user) return fail('Conta ativa não encontrada.', 404);
    if (user.role !== 'CLIENTE') return fail('Este convite é exclusivo para empresas.', 400);
    if (!mailConfigured()) return fail('Configure o serviço de e-mail antes de enviar convites.', 503);
    await limit('invite-user', user.id, 3, 60);
    try { await sendPasswordLink(user, true); }
    catch { return fail('O serviço de e-mail não aceitou o envio. Confira a configuração.', 502); }
    return ok({ msg: 'Convite aceito pelo serviço de e-mail. O link permite definir a senha e expira em 30 minutos.' });
  } catch (e) { return handleApiError(e); }
}
