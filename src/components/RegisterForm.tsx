'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function RegisterForm({ jobId, jobTitle }: { jobId?: string; jobTitle?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', password: '', phone: '', whatsapp: '', city: '', state: 'MG',
    title: '', professional_summary: '', education: '', courses: '', skills: '',
    resume_text: '', experience: '', availability: '', salary_expectation: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/cadastro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error || 'Erro no cadastro.'); return; }
      router.push(jobId ? `/candidatar/${encodeURIComponent(jobId)}` : '/painel');
      router.refresh();
    } catch { setError('Erro de conexão. Tente novamente; se a conta já foi criada, entre com seu e-mail e senha.'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      {jobId && <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-sm leading-relaxed text-slate-700">Sua candidatura: <strong>{jobTitle || 'vaga selecionada'}</strong>. Após criar sua conta, a entrevista abre automaticamente, sem aguardar aprovação da equipe.</div>}
      <h2 className="text-lg font-semibold text-brand-900">Seus dados</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome completo *</label>
          <input className="input" required value={f.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label">E-mail *</label>
          <input className="input" type="email" required value={f.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label">Senha (10+ caracteres, maiúscula, minúscula e número) *</label>
          <input className="input" type="password" required minLength={10} maxLength={72} value={f.password} onChange={set('password')} />
        </div>
        <div>
          <label className="label">Telefone *</label>
          <input className="input" required placeholder="(31) 99999-9999" value={f.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="label">WhatsApp</label>
          <input className="input" placeholder="(31) 99999-9999" value={f.whatsapp} onChange={set('whatsapp')} />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input className="input" value={f.city} onChange={set('city')} />
        </div>
        <div>
          <label className="label">Estado</label>
          <input className="input" value={f.state} onChange={set('state')} maxLength={2} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="resume_text">Cole seu currículo aqui</label>
        <textarea id="resume_text" className="input" rows={9} maxLength={50000} value={f.resume_text} onChange={set('resume_text')} placeholder="Cole o texto do seu currículo, com formação, cursos e experiências profissionais." />
        <p className="mt-1 text-xs text-slate-500">O original fica restrito à equipe Triatalent. Para as empresas, uma versão sem dados pessoais passa por revisão humana. Os contatos só são liberados após pagamento confirmado.</p>
      </div>
      <h2 className="pt-2 text-lg font-semibold text-brand-900">Dados profissionais</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Cargo / perfil profissional</label>
          <input className="input" placeholder="Ex.: Analista de RH" value={f.title} onChange={set('title')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Resumo profissional</label>
          <textarea className="input" rows={3} value={f.professional_summary} onChange={set('professional_summary')} />
        </div>
        <div>
          <label className="label">Formação</label>
          <textarea className="input" rows={2} value={f.education} onChange={set('education')} />
        </div>
        <div>
          <label className="label">Cursos e certificações</label>
          <textarea className="input" rows={2} value={f.courses} onChange={set('courses')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Competências (separe por ; )</label>
          <input className="input" placeholder="Excel; Comunicação; Liderança" value={f.skills} onChange={set('skills')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Experiências profissionais</label>
          <textarea className="input" rows={4} value={f.experience} onChange={set('experience')} />
        </div>
        <div>
          <label className="label">Disponibilidade</label>
          <input className="input" placeholder="Ex.: Imediata / 30 dias" value={f.availability} onChange={set('availability')} />
        </div>
        <div>
          <label className="label">Pretensão salarial (opcional)</label>
          <input className="input" placeholder="Ex.: R$ 3.500" value={f.salary_expectation} onChange={set('salary_expectation')} />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Ao se cadastrar, você concorda com o tratamento dos seus dados para recrutamento e seleção, conforme a{' '}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>{' '}
        (LGPD). Você nunca será cobrado por participar de processos seletivos.
      </p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? 'Criando conta…' : jobId ? 'Cadastrar e ir para a entrevista' : 'Criar minha conta grátis'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href={jobId ? `/entrar/candidato?vaga=${encodeURIComponent(jobId)}` : '/entrar/candidato'} className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
