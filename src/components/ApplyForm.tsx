import Link from 'next/link';

/** A candidatura é sempre associada à conta autenticada, nunca só ao e-mail informado. */
export function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  return <section className="card space-y-4">
    <h2 className="text-lg font-semibold text-brand-900">Tenho interesse nesta vaga</h2>
    <p className="text-sm leading-relaxed text-slate-600">Para participar de <strong>{jobTitle}</strong>, faça seu cadastro gratuito ou entre na sua conta. Em seguida, você acessa a entrevista on-line, sem aguardar aprovação da equipe.</p>
    <Link href={`/candidatar/${encodeURIComponent(jobId)}`} className="btn-primary w-full sm:w-auto">Candidatar-me e fazer a entrevista</Link>
    <p className="text-xs leading-relaxed text-slate-500">Concluir a entrevista não significa aprovação ou envio automático à empresa. A equipe Triatalent analisa o relatório e decide quais candidatos serão apresentados. Participar é gratuito.</p>
  </section>;
}
