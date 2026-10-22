import Link from 'next/link';
import { displayBrand } from '@/lib/brand';
import { db } from '@/lib/db';
import { Logo } from '@/components/Logo';

export async function LegalPage({ tipo }: { tipo: 'privacidade' | 'termos' }) {
  const row = await db
    .prepare(`SELECT * FROM legal_texts WHERE type = ? AND active = 1 ORDER BY updated_at DESC LIMIT 1`)
    .get(tipo) as any;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/">
            <Logo size={38} />
          </Link>
          <Link href="/" className="btn-outline">
            Voltar
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-900">{displayBrand(row?.title) || (tipo === 'privacidade' ? 'Política de Privacidade' : 'Termos de Uso')}</h1>
        <p className="mt-2 text-xs text-slate-500">Versão {row?.version || 'v1.0'} · Textos sujeitos a revisão jurídica</p>
        {tipo==='privacidade' && <aside className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Quando habilitado pelo responsável, o Google Gemini auxilia nas perguntas e no parecer de recrutamento. O currículo e as respostas têm identificadores reduzidos antes do processamento, sem garantia de anonimização completa de texto livre. A decisão é humana. As condições do provedor e a base legal precisam ser avaliadas pelo responsável antes da ativação com dados reais. Os avisos de WhatsApp são preparados para envio manual.</aside>}
        <div className="prose mt-6 whitespace-pre-wrap leading-relaxed text-slate-700">
          {displayBrand(row?.content) || 'Texto legal ainda não configurado. Acesse Administração para cadastrar.'}
        </div>
      </article>
    </div>
  );
}
