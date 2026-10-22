/**
 * CONFIRMADOR DE PAGAMENTO — MODO DEMONSTRAÇÃO.
 * Só funciona quando "demo_payments" está ativo em Administração.
 * Use para testar o fluxo completo sem credenciais do Mercado Pago.
 * Em produção com Mercado Pago configurado, desative o modo demonstração.
 */
import { localDemoAllowed } from '@/lib/payment-rules';
import { db, audit, getSetting, id } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { approvePayment, rejectPayment } from '@/lib/payments';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'CLIENTE') return fail('Acesso restrito.', 403);
    if (!localDemoAllowed() || !await getSetting<boolean>('demo_payments')) {
      return fail('Modo demonstração de pagamentos está desativado. Configure o Mercado Pago.', 403);
    }
    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get((await params).id) as any;
    if (!order) return fail('Pedido não encontrado.', 404);
    if(order.gateway !== 'demo') return fail('Pedido não é demonstrativo.',403);
    if (order.company_id !== user.company_id) return fail('Este pedido não pertence à sua empresa.', 403);

    const b = await readJson(req);
    const acao = String(b.acao || ''); // aprovar | recusar | cancelar

    if (acao === 'aprovar') {
      const result = await approvePayment({
        orderId: order.id,
        gatewayPaymentId: `demo_${order.id}_${Date.now()}`,
        paidAmountCents: order.amount_cents,
        currency: 'BRL',
        source: 'demo',
        rawPayload: { modo: 'demonstracao', usuario: user.id },
        ip: await getClientIp(),
      });
      return result.ok ? ok(result) : fail(result.message, 409);
    }
    if (acao === 'recusar' || acao === 'cancelar') {
      await rejectPayment(order.id, `Ação manual (${acao}) em modo demonstração`, 'demo');
      await audit(user.id, 'pagamento_demo_' + acao, 'orders', order.id);
      return ok({ msg: `Pedido ${acao === 'recusar' ? 'recusado' : 'cancelado'}. Os dados permanecem protegidos.` });
    }
    return fail('Ação inválida.', 400);
  } catch (e) {
    return handleApiError(e);
  }
}
