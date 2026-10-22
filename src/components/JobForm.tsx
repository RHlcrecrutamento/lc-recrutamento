/** Formulário completo de vaga (usado por cliente e equipe Triatalent). */
'use client';
import { useState } from 'react';
import { SALARY_EXTRAS, OFFERED_BENEFITS, readBenefits, brl, moneyInput } from '@/lib/job-benefits';
import { useRouter } from 'next/navigation';

interface JobData {
  id?: string;
  title?: string;
  openings?: number;
  description?: string;
  objectives?: string;
  activities?: string;
  requirements_mandatory?: string;
  requirements_desirable?: string;
  education?: string;
  courses?: string;
  experience?: string;
  competencies?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_disclosed?: number;
  benefits?: string;
  benefits_config_json?: string;
  contract_type?: string;
  work_schedule?: string;
  work_scale?: string;
  work_days?: string;
  modality?: string;
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  start_date?: string;
  hiring_deadline?: string;
  notes?: string;
  confidential_info?: string;
  is_public?: number;
  status?: string;
  company_id?: string;
}

export function JobForm({
  initial,
  reviewMode=false,
  companies,
  defaultCompany,
  mode,
  canSetCompany,
}: {
  initial?: JobData;
  reviewMode?: boolean;
  companies?: { id: string; name: string }[];
  defaultCompany?: string;
  mode: 'cliente' | 'interno';
  canSetCompany?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [benefitsConfig, setBenefitsConfig] = useState(() => readBenefits(initial?.benefits_config_json, initial?.benefits || ''));
  const toggleBenefit = (group: 'extras'|'offered', value: string) => setBenefitsConfig(prev => ({...prev,[group]:prev[group].includes(value)?prev[group].filter(x=>x!==value):[...prev[group],value]}));
  const [f, setF] = useState<JobData>({
    openings: 1,
    contract_type: 'CLT',
    modality: 'Presencial',
    salary_disclosed: 1,
    state: 'MG',
    is_public: 1,
    company_id: defaultCompany,
    ...initial,
  });
  const set = (k: keyof JobData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
    setF({ ...f, [k]: v });
  };

  async function save(status: 'rascunho' | 'aguardando_aprovacao' | 'em_recrutamento') {
    setError('');
    setLoading(true);
    try {
    const isEdit = !!f.id;
    const res = await fetch(isEdit ? `/api/vagas/${f.id}` : '/api/vagas', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, benefits_config: benefitsConfig, status: reviewMode ? undefined : status }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Erro ao salvar.');
      setLoading(false);
      return;
    }
    if (!reviewMode && isEdit && status !== (initial?.status || 'rascunho')) {
      await fetch(`/api/vagas/${f.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    }
    router.push(reviewMode ? `/recrutamento/vagas/${f.id}` : mode === 'cliente' ? '/cliente/vagas' : '/recrutamento/vagas');
    router.refresh();
    } catch {setError('Falha de conexão ao salvar. Tente novamente.');}
    finally {setLoading(false);}
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-brand-900">Identificação da vaga</h2>
        {canSetCompany && companies && (
          <div>
            <label className="label">Empresa contratante *</label>
            <select className="input" value={f.company_id || ''} onChange={set('company_id')}>
              <option value="">Selecione…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">Título do cargo *</label>
            <input className="input" value={f.title || ''} onChange={set('title')} placeholder="Ex.: Analista Financeiro Pleno" />
          </div>
          <div>
            <label className="label">Quantidade de vagas</label>
            <input className="input" type="number" min={1} value={f.openings ?? 1} onChange={set('openings')} />
          </div>
        </div>
        <div>
          <label className="label">Descrição da vaga</label>
          <textarea className="input" rows={3} value={f.description || ''} onChange={set('description')} />
        </div>
        <div>
          <label className="label">Objetivo da função</label>
          <textarea className="input" rows={2} value={f.objectives || ''} onChange={set('objectives')} />
        </div>
        <div>
          <label className="label">Atividades e responsabilidades</label>
          <textarea className="input" rows={4} value={f.activities || ''} onChange={set('activities')} placeholder={'Uma atividade por linha'} />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-brand-900">Requisitos e perfil</h2>
        <div>
          <label className="label">Requisitos obrigatórios (um por linha)</label>
          <textarea className="input" rows={4} value={f.requirements_mandatory || ''} onChange={set('requirements_mandatory')} />
        </div>
        {mode === 'interno' && (<div>
          <label className="label">Requisitos desejáveis (um por linha)</label>
          <textarea className="input" rows={3} value={f.requirements_desirable || ''} onChange={set('requirements_desirable')} />
        </div>)}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Escolaridade</label>
            <input className="input" value={f.education || ''} onChange={set('education')} />
          </div>
          <div>
            <label className="label">Cursos e certificações</label>
            <input className="input" value={f.courses || ''} onChange={set('courses')} />
          </div>
          {mode === 'interno' && (<div>
            <label className="label">Experiência exigida</label>
            <input className="input" value={f.experience || ''} onChange={set('experience')} />
          </div>)}
          {mode === 'interno' && (<div>
            <label className="label">Competências (separe por ; )</label>
            <input className="input" value={f.competencies || ''} onChange={set('competencies')} />
          </div>)}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-brand-900">Remuneração e contratação</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Salário mínimo (R$)</label>
            <input className="input" inputMode="numeric" value={f.salary_min == null ? '' : brl(Number(f.salary_min))} onChange={e => setF({...f, salary_min: moneyInput(e.target.value)})} placeholder="R$ 3.000,00" aria-label="Salário mínimo (R$)" />
          </div>
          <div>
            <label className="label">Salário máximo (R$)</label>
            <input className="input" inputMode="numeric" value={f.salary_max == null ? '' : brl(Number(f.salary_max))} onChange={e => setF({...f, salary_max: moneyInput(e.target.value)})} placeholder="R$ 3.000,00" aria-label="Salário máximo (R$)" />
          </div>
          <div>
            <label className="label">Divulgar salário?</label>
            <select className="input" value={f.salary_disclosed ?? 1} onChange={set('salary_disclosed')}>
              <option value={1}>Sim</option>
              <option value={0}>Não</option>
            </select>
          </div>
        </div>
        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold">Benefícios sobre salário (opcional)</legend>
          <div className="grid gap-2 sm:grid-cols-2">{SALARY_EXTRAS.map(option => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={benefitsConfig.extras.includes(option)} onChange={() => toggleBenefit('extras',option)} />{option}</label>)}</div>
        </fieldset>
        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold">Benefícios Oferecidos</legend>
          <div className="grid gap-2 sm:grid-cols-2">{OFFERED_BENEFITS.map(option => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={benefitsConfig.offered.includes(option)} onChange={() => toggleBenefit('offered',option)} />{option}</label>)}</div>
          {benefitsConfig.offered.includes('Outro') && <label className="label">Descreva o outro benefício<input className="input mt-1" required maxLength={2000} value={benefitsConfig.other} onChange={e => setBenefitsConfig({...benefitsConfig,other:e.target.value})} /></label>}
          <p className="text-sm font-medium">Qual valor do Vale Refeição ou Alimentação?</p>
          <p className="text-xs text-slate-500">Opcional quando não há vale selecionado. Ao selecionar Vale Refeição ou Vale Alimentação, informe o respectivo valor. Se oferecer os dois, preencha os dois valores.</p>
          {([['Vale Refeição','meal_vr_cents'],['Vale Alimentação','meal_va_cents']] as const).map(([label,key]) => benefitsConfig.offered.includes(label) && <label key={key} className="label">Valor do {label} (R$) *<input className="input mt-1" inputMode="numeric" required value={benefitsConfig[key] == null ? '' : brl(benefitsConfig[key]!)} onChange={e => setBenefitsConfig({...benefitsConfig,[key]:moneyInput(e.target.value)})} placeholder="R$ 30,00" /></label>)}
          {(benefitsConfig.offered.includes('Vale Refeição') || benefitsConfig.offered.includes('Vale Alimentação')) && <label className="label">Os valores dos vales são por<select className="input mt-1" value={benefitsConfig.meal_period} onChange={e => setBenefitsConfig({...benefitsConfig,meal_period:e.target.value as 'dia'|'mes'})}><option value="mes">Mês</option><option value="dia">Dia</option></select></label>}
          {benefitsConfig.legacy_text && <p className="text-xs text-slate-500">Benefícios anteriores preservados: {benefitsConfig.legacy_text}</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Tipo de contratação</label>
            <select className="input" value={f.contract_type || 'CLT'} onChange={set('contract_type')}>
              <option>CLT</option>
              <option>PJ</option>
              <option>Estágio</option>
              <option>Temporário</option>
              <option>Freelancer</option>
              <option>Cooperado</option>
            </select>
          </div>
          <div>
            <label className="label">Jornada / horário</label>
            <input className="input" value={f.work_schedule || ''} onChange={set('work_schedule')} placeholder="Ex.: 8h às 17h" />
          </div>
          <div>
            <label className="label">Escala</label>
            <input className="input" value={f.work_scale || ''} onChange={set('work_scale')} placeholder="Ex.: 12x36" />
          </div>
          <div>
            <label className="label">Dias de trabalho</label>
            <input className="input" value={f.work_days || ''} onChange={set('work_days')} placeholder="Ex.: Seg a sex" />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-brand-900">Local e prazos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Modalidade</label>
            <select className="input" value={f.modality || 'Presencial'} onChange={set('modality')}>
              <option>Presencial</option>
              <option>Híbrido</option>
              <option>Remoto</option>
            </select>
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" value={f.city || ''} onChange={set('city')} />
          </div>
          <div>
            <label className="label">Estado</label>
            <input className="input" maxLength={2} value={f.state || ''} onChange={set('state')} />
          </div>
          <div>
            <label className="label">Bairro</label>
            <input className="input" value={f.neighborhood || ''} onChange={set('neighborhood')} />
          </div>
        </div>
        <div>
          <label className="label">Endereço de trabalho</label>
          <input className="input" value={f.address || ''} onChange={set('address')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Data prevista para início</label>
            <input className="input" type="date" value={f.start_date || ''} onChange={set('start_date')} />
          </div>
          <div>
            <label className="label">Prazo de contratação</label>
            <input className="input" type="date" value={f.hiring_deadline || ''} onChange={set('hiring_deadline')} />
          </div>
          <div>
            <label className="label">Publicar vaga no site?</label>
            <select className="input" value={f.is_public ?? 1} onChange={set('is_public')}>
              <option value={1}>Sim (vaga pública)</option>
              <option value={0}>Não (apenas recrutamento interno)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={f.notes || ''} onChange={set('notes')} />
        </div>
        {mode === 'interno' && (
          <div>
            <label className="label">Informações confidenciais (visíveis apenas à equipe Triatalent)</label>
            <textarea className="input" rows={2} value={f.confidential_info || ''} onChange={set('confidential_info')} />
          </div>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {reviewMode ? <button className="btn-primary" disabled={loading} onClick={() => save('rascunho')}>{loading?'Salvando…':'Salvar revisão da vaga'}</button> : <>
        <button className="btn-outline" disabled={loading} onClick={() => save('rascunho')}>
          Salvar rascunho
        </button>
        {mode === 'cliente' ? (
          <button className="btn-primary" disabled={loading} onClick={() => save('aguardando_aprovacao')}>
            {loading ? 'Salvando…' : 'Solicitar aprovação da equipe Triatalent'}
          </button>
        ) : (
          <button className="btn-accent" disabled={loading} onClick={() => save('em_recrutamento')}>
            {loading ? 'Salvando…' : f.id ? 'Salvar e manter em recrutamento' : 'Salvar e iniciar recrutamento'}
          </button>
        )}
        </>}
      </div>
    </div>
  );
}
