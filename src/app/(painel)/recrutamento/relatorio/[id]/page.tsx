import { redirect,notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const u=await getSessionUser();if(!u)redirect('/entrar');if(!['ADMIN','RECRUTADOR'].includes(u.role))redirect('/painel');const r=await db.prepare('SELECT application_id FROM reports WHERE id=?').get((await params).id) as any;if(!r)notFound();redirect('/recrutamento/analise/'+r.application_id);}
