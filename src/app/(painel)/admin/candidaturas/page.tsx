import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, STAGES } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { StageBadge, Empty } from '@/components/ui';
import { SectionFilters } from '@/components/SectionFilters';
export const dynamic = 'force-dynamic';
export default async function AdminCandidaturas({searchParams}: {searchParams: Promise<{filtro?: string; etapa?: string}>}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/painel');
  const search = await searchParams;
  const stage = STAGES.find(s => s.key === search.etapa);
  const filtro = ['liberados','contratacoes'].includes(search.filtro || '') ? search.filtro : '';
  const conditions: string[] = [];
  const params: string[] = [];
  if (filtro === 'liberados') conditions.push('a.stage >= 11');
  if (filtro === 'contratacoes') conditions.push("a.stage_key = 'encerramento' AND a.closed_reason LIKE '%ontrat%'");
  if (stage) {conditions.push('a.stage_key = ?');params.push(stage.key);}
  const rows = await db.prepare(`SELECT a.*, c.name AS candidate_name, j.title AS job_title, co.name AS company_name
    FROM applications a JOIN candidates c ON c.id = a.candidate_id
    JOIN jobs j ON j.id = a.job_id JOIN companies co ON co.id = j.company_id
    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    ORDER BY a.created_at DESC`).all(...params) as any[];
  const title = stage ? stage.label : filtro === 'liberados' ? 'Candidatos liberados' : filtro === 'contratacoes' ? 'Contratações' : 'Candidaturas';
  return <div className="space-y-6">
    <div><Link href="/admin" className="text-sm font-medium text-brand-700 hover:underline">← Painel administrativo</Link><h1 className="mt-3 text-2xl font-bold text-brand-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{rows.length} vínculo(s) candidato–vaga. Um candidato pode participar de mais de uma vaga.</p></div>
    <SectionFilters items={[
      {label:'Todas',href:'/admin/candidaturas',active: !filtro && !stage},
      {label:'Liberados ao cliente',href:'/admin/candidaturas?filtro=liberados',active:filtro === 'liberados' && !stage},
      {label:'Contratações',href:'/admin/candidaturas?filtro=contratacoes',active:filtro === 'contratacoes' && !stage},
    ]} />
    <div className="card overflow-x-auto p-0"><table className="min-w-full"><thead className="bg-slate-50"><tr>{['Candidato','Vaga','Empresa','Etapa','Motivo do encerramento',''].map((h,i)=><th key={i} className="th">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(a=><tr key={a.id}><td className="td font-medium">{a.candidate_name}</td><td className="td">{a.job_title}</td><td className="td">{a.company_name}</td><td className="td"><StageBadge stage={a.stage} stageKey={a.stage_key} /></td><td className="td">{a.closed_reason || '—'}</td><td className="td"><Link href={`/recrutamento/candidatos/${a.id}`} className="btn-outline">Acompanhar</Link></td></tr>)}</tbody></table>{!rows.length && <div className="p-5"><Empty msg="Nenhuma candidatura neste filtro." /></div>}</div>
  </div>;
}
