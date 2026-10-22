import Link from 'next/link';
import { redirect,notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasValidUnlock } from '@/lib/access';
import { safeCheckoutUrl } from '@/lib/payments';
import { brl } from '@/lib/job-benefits';
import { PaymentStatus } from '@/components/PaymentStatus';
export const dynamic='force-dynamic';
export default async function Pedido({params}:{params:Promise<{id:string}>}){
  const u=await getSessionUser();if(!u)redirect('/entrar');if(u.role!=='CLIENTE')redirect('/painel');
  const o=await db.prepare('SELECT o.*,j.title AS job_title FROM orders o JOIN applications a ON a.id=o.application_id JOIN jobs j ON j.id=a.job_id WHERE o.id=? AND o.company_id=? AND j.company_id=?').get((await params).id,u.company_id,u.company_id) as any;
  if(!o)notFound();
  const unlocked=await hasValidUnlock(o.application_id,u.company_id!);
  return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold text-brand-900">Confirmação de pagamento</h1><p className="text-sm text-slate-600">{o.job_title} · {brl(o.amount_cents)}</p>{o.gateway_environment==='test'&&<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Pedido de TESTE — sem cobrança real. Este acesso não vale em produção.</p>}<PaymentStatus orderId={o.id} applicationId={o.application_id} amountCents={o.amount_cents} initialStatus={o.status} initialUnlocked={unlocked} checkoutUrl={o.gateway==='mercadopago'&&o.status==='pendente'&&new Date(o.checkout_expires_at).getTime()>Date.now()?safeCheckoutUrl(o.checkout_url):null}/><Link href="/cliente/pagamentos" className="text-sm text-brand-700 underline">Voltar ao histórico</Link></div>;
}
