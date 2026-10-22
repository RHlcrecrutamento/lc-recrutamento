/** Reembolso administrativo — revoga o desbloqueio. */
import { audit } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { refundOrder } from '@/lib/payments';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return fail('Somente administradores.', 403);
    const b = await readJson(req);
    await refundOrder(String(b.order_id || ''), user.id);
    await audit(user.id, 'reembolso_processado', 'orders', String(b.order_id), undefined, await getClientIp());
    return ok({ msg: 'Pedido reembolsado e desbloqueio revogado.' });
  } catch (e) {
    return handleApiError(e);
  }
}
