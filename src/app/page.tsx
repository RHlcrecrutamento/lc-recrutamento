import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo size={44} />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/vagas" className="text-sm font-medium text-slate-700 hover:text-brand-700">
              Vagas abertas
            </Link>
            <Link href="/privacidade" className="hidden text-sm font-medium text-slate-700 hover:text-brand-700 sm:block">
              Privacidade
            </Link>
            <Link href="/entrar/empresa" className="btn-outline">
              Sou empresa
            </Link>
            <Link href="/entrar/candidato" className="btn-primary">
              Sou candidato
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-900 to-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-accent-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-200">
            Recrutamento e seleção com tecnologia
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Talentos que fazem a diferença. Conexões que transformam.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-100">
            Gestão completa de vagas, entrevistas online assistidas por inteligência artificial, revisão humana
            obrigatória e banco de currículos com desbloqueio seguro.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/vagas" className="btn-gold px-6 py-3 text-base">
              Ver vagas abertas
            </Link>
            <Link href="/entrar" className="btn-outline border-white/30 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
              Acessar a plataforma
            </Link>
            <Link href="/cadastro/empresa" className="btn-primary border border-white/20 px-6 py-3 text-base">Cadastrar minha empresa</Link>
          </div>
        </div>
      </section>

      {/* Fluxo */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-brand-900 sm:text-3xl">
          Um processo seletivo sério, transparente e em conformidade com a LGPD
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Nenhum currículo é apresentado à empresa antes da entrevista online e da validação humana do relatório pela
          equipe Triatalent.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: '1. Vaga cadastrada', d: 'A empresa cadastra a vaga e a equipe Triatalent aprova as informações para iniciar o recrutamento.' },
            { t: '2. Busca e entrevista', d: 'A Triatalent vincula candidatos e cada um realiza uma entrevista online personalizada com apoio de IA.' },
            { t: '3. Revisão humana', d: 'Recrutadores analisam, corrigem e validam o relatório. A IA não decide sozinha.' },
            { t: '4. Desbloqueio seguro', d: 'A empresa analisa perfis anonimizados e paga somente pelos contatos que realmente interessam.' },
          ].map((s) => (
            <div key={s.t} className="card border-t-4 border-t-accent-500">
              <h3 className="font-semibold text-brand-900">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perfis */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-brand-900 sm:text-3xl">Feito para cada participante do processo</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                t: 'Empresas (clientes)',
                d: 'Cadastre vagas, acompanhe o andamento, analise candidatos anonimizados com relatórios validados e desbloqueie contatos com pagamento seguro via PIX ou cartão.',
              },
              {
                t: 'Candidatos',
                d: 'Cadastre seu currículo grátis, candidate-se a vagas, faça a entrevista online pelo celular ou computador e acompanhe suas candidaturas. Sem qualquer cobrança.',
              },
              {
                t: 'Equipe de recrutamento',
                d: 'Duas filas simples: revise vagas e candidatos, confira currículo e entrevista e aprove ou reprove. Gemini opcional e avisos preparados para envio manual pelo WhatsApp.',
              },
            ].map((c) => (
              <div key={c.t} className="card">
                <h3 className="text-lg font-semibold text-brand-900">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LGPD */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-brand-900">Privacidade e segurança em primeiro lugar</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          Dados pessoais protegidos por padrão: currículos anonimizados, contatos liberados apenas após pagamento
          confirmado no servidor, trilha de auditoria completa e direitos do titular garantidos pela LGPD.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/privacidade" className="btn-outline">
            Política de Privacidade
          </Link>
          <Link href="/termos" className="btn-outline">
            Termos de Uso
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row">
          <Logo size={32} showText />
          <p>© {new Date().getFullYear()} Triatalent. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
