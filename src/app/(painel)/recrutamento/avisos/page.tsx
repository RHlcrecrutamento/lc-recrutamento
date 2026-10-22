import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { WhatsAppDrafts } from '@/components/WhatsAppDrafts';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{historico?:string}>}){const u=await getSessionUser();if(!u)redirect('/entrar');if(!['ADMIN','RECRUTADOR'].includes(u.role))redirect('/painel');const all=(await searchParams).historico==='1';const rows=await db.prepare(`SELECT * FROM notification_drafts ${all?'':'WHERE confirmed_at IS NULL'} ORDER BY created_at DESC`).all() as any[];return <div className="mx-auto max-w-4xl space-y-5"><h1 className="text-2xl font-bold">WhatsApp — envio manual</h1><p className="text-sm text-slate-600">Abra a mensagem, confira o destinatário e confirme o envio no WhatsApp. Só depois marque como enviado aqui. Abrir o link não envia a mensagem, e esta tela não comprova entrega nem leitura. Não há integração automática paga.</p><Link href={all?'/recrutamento/avisos':'/recrutamento/avisos?historico=1'} className="text-sm text-brand-700 underline">{all?'Ver somente pendentes':'Ver histórico de avisos'}</Link><WhatsAppDrafts drafts={rows}/></div>;}
