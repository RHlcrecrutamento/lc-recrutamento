/** Formulário de candidato (equipe Triatalent). */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CandidateForm({ initial }: { initial?: Record<string, any> }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', phone: '', whatsapp: '', cpf: '', city: '', state: 'MG',
    title: '', professional_summary: '', education: '', courses: '', skills: '',
    experience: '', availability: '', salary_expectation: '', origin: 'Cadastro manual',
    consent: true, ...initial,
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const isEdit = !!initial?.id;
    const res = await fetch(isEdit ? `/api/candidatos/${initial.id}` : '/api/candidatos', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || 'Erro ao salvar.');
      setLoading(false);
      return;
    }
    router.push(isEdit ? `/recrutamento/candidatos/${initial.id}` : '/recrutamento/candidatos');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome completo *</label>
          <input className="input" required value={f.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={f.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="label">WhatsApp</label>
          <input className="input" value={f.whatsapp} onChange={set('whatsapp')} />
        </div>
        <div>
          <label className="label">CPF (uso interno — nunca exibido ao cliente)</label>
          <input className="input" value={f.cpf} onChange={set('cpf')} />
        </div>
        <div>
          <label className="label">Cidade / Estado</label>
          <div className="flex gap-2">
            <input className="input" value={f.city} onChange={set('city')} />
            <input className="input w-20" maxLength={2} value={f.state} onChange={set('state')} />
          </div>
        </div>
        <div>
          <label className="label">Cargo / perfil</label>
          <input className="input" value={f.title} onChange={set('title')} />
        </div>
        <div>
          <label className="label">Origem do candidato</label>
          <select className="input" value={f.origin} onChange={set('origin')}>
            <option>Cadastro manual</option>
            <option>Banco de talentos</option>
            <option>Indicação</option>
            <option>LinkedIn</option>
            <option>Site / divulgação</option>
            <option>Importação de currículo</option>
            <option>Outro</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Resumo profissional</label>
        <textarea className="input" rows={3} value={f.professional_summary} onChange={set('professional_summary')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Formação</label>
          <textarea className="input" rows={2} value={f.education} onChange={set('education')} />
        </div>
        <div>
          <label className="label">Cursos</label>
          <textarea className="input" rows={2} value={f.courses} onChange={set('courses')} />
        </div>
      </div>
      <div>
        <label className="label">Competências (separe por ; )</label>
        <input className="input" value={f.skills} onChange={set('skills')} />
      </div>
      <div>
        <label className="label">Experiências profissionais</label>
        <textarea className="input" rows={4} value={f.experience} onChange={set('experience')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Disponibilidade</label>
          <input className="input" value={f.availability} onChange={set('availability')} />
        </div>
        <div>
          <label className="label">Pretensão salarial</label>
          <input className="input" value={f.salary_expectation} onChange={set('salary_expectation')} />
        </div>
      </div>
      {!initial?.id && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={f.consent} onChange={set('consent')} />
          <span>O candidato autorizou o tratamento dos dados para recrutamento e seleção (consentimento LGPD registrado).</span>
        </label>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary" disabled={loading}>
        {loading ? 'Salvando…' : 'Salvar candidato'}
      </button>
    </form>
  );
}
