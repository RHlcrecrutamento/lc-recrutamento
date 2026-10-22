import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { candidateCode } from '@/lib/access';
import { validUnlockSql } from '@/lib/payment-rules';
export const dynamic='force-dynamic';
export default async function Desbloqueios(){
  const u=await getSessionUser();if(!u)redirect('/entrar');if(u.role!=='CLIENTE')redirect('/painel');
  const rows=await db.prepare(`SELECT u.*,j.title AS job_title FROM unlocks u JOIN applications a ON a.id=u.application_id JOIN jobs j ON j.id=a.job_id WHERE u.company_id=? AND j.company_id=? AND ${validUnlockSql()} ORDER BY u.created_at DESC`).all(u.company_id,u.company_id) as any[];
  return <div className="space-y-5"><h1 className="text-2xl font-bold text-brand-900">Desbloqueios ativos</h1><p className="text-sm text-slate-600">Somente acessos pagos, confirmados, não revogados e dentro da validade.</p>{!rows.length&&<p className="card">Nenhum desbloqueio ativo.</p>}{rows.map(r=><Link key={r.id} href={`/cliente/candidato/${r.application_id}`} className="card block"><strong>{candidateCode(r.candidate_id)}</strong><p className="text-sm">{r.job_title}</p><p className="text-xs text-slate-500">{r.expires_at?`Válido até ${new Date(r.expires_at).toLocaleDateString('pt-BR')}`:'Sem expiração'}</p><span className="text-sm text-brand-700">Ver candidato e contatos →</span></Link>)}</div>;
}
