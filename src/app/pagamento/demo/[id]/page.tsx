/** Checkout de demonstração (sem Mercado Pago). Claramente identificado. */
import { localDemoAllowed } from '@/lib/payment-rules';
import { redirect, notFound } from 'next/navigation';
import { db, getSetting } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { DemoCheckout } from '@/components/DemoCheckout';

export const dynamic = 'force-dynamic';

export default async function DemoCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  if(!localDemoAllowed()) notFound();
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get((await params).id) as any;
  if (!order || order.gateway !== 'demo' || order.company_id !== user.company_id) notFound();
  if (!await getSetting<boolean>('demo_payments')) redirect('/cliente/pagamentos');

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-800 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Logo size={48} dark />
        </div>
        <div className="card space-y-4">
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ <strong>AMBIENTE DE DEMONSTRAÇÃO DE PAGAMENTOS</strong> — esta tela substitui o checkout real do Mercado
            Pago enquanto as credenciais não estão configuradas. Em produção, desative o modo demonstração em
            Administração → Configurações.
          </div>
          <h1 className="text-lg font-bold text-brand-900">Desbloqueio de dados de contato</h1>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Pedido</span>
              <span className="font-mono text-xs">{order.id.slice(0, 14)}…</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Item</span>
              <span>1 desbloqueio de contato</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Total</span>
              <span>R$ {(order.amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Após a confirmação do pagamento no servidor, serão liberados somente: nome, e-mail, telefone e WhatsApp.
            Documentos e demais dados permanecem protegidos.
          </p>
          <DemoCheckout orderId={order.id} />
        </div>
      </div>
    </div>
  );
}
