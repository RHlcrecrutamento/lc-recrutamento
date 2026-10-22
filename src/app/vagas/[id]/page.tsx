import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { ApplyForm } from '@/components/ApplyForm';

export const dynamic = 'force-dynamic';

export default async function VagaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const j = await db
    .prepare(`SELECT j.*, c.name AS company_name FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ?`)
    .get((await params).id) as any;
  if (!j || !(j.is_public && ['aprovada', 'em_recrutamento'].includes(j.status))) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/">
            <Logo size={38} />
          </Link>
          <Link href="/vagas" className="btn-outline">
            ← Todas as vagas
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="card">
          <h1 className="text-2xl font-bold text-brand-900">{j.title}</h1>
          <p className="mt-1 text-slate-600">
            {j.company_name} · {j.city}/{j.state} · {j.modality} · {j.contract_type} · {j.work_schedule || 'Horário a combinar'}
          </p>
          {j.salary_disclosed && j.salary_min ? (
            <p className="mt-2 font-semibold text-accent-700">
              Salário: R$ {(j.salary_min / 100).toLocaleString('pt-BR')}
              {j.salary_max ? ` a R$ ${(j.salary_max / 100).toLocaleString('pt-BR')}` : ''}
            </p>
          ) : (
            <p className="mt-2 text-slate-500">Salário não divulgado</p>
          )}
          <div className="mt-5 space-y-4">
            {j.description && (
              <section>
                <h2 className="font-semibold text-brand-900">Sobre a vaga</h2>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{j.description}</p>
              </section>
            )}
            {j.activities && (
              <section>
                <h2 className="font-semibold text-brand-900">Atividades e responsabilidades</h2>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{j.activities}</p>
              </section>
            )}
            {j.requirements_mandatory && (
              <section>
                <h2 className="font-semibold text-brand-900">Requisitos obrigatórios</h2>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{j.requirements_mandatory}</p>
              </section>
            )}
            {j.requirements_desirable && (
              <section>
                <h2 className="font-semibold text-brand-900">Requisitos desejáveis</h2>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{j.requirements_desirable}</p>
              </section>
            )}
            {j.benefits && (
              <section>
                <h2 className="font-semibold text-brand-900">Benefícios</h2>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{j.benefits}</p>
              </section>
            )}
          </div>
        </div>

        <div className="mt-6">
          <ApplyForm jobId={j.id} jobTitle={j.title} />
        </div>
      </main>
    </div>
  );
}
