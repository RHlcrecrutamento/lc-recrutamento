/**
 * Dados de demonstração e contas de teste para validação da plataforma.
 * Uso: npm run seed
 *
 * CONTAS CRIADAS (senha entre parênteses):
 *  - admin@lcrecrutamento.com.br      (Admin@123)     Administrador Triatalent
 *  - recrutador@lcrecrutamento.com.br (Recruta@123)   Recrutador Triatalent
 *  - cliente@technova.com.br          (Cliente@123)   Cliente — TechNova
 *  - cliente@redesaude.com.br         (Cliente@123)   Cliente — Rede Saúde BH
 *  - candidato@exemplo.com.br         (Candidato@123) Candidato (entrevista pendente)
 *  - ana.souza@exemplo.com.br         (Candidato@123) Candidata (liberada)
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { openDatabase } = require('./pg');

const id = (p) => `${p}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
const hash = (p) => bcrypt.hashSync(p, 10);
const now = () => new Date().toISOString();

async function main() {
if(!['localhost','127.0.0.1','::1'].includes(new URL(process.env.DATABASE_URL||'postgresql://invalid').hostname))throw new Error('SEED BLOQUEADO: somente banco LOCAL de testes. Nunca apague/crie dados demonstrativos no Supabase ou em banco real. Use npm run setup para atualizar.');
const db = openDatabase();
await db.exec(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));

// Limpa dados de demonstração anteriores (ordem respeita chaves estrangeiras)
for (const t of [
  'payment_events', 'unlocks', 'orders', 'report_notes', 'reports', 'interview_answers',
  'interview_messages', 'interviews', 'contact_attempts', 'tasks', 'applications',
  'candidates', 'jobs', 'sessions', 'users', 'companies', 'consents', 'audit_logs',
  'legal_texts',
]) {
  await db.prepare(`DELETE FROM ${t}`).run();
}

const settings = {
  price_per_unlock_cents: 4990,
  unlock_validity_days: 365,
  demo_payments: true,
  interview_min_questions: 8,
  interview_max_questions: 12,
  allow_candidate_registration: true,
  allow_public_jobs: true,
  company_name: 'Triatalent',
  support_email: 'contato@lcrecrutamento.com.br',
  retention_days_candidates: 730,
};
for (const [k, v] of Object.entries(settings)) {
  await db.prepare(`INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`).run(k, JSON.stringify(v));
}

/* ---------------- Empresas clientes ---------------- */
const techNova = id('emp');
const redeSaude = id('emp');
await db.prepare(`INSERT INTO companies (id, name, cnpj, segment, city, state, contact_email, contact_phone, plan) VALUES (?,?,?,?,?,?,?,?,?)`)
  .run(techNova, 'TechNova Sistemas Ltda', '12.345.678/0001-90', 'Tecnologia', 'Belo Horizonte', 'MG', 'rh@technova.com.br', '(31) 3333-1000', 'padrao');
await db.prepare(`INSERT INTO companies (id, name, cnpj, segment, city, state, contact_email, contact_phone, plan, price_per_unlock_cents) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  .run(redeSaude, 'Rede Saúde BH', '98.765.432/0001-10', 'Saúde', 'Belo Horizonte', 'MG', 'selecao@redesaude.com.br', '(31) 3333-2000', 'premium', 3990);

/* ---------------- Usuários ---------------- */
const admin = id('usr');
const recruiter = id('usr');
const client1 = id('usr');
const client2 = id('usr');
const candUser1 = id('usr');
const candUser2 = id('usr');

const insUser = db.prepare(`INSERT INTO users (id, name, email, password_hash, role, phone, city, state, company_id, candidate_id) VALUES (?,?,?,?,?,?,?,?,?,?)`);

await insUser.run(admin, 'Marina Costa (Admin Triatalent)', 'admin@lcrecrutamento.com.br', hash('Admin@123'), 'ADMIN', '(31) 99999-0001', 'Belo Horizonte', 'MG', null, null);
await insUser.run(recruiter, 'Rafael Lima (Recrutador)', 'recrutador@lcrecrutamento.com.br', hash('Recruta@123'), 'RECRUTADOR', '(31) 99999-0002', 'Belo Horizonte', 'MG', null, null);
await insUser.run(client1, 'Carlos Almeida (TechNova)', 'cliente@technova.com.br', hash('Cliente@123'), 'CLIENTE', '(31) 98888-0001', 'Belo Horizonte', 'MG', techNova, null);
await insUser.run(client2, 'Fernanda Rocha (Rede Saúde)', 'cliente@redesaude.com.br', hash('Cliente@123'), 'CLIENTE', '(31) 98888-0002', 'Belo Horizonte', 'MG', redeSaude, null);

/* ---------------- Vagas ---------------- */
const jobDev = id('vag');
const jobVendedor = id('vag');
const jobEnfermeiro = id('vag');
const jobCoord = id('vag');

const insJob = db.prepare(`INSERT INTO jobs (id, company_id, title, openings, description, objectives, activities, requirements_mandatory, requirements_desirable, education, courses, experience, competencies, salary_min, salary_max, benefits, contract_type, work_schedule, work_days, modality, city, state, status, is_public, public_slug, created_by, approved_by, approved_at, confidential_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

await insJob.run(jobDev, techNova, 'Desenvolvedor(a) Full Stack Pleno', 2,
  'Desenvolvimento de aplicações web para produtos SaaS da TechNova.',
  'Construir e manter funcionalidades do produto, garantindo qualidade e performance.',
  'Desenvolver APIs e interfaces web\nParticipar de code reviews\nEscrever testes automatizados\nCorrigir bugs e apoiar o time em incidentes',
  'Experiência com JavaScript/TypeScript\nExperiência com React ou similar\nExperiência com banco de dados SQL\nGit e trabalho em equipe ágil',
  'Conhecimento em Node.js\nExperiência com cloud (AWS/GCP)\nNoções de CI/CD',
  'Superior completo ou em andamento em TI', 'Cursos de desenvolvimento web', '2+ anos em desenvolvimento',
  'Comunicação\nResolução de problemas\nAutonomia\nTrabalho em equipe',
  650000, 900000, 'Vale-refeição\nPlano de saúde\nSeguro de vida\nHome office parcial', 'CLT', 'Comercial', 'Segunda a sexta', 'Híbrido', 'Belo Horizonte', 'MG',
  'em_recrutamento', 1, 'vaga-dev-fullstack-pleno', recruiter, admin, now(), 'Faixa salarial interna até R$ 9.500 para candidatos excepcionais.');

await insJob.run(jobVendedor, techNova, 'Consultor(a) Comercial', 1,
  'Venda de soluções de software para empresas em Minas Gerais.',
  'Prospectar clientes, apresentar soluções e atingir metas de receita.',
  'Prospectar e atender clientes\nApresentar soluções da empresa\nNegociar contratos\nAtualizar o CRM',
  'Experiência em vendas B2B\nBoa comunicação\nDisponibilidade para visitas\nConhecimento básico de informática',
  'Experiência com CRM\nFormação em administração, marketing ou áreas afins',
  'Ensino médio completo', 'Curso de vendas ou negociação', '1+ ano em vendas',
  'Comunicação\nNegociação\nOrientação a resultados\nOrganização',
  250000, 400000, 'Comissão variável\nVale-alimentação\nPlano de saúde', 'CLT', 'Comercial', 'Segunda a sexta', 'Presencial', 'Belo Horizonte', 'MG',
  'aprovada', 1, 'vaga-consultor-comercial', client1, admin, now(), null);

await insJob.run(jobEnfermeiro, redeSaude, 'Enfermeiro(a) Clínico(a) — Plantão', 3,
  'Assistência de enfermagem em unidade hospitalar da Rede Saúde BH.',
  'Prestar assistência segura aos pacientes e apoiar a equipe multiprofissional.',
  'Administrar medicações\nRealizar curativos e procedimentos\nRegistrar evoluções de enfermagem\nAcompanhar sinais vitais',
  'Coren ativo\nExperiência em ambiente hospitalar\nDisponibilidade para plantões\nCurso de BLS/ACLS',
  'Experiência em UTI\nPós-graduação em enfermagem',
  'Superior completo em Enfermagem', 'BLS/ACLS obrigatório', '1+ ano em hospitalar',
  'Empatia\nTrabalho sob pressão\nRigor técnico\nComunicação',
  320000, 480000, 'Adicional noturno\nVale-refeição\nPlano de saúde', 'CLT', '12x36', 'Escalas e plantões', 'Presencial', 'Belo Horizonte', 'MG',
  'em_recrutamento', 0, null, recruiter, admin, now(), 'Custo por vaga aprovado até R$ 5.200.');

await insJob.run(jobCoord, techNova, 'Coordenador(a) de Operações', 1,
  'Coordenação da equipe de operações e melhoria de processos.',
  'Liderar a equipe, garantir indicadores e otimizar processos.',
  'Liderar equipe de 15 pessoas\nAcompanhar KPIs operacionais\nPlanejar escalas e metas\nRelacionamento com áreas internas',
  'Experiência em liderança de equipes\nDomínio de indicadores de gestão\nExcel avançado\nExperiência em processos operacionais',
  'MBA ou pós em gestão\nExperiência com Lean/Six Sigma',
  'Superior completo', 'Pós-graduação em gestão desejável', '3+ anos em liderança',
  'Liderança\nGestão de pessoas\nOrientação a dados\nComunicação',
  800000, 1100000, 'PLR\nPlano de saúde\nVale-refeição\nAuxílio-creche', 'CLT', 'Comercial', 'Segunda a sexta', 'Híbrido', 'Belo Horizonte', 'MG',
  'rascunho', 0, null, client1, null, null, null);

/* ---------------- Candidatos ---------------- */
async function insertCandidate(name, email, phone, title, summary, extra = {}) {
  const cid = id('cnd');
  await db.prepare(`INSERT INTO candidates (id, name, email, phone, whatsapp, cpf, city, state, title, professional_summary, education, courses, skills, experience, availability, salary_expectation, origin, consent_version, consent_at, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    cid, name, email, phone, extra.whatsapp || phone, extra.cpf || null,
    extra.city || 'Belo Horizonte', extra.state || 'MG', title, summary,
    extra.education || 'Ensino Superior completo',
    extra.courses || 'Cursos profissionalizantes na área',
    extra.skills || 'Comunicação; Organização; Trabalho em equipe',
    extra.experience || summary,
    extra.availability || 'Imediata',
    extra.salary_expectation || 'A combinar',
    extra.origin || 'Cadastro manual',
    'v1.0', now(), recruiter
  );
  return cid;
}

const ana = await insertCandidate('Ana Paula Souza', 'ana.souza@exemplo.com.br', '(31) 99111-2222', 'Desenvolvedora Full Stack Pleno',
  'Desenvolvedora com 4 anos de experiência em React, Node.js e PostgreSQL. Atuou em produtos SaaS, APIs REST e testes automatizados.',
  {
    education: 'Superior completo em Sistemas de Informação (2020)',
    courses: 'Rocketseat Ignite; Alura — Node.js; AWS Cloud Practitioner',
    skills: 'TypeScript; React; Node.js; PostgreSQL; Git; Jest; Docker',
    experience: '2021–hoje: Dev Full Stack na SoftMine (APIs Node, front React). 2019–2021: Dev Júnior na DataBh (relatórios e integrações).',
    availability: 'Avisar 30 dias (atual emprego)',
    salary_expectation: 'R$ 7.500',
    cpf: '123.456.789-00',
    origin: 'Banco de talentos',
  });

const bruno = await insertCandidate('Bruno Ferreira', 'bruno.ferreira@exemplo.com.br', '(31) 99222-3333', 'Consultor Comercial',
  'Profissional de vendas B2B com 3 anos de experiência em prospecção, negociação e gestão de carteira.',
  {
    education: 'Superior incompleto em Administração',
    courses: 'Curso de Negociação — FGV Start',
    skills: 'Prospecção; Negociação; CRM; Excel; Comunicação',
    experience: '2022–hoje: Consultor comercial na VendeMais. 2021–2022: Assistente comercial na LojaCenter.',
    salary_expectation: 'R$ 2.800 + comissões',
    cpf: '987.654.321-00',
  });

const carla = await insertCandidate('Carla Mendes', 'carla.mendes@exemplo.com.br', '(31) 99333-4444', 'Enfermeira Clínica',
  'Enfermeira com 5 anos de experiência em clínica médica e emergência, BLS/ACLS ativos.',
  {
    education: 'Superior completo em Enfermagem (2019); Pós-graduação em Urgência e Emergência',
    courses: 'BLS; ACLS; Curativos avançados',
    skills: 'Administração de medicações; Curativos; Sinais vitais; Equipe multiprofissional',
    experience: '2019–hoje: Enfermeira no Hospital Santa Clara — plantões 12x36 em clínica médica.',
    availability: 'Escalas 12x36',
    salary_expectation: 'R$ 4.200',
    cpf: '456.789.123-00',
  });

const diego = await insertCandidate('Diego Martins', 'diego.martins@exemplo.com.br', '(31) 99444-5555', 'Analista de Operações / Coordenador',
  'Gestor de operações com 6 anos de experiência liderando equipes e melhorando indicadores.',
  {
    education: 'Superior completo em Engenharia de Produção; MBA em Gestão de Pessoas',
    courses: 'Lean Six Sigma Green Belt',
    skills: 'Liderança; KPIs; Lean; Excel avançado; Gestão de escalas',
    experience: '2020–hoje: Coordenador de Operações na LogExpress (equipe de 18 pessoas).',
    salary_expectation: 'R$ 9.000',
    cpf: '789.123.456-00',
  });

const elisa = await insertCandidate('Elisa Nogueira', 'elisa.nogueira@exemplo.com.br', '(31) 99555-6666', 'Desenvolvedora Front-end',
  'Desenvolvedora front-end com experiência em React e interfaces responsivas.',
  {
    education: 'Superior completo em Análise e Desenvolvimento de Sistemas',
    skills: 'React; TypeScript; HTML; CSS; Figma',
    experience: '2022–hoje: Dev Front-end na WebArt.',
    salary_expectation: 'R$ 6.000',
    cpf: '321.654.987-00',
  });

// Usuários do portal do candidato
await insUser.run(candUser1, 'Ana Paula Souza', 'ana.souza@exemplo.com.br', hash('Candidato@123'), 'CANDIDATO', '(31) 99111-2222', 'Belo Horizonte', 'MG', null, ana);
await db.prepare(`UPDATE candidates SET user_id = ? WHERE id = ?`).run(candUser1, ana);
await insUser.run(candUser2, 'Bruno Ferreira', 'bruno.ferreira@exemplo.com.br', hash('Candidato@123'), 'CANDIDATO', '(31) 99222-3333', 'Belo Horizonte', 'MG', null, bruno);
await db.prepare(`UPDATE candidates SET user_id = ? WHERE id = ?`).run(candUser2, bruno);

for (const c of [ana, bruno, carla, diego, elisa]) {
  await db.prepare(`INSERT INTO consents (id, candidate_id, version, purpose, legal_basis, granted) VALUES (?,?,?,?,?,1)`).run(id('cns'), c, 'v1.0', 'Recrutamento e seleção', 'Consentimento / Legítimo interesse (LGPD art. 7º)');
}

/* ---------------- Candidaturas em etapas distintas ---------------- */
const insApp = db.prepare(`INSERT INTO applications (id, candidate_id, job_id, recruiter_id, stage, stage_key, source, released_at, released_by, client_interest, client_interest_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

// 1) Ana — DEV — entrevista CONCLUÍDA + relatório VALIDADO + LIBERADA + interesse + DESBLOQUEADA
const appAna = id('apl');
await insApp.run(appAna, ana, jobDev, recruiter, 13, 'dados_desbloqueados', 'Banco de talentos', now(), recruiter, 'sim', now());

// 2) Bruno — VENDEDOR — entrevista CONCLUÍDA + relatório VALIDADO + LIBERADA (sem pagamento)
const appBruno = id('apl');
await insApp.run(appBruno, bruno, jobVendedor, recruiter, 11, 'liberado_para_cliente', 'Indicação', now(), recruiter, null, null);

// 3) Carla — ENFERMEIRA — entrevista PENDENTE (convite enviado) → NÃO pode aparecer ao cliente
const appCarla = id('apl');
await insApp.run(appCarla, carla, jobEnfermeiro, recruiter, 3, 'convite_enviado', 'Cadastro manual', null, null, null, null);

// 4) Diego — COORDENADOR — entrevista CONCLUÍDA mas relatório AGUARDANDO REVISÃO → NÃO pode aparecer
const appDiego = id('apl');
await insApp.run(appDiego, diego, jobDev, recruiter, 8, 'relatorio_aguardando_revisao', 'LinkedIn', null, null, null, null);

// 5) Elisa — DEV — entrevista EM ANDAMENTO → NÃO pode aparecer
const appElisa = id('apl');
await insApp.run(appElisa, elisa, jobDev, recruiter, 6, 'entrevista_em_andamento', 'Site', null, null, null, null);

// 6) Ana também na vaga de Coordenadora? Não — mantém vínculo único realista.
// Segundo cliente NÃO pode ver nada da TechNova: appBruno está na vaga da TechNova; appCarla na Rede Saúde.

/* ---------------- Entrevistas ---------------- */
const mkQuestions = (family) => JSON.stringify({
  mode: 'estruturada', family,
  intro: 'Olá! Sou o assistente de entrevista da Triatalent.',
  consent_text: 'Entrevista assistida por IA, revisada por humanos. Sem áudio/vídeo. Dados tratados conforme LGPD.',
  questions: [
    { key: 'exp_1', category: 'Experiência', question: 'Descreva sua experiência profissional relacionada à vaga.' },
    { key: 'tec_1', category: 'Conhecimentos técnicos', question: 'Quais ferramentas e técnicas você utiliza?' },
    { key: 'sit_1', category: 'Situação prática', question: 'Conte um problema difícil que você resolveu.' },
    { key: 'req_1', category: 'Requisito obrigatório', question: 'Descreva experiência concreta com o requisito principal da vaga.' },
    { key: 'req_2', category: 'Requisito desejável', question: 'Você tem experiência com o requisito desejável da vaga?' },
    { key: 'comp_1', category: 'Competência', question: 'Situação em que você demonstrou comunicação e trabalho em equipe.' },
    { key: 'disp_1', category: 'Disponibilidade', question: 'Qual sua disponibilidade de início?' },
    { key: 'sal_1', category: 'Condições', question: 'Pretensão salarial (opcional).' },
  ],
});

const insInterview = db.prepare(`INSERT INTO interviews (id, application_id, token, status, mode, ai_enabled, started_at, completed_at, question_plan_json, consent_version, consent_at, invite_sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
const insMsg = db.prepare(`INSERT INTO interview_messages (id, interview_id, seq, role, content, created_at) VALUES (?,?,?,?,?,?)`);
const insAns = db.prepare(`INSERT INTO interview_answers (id, interview_id, question_key, category, question, answer, created_at) VALUES (?,?,?,?,?,?,?)`);

async function addAnswers(interviewId, entries) {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    await insAns.run(id('ans'), interviewId, e.key, e.cat, e.q, e.a, now());
    await insMsg.run(id('msg'), interviewId, i * 2 + 2, 'candidate', e.a, now());
  }
}

// Entrevista CONCLUÍDA da Ana
const intAna = id('int');
await insInterview.run(intAna, appAna, 'token_ana_demo123', 'concluida', 'estruturada', 0, now(), now(), mkQuestions('tecnica'), 'v1.0', now(), now());
await addAnswers(intAna, [
  { key: 'exp_1', cat: 'Experiência', q: 'Descreva sua experiência profissional relacionada à vaga.', a: 'Tenho 4 anos como desenvolvedora full stack. Na SoftMine desenvolvo APIs em Node.js e interfaces em React para um produto SaaS com 20 mil usuários. Também escrevo testes com Jest e participo de code reviews.' },
  { key: 'tec_1', cat: 'Conhecimentos técnicos', q: 'Quais ferramentas e técnicas você utiliza?', a: 'TypeScript, React, Node.js, PostgreSQL, Docker, Git e Jest no dia a dia. Já usei AWS (EC2, S3) em deploy e integração contínua com GitHub Actions.' },
  { key: 'sit_1', cat: 'Situação prática', q: 'Conte um problema difícil que você resolveu.', a: 'Tivemos uma API com lentidão crítica em horário de pico. Analisei logs, identifiquei queries sem índice em PostgreSQL, criei índices e refatorei o acesso a dados. O tempo de resposta caiu de 2s para 200ms.' },
  { key: 'req_1', cat: 'Requisito obrigatório', q: 'Descreva experiência concreta com JavaScript/TypeScript.', a: 'Uso JavaScript/TypeScript diariamente há 4 anos, em backend Node.js e frontend React, incluindo tipagem forte com TypeScript em projetos grandes.' },
  { key: 'req_2', cat: 'Requisito desejável', q: 'Você tem experiência com cloud (AWS/GCP)?', a: 'Sim, na AWS: deploys em EC2, arquivos no S3 e pipelines no GitHub Actions. Não tenho experiência formal com GCP.' },
  { key: 'comp_1', cat: 'Competência', q: 'Situação em que você demonstrou comunicação e trabalho em equipe.', a: 'Durante uma migração de banco, organizei reuniões diárias curtas com o time, documentei o plano e dividi tarefas. Concluímos sem downtime e isso melhorou a comunicação entre front e back.' },
  { key: 'disp_1', cat: 'Disponibilidade', q: 'Qual sua disponibilidade de início?', a: 'Preciso avisar meu emprego atual com 30 dias de antecedência.' },
  { key: 'sal_1', cat: 'Condições', q: 'Pretensão salarial (opcional).', a: 'R$ 7.500, mas estou aberta a conversar conforme o pacote de benefícios.' },
]);

// Entrevista CONCLUÍDA do Bruno
const intBruno = id('int');
await insInterview.run(intBruno, appBruno, 'token_bruno_demo123', 'concluida', 'estruturada', 0, now(), now(), mkQuestions('operacional'), 'v1.0', now(), now());
await addAnswers(intBruno, [
  { key: 'exp_1', cat: 'Experiência', q: 'Descreva sua experiência profissional relacionada à vaga.', a: 'Trabalho há 3 anos com vendas B2B: prospecção ativa, visitas a clientes em BH, apresentação de soluções e fechamento de contratos. Bati 120% da meta em 2024.' },
  { key: 'tec_1', cat: 'Conhecimentos técnicos', q: 'Quais ferramentas e técnicas você utiliza?', a: 'Uso CRM Pipedrive diariamente, Excel para análise de carteira e técnicas de negociação aprendidas em curso na FGV.' },
  { key: 'sit_1', cat: 'Situação prática', q: 'Conte um problema difícil que você resolveu.', a: 'Perdi um grande cliente por preço. Reestruturei a proposta com foco em ROI, trazendo um case parecido. Reconquistei o contrato em 60 dias.' },
  { key: 'req_1', cat: 'Requisito obrigatório', q: 'Descreva experiência concreta em vendas B2B.', a: '3 anos de vendas B2B de software e serviços para empresas de médio porte em Minas Gerais, com ciclo de vendas de 30 a 90 dias.' },
  { key: 'req_2', cat: 'Requisito desejável', q: 'Você tem experiência com CRM?', a: 'Sim, Pipedrive e HubSpot, incluindo cadastro de atividades e previsão de vendas.' },
  { key: 'comp_1', cat: 'Competência', q: 'Situação em que você demonstrou comunicação e negociação.', a: 'Em uma negociação com um cliente resistente, usei escuta ativa e proposta de teste piloto. Resultado: contrato anual de R$ 48 mil.' },
  { key: 'disp_1', cat: 'Disponibilidade', q: 'Qual sua disponibilidade de início?', a: 'Imediata, inclusive para visitas em Belo Horizonte e região.' },
  { key: 'sal_1', cat: 'Condições', q: 'Pretensão salarial (opcional).', a: 'R$ 2.800 fixo mais comissões, modelo que já sigo hoje.' },
]);

// Entrevista EM ANDAMENTO da Elisa (parcial)
const intElisa = id('int');
await insInterview.run(intElisa, appElisa, 'token_elisa_demo123', 'em_andamento', 'estruturada', 0, now(), null, mkQuestions('tecnica'), 'v1.0', now(), now());
await addAnswers(intElisa, [
  { key: 'exp_1', cat: 'Experiência', q: 'Descreva sua experiência profissional relacionada à vaga.', a: 'Sou desenvolvedora front-end há 2 anos, trabalho com React e TypeScript na WebArt.' },
]);

// Entrevista CONCLUÍDA do Diego (relatório pendente)
const intDiego = id('int');
await insInterview.run(intDiego, appDiego, 'token_diego_demo123', 'concluida', 'estruturada', 0, now(), now(), mkQuestions('lideranca'), 'v1.0', now(), now());
await addAnswers(intDiego, [
  { key: 'exp_1', cat: 'Experiência', q: 'Descreva sua experiência profissional relacionada à vaga.', a: 'Coordeno operações há 6 anos, lidero 18 pessoas na LogExpress e sou responsável por KPIs de produtividade e qualidade.' },
  { key: 'tec_1', cat: 'Conhecimentos técnicos', q: 'Quais ferramentas e técnicas você utiliza?', a: 'Excel avançado, Power BI, metodologia Lean e gestão de escalas em sistema ERP.' },
  { key: 'sit_1', cat: 'Situação prática', q: 'Conte um problema difícil que você resolveu.', a: 'A entrega com atraso em 15% dos pedidos. Mapeei o fluxo com a equipe, padronizei o checklist de expedição e o atraso caiu para 3% em três meses.' },
  { key: 'req_1', cat: 'Requisito obrigatório', q: 'Descreva experiência concreta em liderança de equipes.', a: 'Lidero equipe de 18 pessoas há 6 anos, incluindo recrutamento, treinamento, feedbacks e gestão de desempenho.' },
  { key: 'req_2', cat: 'Requisito desejável', q: 'Você tem experiência com Lean/Six Sigma?', a: 'Sim, sou Green Belt e já apliquei eventos kaizen em expedição e recebimento.' },
  { key: 'comp_1', cat: 'Competência', q: 'Situação em que você demonstrou liderança.', a: 'Assumi uma área com alto turnover, criei plano de desenvolvimento individual e reduzi a rotatividade em 40% em um ano.' },
  { key: 'disp_1', cat: 'Disponibilidade', q: 'Qual sua disponibilidade de início?', a: 'Combinar com 30 dias.' },
  { key: 'sal_1', cat: 'Condições', q: 'Pretensão salarial (opcional).', a: 'R$ 9.000.' },
]);

// Convite pendente da Carla (sem entrevista iniciada)
const intCarla = id('int');
await insInterview.run(intCarla, appCarla, 'token_carla_demo123', 'convite_enviado', 'estruturada', 0, null, null, mkQuestions('geral'), null, null, now());

/* ---------------- Relatórios ---------------- */
const insReport = db.prepare(`INSERT INTO reports (id, interview_id, application_id, status, generator, professional_summary, competencies_json, requirements_met_json, requirements_unmet_json, requirements_insufficient_json, confirm_points_json, next_questions_json, compatibility_score, compatibility_justification, weights_json, public_summary_json, reviewed_by, reviewed_at, validation_notes, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const reportAna = id('rel');
await insReport.run(reportAna, intAna, appAna, 'validado', 'estruturada',
  'Com base nas respostas: desenvolvedora full stack com 4 anos de experiência em React, Node.js e PostgreSQL, atuação em produto SaaS e práticas de testes e code review.',
  JSON.stringify([
    { name: 'Comunicação', evidence: 'Organizou reuniões e documentação durante migração de banco.', level: 'demonstrada' },
    { name: 'Resolução de problemas', evidence: 'Otimização de queries reduziu tempo de resposta de 2s para 200ms.', level: 'demonstrada' },
    { name: 'Autonomia', evidence: 'Atuação full stack em produto SaaS de grande escala.', level: 'demonstrada' },
    { name: 'Trabalho em equipe', evidence: 'Migração conduzida com o time front/back.', level: 'demonstrada' },
  ]),
  JSON.stringify([
    { requirement: 'Experiência com JavaScript/TypeScript', evidence: 'Uso diário há 4 anos em Node.js e React.' },
    { requirement: 'Experiência com React ou similar', evidence: 'Interfaces em React no produto SaaS da SoftMine.' },
    { requirement: 'Experiência com banco de dados SQL', evidence: 'PostgreSQL em produção, incluindo tuning de queries.' },
    { requirement: 'Git e trabalho em equipe ágil', evidence: 'Code reviews e trabalho em time ágil.' },
    { requirement: 'Conhecimento em Node.js (desejável)', evidence: 'APIs em Node.js na SoftMine.' },
    { requirement: 'Experiência com cloud (desejável)', evidence: 'AWS: EC2, S3 e GitHub Actions.' },
  ]),
  JSON.stringify([]),
  JSON.stringify([
    { requirement: 'Noções de CI/CD (desejável)', reason: 'Mencionou GitHub Actions, mas sem detalhamento suficiente — não foi possível avaliar em profundidade.' },
  ]),
  JSON.stringify(['Confirmar prazo de aviso de 30 dias no emprego atual.', 'Pretensão salarial informada: R$ 7.500.']),
  JSON.stringify(['Aprofundar experiência com testes automatizados.', 'Explorar vivência com AWS em produção.', 'Confirmar pretensão salarial final.']),
  88,
  'Pontuação por critérios verificáveis: 6 de 7 requisitos com evidência nas respostas (peso 70); respostas substantivas e com exemplos (peso 20); nenhuma incompatibilidade declarada (peso 10). Requisito de CI/CD classificado como não informado, não como não atendido.',
  JSON.stringify({ requisitos_obrigatorios: 70, qualidade_das_respostas: 20, ausencia_de_incompatibilidades: 10 }),
  JSON.stringify({ summary: 'Dev full stack com 4 anos em React/Node/PostgreSQL, experiência em SaaS e otimização de performance.', strengths: ['TypeScript', 'React', 'PostgreSQL', 'AWS'], points_to_confirm: ['Prazo de aviso: 30 dias'], score: 88 }),
  recruiter, now(), 'Relatório revisado e validado. Informações coerentes com o currículo.', now());

const reportBruno = id('rel');
await insReport.run(reportBruno, intBruno, appBruno, 'validado', 'estruturada',
  'Com base nas respostas: consultor comercial B2B com 3 anos, histórico de superação de metas e reconquista de clientes.',
  JSON.stringify([
    { name: 'Comunicação', evidence: 'Escuta ativa em negociação de contrato anual de R$ 48 mil.', level: 'demonstrada' },
    { name: 'Orientação a resultados', evidence: '120% da meta em 2024.', level: 'demonstrada' },
    { name: 'Negociação', evidence: 'Reconquista de cliente perdido por preço com proposta de ROI.', level: 'demonstrada' },
    { name: 'Organização', evidence: 'Gestão de carteira com CRM e Excel.', level: 'parcial' },
  ]),
  JSON.stringify([
    { requirement: 'Experiência em vendas B2B', evidence: '3 anos em vendas B2B de software e serviços.' },
    { requirement: 'Boa comunicação', evidence: 'Descrita em exemplos de negociação.' },
    { requirement: 'Disponibilidade para visitas', evidence: 'Confirmou disponibilidade imediata para visitas em BH.' },
    { requirement: 'Conhecimento básico de informática', evidence: 'Uso de CRM e Excel.' },
    { requirement: 'Experiência com CRM (desejável)', evidence: 'Pipedrive e HubSpot.' },
  ]),
  JSON.stringify([]),
  JSON.stringify([
    { requirement: 'Formação em administração/marketing (desejável)', reason: 'Informou superior incompleto em Administração sem conclusão — sem evidência suficiente para avaliar o requisito desejável.' },
  ]),
  JSON.stringify(['Disponibilidade imediata confirmada.', 'Pretensão: R$ 2.800 + comissões.']),
  JSON.stringify(['Aprofundar experiência com ciclo de vendas longo.', 'Confirmar disponibilidade para metas agressivas.']),
  84,
  'Pontuação por critérios verificáveis: 5 de 6 requisitos com evidência (peso 70); respostas com exemplos concretos (peso 20); sem incompatibilidades declaradas (peso 10).',
  JSON.stringify({ requisitos_obrigatorios: 70, qualidade_das_respostas: 20, ausencia_de_incompatibilidades: 10 }),
  JSON.stringify({ summary: 'Consultor comercial B2B com 3 anos, 120% da meta em 2024, experiência com CRM.', strengths: ['Vendas B2B', 'Negociação', 'CRM'], points_to_confirm: ['Formação não concluída'], score: 84 }),
  recruiter, now(), 'Validado após conferência com currículo.', now());

// Diego: relatório gerado mas AGUARDANDO REVISÃO (não publicado)
const reportDiego = id('rel');
await insReport.run(reportDiego, intDiego, appDiego, 'aguardando_revisao', 'estruturada',
  'Com base nas respostas: gestor de operações com 6 anos de liderança de equipe de 18 pessoas e experiência em Lean.',
  JSON.stringify([
    { name: 'Liderança', evidence: '6 anos liderando 18 pessoas, plano de desenvolvimento reduziu turnover em 40%.', level: 'demonstrada' },
    { name: 'Orientação a dados', evidence: 'KPIs de produtividade e Power BI.', level: 'demonstrada' },
  ]),
  JSON.stringify([
    { requirement: 'Experiência em liderança de equipes', evidence: '6 anos liderando 18 pessoas.' },
    { requirement: 'Domínio de indicadores de gestão', evidence: 'KPIs, Power BI e gestão por metas.' },
  ]),
  JSON.stringify([]),
  JSON.stringify([
    { requirement: 'Excel avançado', reason: 'Citou Excel avançado, mas sem exemplo detalhado na entrevista.' },
    { requirement: 'Experiência em processos operacionais', reason: 'Parcialmente respondido — requer confirmação.' },
  ]),
  JSON.stringify(['Confirmar experiência detalhada com Excel.']),
  JSON.stringify(['Explorar vivência com orçamento e gestão de custos.']),
  72,
  'Pontuação preliminar aguardando revisão humana. 2 requisitos com evidência, 2 sem informação suficiente.',
  JSON.stringify({ requisitos_obrigatorios: 70, qualidade_das_respostas: 20, ausencia_de_incompatibilidades: 10 }),
  JSON.stringify({ summary: 'Gestor de operações com 6 anos de liderança.', strengths: ['Liderança', 'Lean'], points_to_confirm: ['Excel avançado'], score: 72 }),
  null, null, null, null);

/* ---------------- Pedidos e desbloqueios ---------------- */
const orderAna = id('ord');
await db.prepare(`INSERT INTO orders (id, client_user_id, company_id, application_id, candidate_id, amount_cents, currency, status, gateway, gateway_preference_id, gateway_payment_id, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
  .run(orderAna, client1, techNova, appAna, ana, 4990, 'BRL', 'aprovado', 'demo', `demo:${orderAna}`, 'demo_pay_0001', now());
await db.prepare(`INSERT INTO payment_events (id, order_id, event_type, payload_json) VALUES (?,?,?,?)`).run(id('evt'), orderAna, 'aprovado_demo', JSON.stringify({ nota: 'Pagamento de demonstração aprovado' }));
await db.prepare(`INSERT INTO unlocks (id, order_id, application_id, candidate_id, company_id, unlocked_by, fields_json, expires_at) VALUES (?,?,?,?,?,?,?,?)`)
  .run(id('unl'), orderAna, appAna, ana, techNova, client1, JSON.stringify({ name: true, email: true, phone: true, whatsapp: true }), new Date(Date.now() + 365 * 86400000).toISOString());

const orderBruno = id('ord');
await db.prepare(`INSERT INTO orders (id, client_user_id, company_id, application_id, candidate_id, amount_cents, currency, status, gateway, gateway_preference_id) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  .run(orderBruno, client1, techNova, appBruno, bruno, 4990, 'BRL', 'pendente', 'demo', `demo:${orderBruno}`);

/* ---------------- Tarefas e tentativas de contato ---------------- */
await db.prepare(`INSERT INTO tasks (id, owner_id, application_id, title, description, due_date, status) VALUES (?,?,?,?,?,?,?)`)
  .run(id('tsk'), recruiter, appCarla, 'Reenviar convite de entrevista — Enfermeiro(a)', 'Candidata não iniciou a entrevista. Confirmar recebimento do convite.', new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), 'pendente');
await db.prepare(`INSERT INTO contact_attempts (id, application_id, recruiter_id, attempt_type, notes) VALUES (?,?,?,?,?)`)
  .run(id('cta'), appCarla, recruiter, 'WhatsApp', 'Primeiro convite enviado por e-mail. Aguardando retorno.');

/* ---------------- Textos legais (LGPD) ---------------- */
const insLegal = db.prepare(`INSERT INTO legal_texts (id, type, version, title, content) VALUES (?,?,?,?,?)`);
await insLegal.run(id('lgl'), 'privacidade', 'v1.0', 'Política de Privacidade — Triatalent',
  `A Triatalent trata dados pessoais para finalidades de recrutamento e seleção, com base no consentimento e no legítimo interesse (Lei 13.709/2018 — LGPD).

Dados coletados: dados de identificação, profissionais, formação, experiências e respostas de entrevistas. Não coletamos dados sensíveis como critério de seleção.

Finalidades: cadastro de candidatos, gestão de vagas, realização de entrevistas assistidas por inteligência artificial (com revisão humana), apresentação anonimizada de perfis a empresas contratantes e, mediante pagamento, liberação de dados de contato autorizados.

Compartilhamento: dados identificadores são liberados somente após pagamento confirmado. Currículos são apresentados de forma anonimizada (sem nome, telefone, e-mail, CPF, endereço, foto ou links pessoais).

Retenção: dados mantidos pelo prazo de 2 anos, salvo obrigação legal. Você pode solicitar acesso, correção, portabilidade ou eliminação dos seus dados pelo e-mail de suporte.

Encarregado (DPO): contato@lcrecrutamento.com.br — textos sujeitos a revisão jurídica.`);

await insLegal.run(id('lgl'), 'termos', 'v1.0', 'Termos de Uso — Triatalent',
  `Estes termos regulam o uso da plataforma Triatalent por clientes, candidatos e equipe de recrutamento.

1. As vagas são cadastradas por empresas clientes e aprovadas pela equipe Triatalent.
2. Candidatos participam de entrevistas online assistidas por inteligência artificial, sempre revisadas por profissionais humanos.
3. A IA auxilia na organização de perguntas e relatórios, mas não decide aprovação ou reprovação.
4. Clientes visualizam apenas currículos anonimizados de candidatos com entrevista concluída e relatório validado.
5. O desbloqueio de dados de contato é pago e confirmado no servidor; não há cobrança ao candidato.
6. É proibido usar a plataforma para fins discriminatórios ou em desconformidade com a LGPD.
7. Pagamentos seguem as regras comerciais informadas no ato da compra, com direito de reembolso conforme legislação aplicável.`);

await insLegal.run(id('lgl'), 'entrevista', 'v1.0', 'Aviso sobre a Entrevista com IA',
  `A entrevista online utiliza apoio de inteligência artificial para gerar perguntas personalizadas com base na vaga e para organizar um relatório estruturado das suas respostas. Não há gravação de áudio ou vídeo. Todas as respostas são analisadas por recrutadores humanos antes de qualquer decisão. A IA não inventa informações nem decide sozinha sobre sua aprovação. Você pode solicitar correção ou exclusão dos seus dados a qualquer momento.`);

/* ---------------- Auditoria inicial ---------------- */
const insAudit = db.prepare(`INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details_json) VALUES (?,?,?,?,?,?)`);
await insAudit.run(id('log'), admin, 'seed_executado', 'sistema', null, JSON.stringify({ contas: 'ver README' }));
await insAudit.run(id('log'), recruiter, 'candidato_liberado', 'applications', appAna, JSON.stringify({ motivo: 'Relatório validado após revisão' }));
await insAudit.run(id('log'), client1, 'pagamento_aprovado', 'orders', orderAna, JSON.stringify({ valor: 4990 }));
await insAudit.run(id('log'), client1, 'dados_desbloqueados', 'unlocks', orderAna, JSON.stringify({ application: appAna }));

await db.close();
console.log('✔ Dados de demonstração criados com sucesso.');
console.log('');
console.log('CONTAS DE TESTE (guarde estas informações):');
console.log('  Admin Triatalent:      admin@lcrecrutamento.com.br / Admin@123');
console.log('  Recrutador:    recrutador@lcrecrutamento.com.br / Recruta@123');
console.log('  Cliente 1:     cliente@technova.com.br / Cliente@123');
console.log('  Cliente 2:     cliente@redesaude.com.br / Cliente@123');
console.log('  Candidata Ana: ana.souza@exemplo.com.br / Candidato@123');
console.log('  Candidato Bruno: bruno.ferreira@exemplo.com.br / Candidato@123');
}

main().catch((e) => {
  console.error('\n  [ERRO] Não consegui criar os dados de demonstração.');
  console.error('  ', e.message);
  console.error('\n  Rode antes: npm run setup\n');
  process.exit(1);
});
