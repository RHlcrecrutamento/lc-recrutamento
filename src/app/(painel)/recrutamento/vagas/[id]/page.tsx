import Link from 'next/link';
import { redirect,notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { JobDetails } from '@/components/JobDetails';
import { JobForm } from '@/components/JobForm';
import { JobReviewActions } from '@/components/JobReviewActions';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const u=await getSessionUser();if(!u)redirect('/entrar');if(!['ADMIN','RECRUTADOR'].includes(u.role))redirect('/painel');
 const job=await db.prepare('SELECT j.*,c.name AS company_name FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.id=?').get((await params).id) as any;if(!job)notFound();
 return <div className="space-y-5"><header><Link href="/recrutamento/vagas" className="text-sm text-brand-700 underline">← Vagas para revisar</Link><h1 className="mt-2 text-2xl font-bold">{job.title}</h1><p className="text-sm text-slate-500">{job.company_name}</p></header><JobDetails job={job}/><details className="rounded-xl border border-brand-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-brand-800">Editar todas as informações da vaga</summary><div className="mt-4"><JobForm initial={job} mode="interno" reviewMode/></div></details><JobReviewActions jobId={job.id} status={job.status} decision={job.review_decision}/><Link href="/recrutamento/candidatos" className="text-sm text-brand-700 underline">Ver candidatos que concluíram a entrevista</Link></div>;
}
