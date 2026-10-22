import { redirect,notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const u=await getSessionUser();if(!u)redirect('/entrar');if(!['ADMIN','RECRUTADOR'].includes(u.role))redirect('/painel');
 const key=(await params).id;const a=await db.prepare('SELECT id FROM applications WHERE id=? OR candidate_id=? ORDER BY created_at DESC LIMIT 1').get(key,key) as any;if(a)redirect('/recrutamento/analise/'+a.id);
 const c=await db.prepare('SELECT * FROM candidates WHERE id=?').get(key) as any;if(!c)notFound();return <section className="card space-y-3"><h1 className="text-2xl font-bold">{c.name}</h1><p className="whitespace-pre-wrap text-sm">{c.resume_text||c.professional_summary||'Perfil sem currículo colado.'}</p><p className="text-sm">Este candidato ainda não escolheu uma vaga. Ele deve se candidatar pelo próprio portal; a vinculação manual está desativada.</p></section>;
}
