/**
 * Perfil ANONIMIZADO do candidato para o cliente.
 * Dados de contato só aparecem com desbloqueio pago confirmado no servidor.
 */
import Link from 'next/link';
import { PresentationSections } from '@/components/PresentationSections';
import { redirect, notFound } from 'next/navigation';
import { db, uj } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getAnonymizedCandidate, candidateCode, getUnlockPriceCents, hasValidUnlock } from '@/lib/access';
import { Empty } from '@/components/ui';
import { ClientCandidateActions } from '@/components/ClientCandidateActions';

export const dynamic = 'force-dynamic';

export default async function ClienteCandidatoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/entrar');
  if (user.role !== 'CLIENTE') redirect('/painel');

  const app = await db
    .prepare(`SELECT a.*, j.title AS job_title, j.company_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`)
    .get((await params).id) as any;
  if (!app || app.company_id !== user.company_id) notFound();

  const anon = await getAnonymizedCandidate((await params).id, user);
  if (!anon) {
    // Regra central: NÃO mostra nada — nem por URL direta
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-brand-900">Candidato indisponível</h1>
        <div className="card">
          <p className="text-sm text-slate-600">
            Este candidato ainda não está disponível para análise. O perfil é apresentado somente após a conclusão da
            entrevista online e a validação do relatório pela equipe Triatalent.
          </p>
          <Link href="/cliente/candidatos" className="btn-outline mt-4 inline-flex">
            ← Voltar aos candidatos
          </Link>
        </div>
      </div>
    );
  }

  const report = await db
    .prepare(
      `SELECT * FROM reports WHERE application_id = ? AND status = 'validado' AND published_at IS NOT NULL LIMIT 1`
    )
    .get((await params).id) as any;
  const pub = uj<any>(report?.public_summary_json, {});
  const met = uj<any[]>(report?.requirements_met_json, []);
  const insufficient = uj<any[]>(report?.requirements_insufficient_json, []);
  const price = await getUnlockPriceCents(user.company_id);
  const unlocked = await hasValidUnlock((await params).id, user.company_id!);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-accent-700">{anon.code}</p>
          <h1 className="text-2xl font-bold text-brand-900">{anon.title || 'Profissional'}</h1>
          <p className="text-sm text-slate-500">
            Vaga: {app.job_title} · Região: {anon.city_region || 'não informada'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {typeof report?.compatibility_score === 'number' && (
              <span className="badge bg-brand-100 text-brand-800">Compatibilidade: {report.compatibility_score}%</span>
            )}
            <span className="badge bg-emerald-100 text-emerald-800">Entrevista concluída e validada pela Triatalent ✔</span>
            {unlocked && <span className="badge bg-accent-100 text-accent-800">Contato desbloqueado</span>}
          </div>
        </div>
        <Link href="/cliente/candidatos" className="btn-outline">← Voltar</Link>
      </div>

      {process.env.MP_ENVIRONMENT === 'test' && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Ambiente de teste: não há cobrança real. Use somente dados fictícios. Acessos de teste não valem no ambiente de produção.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="font-semibold text-brand-900">Currículo do candidato</h2>
            {anon.resume_text ? <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{anon.resume_text}</p> : <p className="mt-2 text-sm text-slate-500">Currículo não informado ou aguardando revisão da versão anonimizada pela equipe Triatalent.</p>}
          </section>
          <PresentationSections publicData={pub}/>
        </div>

        <div className="space-y-6">
          {/* Dados profissionais */}
          <section className="card">
            <h2 className="font-semibold text-brand-900">Informações profissionais</h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Código</dt><dd className="font-medium">{anon.code}</dd></div>
              <div><dt className="text-xs text-slate-500">Região</dt><dd>{anon.city_region || '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Disponibilidade</dt><dd>{anon.availability || '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Pretensão salarial</dt><dd>{anon.salary_expectation || 'Não informada'}</dd></div>
              <div><dt className="text-xs text-slate-500">Data da entrevista</dt><dd>{report?.reviewed_at ? new Date(report.reviewed_at).toLocaleDateString('pt-BR') : '—'}</dd></div>
            </dl>
          </section>

          {/* Contato — protegido */}
          <section className={`card border-2 ${unlocked ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-200'}`}>
            <h2 className="font-semibold text-brand-900">
              {unlocked ? '📞 Dados de contato (desbloqueados)' : '🔒 Dados de contato protegidos'}
            </h2>
            {unlocked ? (
              <dl className="mt-3 space-y-2 text-sm">
                {anon.contact.name && (
                  <div><dt className="text-xs text-slate-500">Nome</dt><dd className="font-semibold">{anon.contact.name}</dd></div>
                )}
                {anon.contact.email && (
                  <div><dt className="text-xs text-slate-500">E-mail</dt><dd>{anon.contact.email}</dd></div>
                )}
                {(anon.contact.phone || anon.contact.whatsapp) && (
                  <div><dt className="text-xs text-slate-500">Telefone/WhatsApp</dt><dd>{anon.contact.whatsapp || anon.contact.phone}</dd></div>
                )}
              </dl>
            ) : (
              <>
                <p className="mt-2 text-xs text-slate-600">
                  Nome, telefone, WhatsApp e e-mail permanecem ocultos até a confirmação segura do pagamento no servidor.
                </p>
                <p className="mt-2 text-lg font-bold text-brand-900">R$ {(price / 100).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                <p className="text-xs text-slate-500">PIX e outros meios disponíveis no Mercado Pago · contatos liberados após confirmação no servidor</p>
              </>
            )}
          </section>

          <ClientCandidateActions
            applicationId={app.id}
            unlocked={unlocked}
            interest={app.client_interest}
            decision={app.client_decision}
            priceCents={price}
          />

          <section className="card bg-slate-50">
            <p className="text-xs text-slate-500">
              🔒 Proteção de dados: este perfil não contém nome, CPF, endereço, foto ou arquivos originais. O currículo apresentado passa por revisão humana; o original permanece restrito à equipe. O controle de contatos é aplicado no servidor e nas APIs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
