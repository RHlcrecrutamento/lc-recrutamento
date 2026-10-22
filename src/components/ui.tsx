import { STAGES, JOB_STATUSES } from '@/lib/db';

export function StageBadge({ stage, stageKey }: { stage: number; stageKey: string }) {
  const s = STAGES.find((x) => x.key === stageKey) || STAGES[0];
  const color =
    s.n >= 11
      ? 'bg-emerald-100 text-emerald-800'
      : s.n >= 7
      ? 'bg-amber-100 text-amber-800'
      : s.n >= 3
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-slate-700';
  return <span className={`badge ${color}`}>{s.n}. {s.label}</span>;
}

export function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    rascunho: 'bg-slate-100 text-slate-700',
    aguardando_aprovacao: 'bg-amber-100 text-amber-800',
    aprovada: 'bg-blue-100 text-blue-800',
    em_recrutamento: 'bg-accent-100 text-accent-800',
    aguardando_avaliacao_cliente: 'bg-purple-100 text-purple-800',
    pausada: 'bg-orange-100 text-orange-800',
    concluida: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-red-100 text-red-700',
  };
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700'}`}>{JOB_STATUSES[status] || status}</span>;
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-800',
    aprovado: 'bg-emerald-100 text-emerald-800',
    recusado: 'bg-red-100 text-red-700',
    cancelado: 'bg-slate-100 text-slate-700',
    reembolsado: 'bg-purple-100 text-purple-800',
  };
  return <span className={`badge ${map[status] || 'bg-slate-100'}`}>{status}</span>;
}

export function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aguardando_revisao: 'bg-amber-100 text-amber-800',
    em_revisao: 'bg-blue-100 text-blue-800',
    validado: 'bg-emerald-100 text-emerald-800',
    complementacao_solicitada: 'bg-orange-100 text-orange-800',
  };
  return <span className={`badge ${map[status] || 'bg-slate-100'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? 'border-accent-200 bg-accent-50/40' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {msg}
    </div>
  );
}
