'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CandidateProfileForm({ candidate }: { candidate: Record<string, any> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    resume_text: candidate.resume_text || '',
    name: candidate.name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    whatsapp: candidate.whatsapp || '',
    city: candidate.city || '',
    state: candidate.state || '',
    title: candidate.title || '',
    professional_summary: candidate.professional_summary || '',
    education: candidate.education || '',
    courses: candidate.courses || '',
    skills: candidate.skills || '',
    experience: candidate.experience || '',
    availability: candidate.availability || '',
    salary_expectation: candidate.salary_expectation || '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch(`/api/candidatos/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setLoading(false);
    setMsg({ ok: data.ok, text: data.data?.msg || data.error || 'Salvo.' });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome completo</label>
          <input className="input" value={f.name} onChange={set('name')} />
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
          <label className="label">Cidade</label>
          <input className="input" value={f.city} onChange={set('city')} />
        </div>
        <div>
          <label className="label">Estado</label>
          <input className="input" maxLength={2} value={f.state} onChange={set('state')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="resume_text">Cole seu currículo aqui</label>
        <textarea id="resume_text" className="input" rows={9} maxLength={50000} value={f.resume_text} onChange={set('resume_text')} placeholder="Cole o texto do seu currículo, com formação, cursos e experiências profissionais." />
        <p className="mt-1 text-xs text-slate-500">O original fica restrito à equipe Triatalent. Para as empresas, uma versão sem dados pessoais passa por revisão humana. Os contatos só são liberados após pagamento confirmado.</p>
      </div>
      <div>
        <label className="label">Cargo / perfil profissional</label>
        <input className="input" value={f.title} onChange={set('title')} />
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
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}
      <button className="btn-primary" disabled={loading}>
        {loading ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </form>
  );
}
