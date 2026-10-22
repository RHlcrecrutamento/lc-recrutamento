import { db } from '@/lib/db';
import { fail, ok, readJson, handleApiError } from '@/lib/http';
import { getClientIp } from '@/lib/auth';
import { assertSameOrigin, limit, mailConfigured, sendPasswordLink } from '@/lib/access-security';
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const b = await readJson(req, 4000);
    const email = String(b.email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Informe um e-mail válido.');
    await limit('recover-ip', await getClientIp(), 20, 60);
    await limit('recover-email', email, 3, 60);
    if (!mailConfigured()) return fail('Recuperação por e-mail ainda não configurada. Solicite ajuda à equipe Triatalent.', 503);
    const user = await db.prepare('SELECT id, email, password_hash FROM users WHERE lower(email) = ? AND active = 1').get(email);
    if (user) {
      try { await sendPasswordLink(user); }
      catch { console.error('Falha de entrega na recuperação de senha.'); }
    }
    // Mesma resposta para conta existente e inexistente; não confirma entrega.
    return ok({ msg: 'Se houver uma conta ativa com esse e-mail e o serviço aceitar o envio, você receberá um link válido por 30 minutos. Verifique também o spam. Se não chegar, procure a equipe.' });
  } catch (e) { return handleApiError(e); }
}
