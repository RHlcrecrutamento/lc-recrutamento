import Link from 'next/link';
import { redirect,notFound } from 'next/navigation';
import { db,uj } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { resumeReviewData } from '@/lib/resumes';
import { JobDetails } from '@/components/JobDetails';
import { CandidateReviewForm } from '@/components/CandidateReviewForm';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const u=await getSessionUser();if(!u)redirect('/entrar');if(!['ADMIN','RECRUTADOR'].includes(u.role))redirect('/painel');
 const app=await db.prepare('SELECT * FROM applications WHERE id=?').get((await params).id) as any;if(!app)notFound();
 const c=await db.prepare('SELECT * FROM candidates WHERE id=?').get(app.candidate_id) as any;
 const job=await db.prepare('SELECT j.*,co.name AS company_name FROM jobs j JOIN companies co ON co.id=j.company_id WHERE j.id=?').get(app.job_id) as any;
 const report=await db.prepare('SELECT * FROM reports WHERE application_id=? ORDER BY created_at DESC LIMIT 1').get(app.id) as any;
 const i=await db.prepare('SELECT * FROM interviews WHERE application_id=? ORDER BY created_at DESC LIMIT 1').get(app.id) as any;
 const answers=i?await db.prepare('SELECT * FROM interview_answers WHERE interview_id=? ORDER BY created_at,id').all(i.id) as any[]:[];
 const data=await resumeReviewData(c.id);
 return <div className="space-y-6"><header><Link href="/recrutamento/candidatos" className="text-sm text-brand-700 underline">← Candidatos para analisar</Link><h1 className="mt-2 text-2xl font-bold">{c.name}</h1><p className="text-sm">{job.title} · {job.company_name}</p><p className="mt-2 text-sm font-semibold">Aderência declarada: {report?.compatibility_score??0}% · Equipe: {app.team_decision||'aguardando análise'} · Cliente: {app.client_decision||'ainda não analisou'}</p></header>
 <div className="grid items-start gap-5 xl:grid-cols-2"><JobDetails job={job}/><section className="card space-y-3"><h2 className="font-semibold">Dados do candidato — somente equipe</h2><dl className="grid gap-3 sm:grid-cols-2">{[['name','Nome'],['email','E-mail'],['phone','Telefone'],['whatsapp','WhatsApp'],['city','Cidade'],['state','Estado'],['title','Perfil'],['education','Escolaridade'],['courses','Cursos'],['availability','Disponibilidade'],['salary_expectation','Pretensão salarial']].map(([key,label])=><div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{c[key]||'Não informado'}</dd></div>)}</dl><h3 className="font-semibold">Currículo original colado</h3><p className="whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-sm">{c.resume_text||'Currículo não colado. Confira os dados profissionais do perfil.'}</p>{!c.resume_text&&<p className="whitespace-pre-wrap text-sm">{[c.professional_summary,c.experience,c.skills].filter(Boolean).join('\n')}</p>}</section></div>
 <section className="card space-y-4"><h2 className="font-semibold">Todas as respostas da entrevista — fonte original</h2><p className="text-xs text-slate-500">{report?.compatibility_justification||'Entrevista ainda sem parecer.'}</p>{answers.map(a=><div key={a.id} className="rounded-lg border p-3"><p className="text-sm font-semibold">{a.question}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{a.question_key.startsWith('historico_')?Object.entries(uj<any>(a.answer,{})).map(([key,value])=>`${({company:'Empresa',role:'Função',entry:'Entrada',exit:'Saída',reason:'Motivo',current:'Vínculo atual',unavailable:'Sem outra experiência'} as any)[key]||key}: ${typeof value==='boolean'?(value?'Sim':'Não'):value}`).join('\n'):a.answer}</p></div>)}</section>
 {report&&data&&i?.status==='concluida'?<CandidateReviewForm key={report.id+':'+report.source_resume_hash+':'+report.professional_summary} applicationId={app.id} data={data} report={{professional_summary:report.professional_summary,generator:report.generator,public_summary:uj(report.public_summary_json,{})}} decided={!!app.team_decision||!!app.closed_reason||!!report.published_at}/>:<p className="card text-sm">A decisão fica disponível após a conclusão da entrevista e geração do parecer.</p>}</div>;
}
