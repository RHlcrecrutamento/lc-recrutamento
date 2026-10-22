/** Verificação sem acesso ao banco ou segredos: impede compilar um envio incompleto. */
const fs = require('fs');
const path = require('path');
const checks = [
 ['src/lib/ai.ts',['ESSENTIAL_QUESTIONS','GEMINI_RECRUITMENT_ENABLED','GEMINI_DATA_POLICY','GEMINI_ADULTS_ONLY','generateContent','normalizeEmployment'],[]],
 ['src/lib/triage.ts',['reviewApplication','reviewJob','notification_drafts'],[]],
 ['src/components/SimpleReviewDashboard.tsx',['Vagas aguardando','Candidatos aguardando'],[]],
 ['src/components/CandidateReviewForm.tsx',['Aprovar para apresentar','Reprovar para esta vaga'],[]],
 ['src/app/api/triagem/candidatos/[id]/route.ts',['reviewApplication'],[]],
 ['src/app/(painel)/recrutamento/analise/[id]/page.tsx',['CandidateReviewForm','JobDetails'],[]],
 ['public/triatalent-atualizacao.txt',['TRIATALENT_SIMPLES_GEMINI_V4'],[]],
  ['src/lib/payments.ts', ['syncMercadoPagoPayment', 'timingSafeEqual', 'mpConfig', '/users/me'], ['cai para demo']],
  ['src/components/JobForm.tsx', ['SALARY_EXTRAS', 'benefits_config', 'moneyInput'], []],
  ['src/components/ClientCandidateActions.tsx', ['Aprovar candidato e seguir para pagamento','Reprovar candidato'], ['Solicitar entrevista']],
  ['src/components/ResumeReview.tsx', ['Revisei manualmente', 'source_hash'], []],
  ['src/lib/resumes.ts', ['resumeSourceHash', 'reviewedResume'], []],
  ['src/lib/payment-rules.ts', ['validUnlockSql', 'localDemoAllowed'], []],
  ['schema.sql', ['candidate_public_resumes', 'checkout_expires_at', 'benefits_config_json'], []],
  ['src/app/api/pagamentos/pedido/[id]/route.ts', ['reconcileOrder'], []],
  ['src/app/(painel)/cliente/desbloqueios/page.tsx', ['validUnlockSql'], []],
  ['src/app/(painel)/cliente/pagamentos/[id]/page.tsx', ['PaymentStatus'], []],
  ['src/app/api/candidatos/[id]/curriculo-publico/route.ts', ['resumeSourceHash'], []],
  ['public/triatalent-atualizacao.txt', ['TRIATALENT_CLIENTE_PAGAMENTO_V3'], []],
  ['src/components/ApplyForm.tsx', ['Candidatar-me e fazer a entrevista', '/candidatar/'], ['setSent(', 'Enviar candidatura']],
  ['src/components/RegisterForm.tsx', ['jobId', '/candidatar/', 'Cadastrar e ir para a entrevista'], []],
  ['src/components/LoginForm.tsx', ['jobId', '/candidatar/'], []],
  ['src/components/StartApplication.tsx', ["'use client'", '/api/candidaturas/inscricao', 'interview_url'], []],
  ['src/components/CopyInterviewLink.tsx', ["'use client'", 'writeText', 'manualLink'], []],
  ['src/app/candidatar/[id]/page.tsx', ['StartApplication', 'force-dynamic'], []],
  ['src/app/cadastro/page.tsx', ['force-dynamic', 'jobId', '/candidatar/'], []],
  ['src/app/entrar/candidato/page.tsx', ['force-dynamic', 'jobId', '/candidatar/'], []],
  ['src/app/api/candidaturas/inscricao/route.ts', ["requireUser(['CANDIDATO'])", 'pg_advisory_xact_lock', 'interview_url'], []],
  ['src/app/api/auth/cadastro/route.ts', ['getSessionUser'], []],
  ['src/app/(painel)/recrutamento/candidatos/[id]/page.tsx', ['/recrutamento/analise/'], ['onClick=', 'navigator.', 'window.']],
  ['public/triatalent-atualizacao.txt', ['TRIATALENT_FLUXO_DIRETO_V2'], []],
];
const errors = [];
for (const [name, required, forbidden] of checks) {
  const file = path.join(process.cwd(), name);
  if (!fs.existsSync(file)) { errors.push(`${name}: arquivo ausente no caminho correto.`); continue; }
  const source = fs.readFileSync(file, 'utf8');
  for (const text of required) if (!source.includes(text)) errors.push(`${name}: conteúdo antigo ou incompleto; falta "${text}".`);
  for (const text of forbidden) if (source.includes(text)) errors.push(`${name}: ainda contém trecho antigo "${text}".`);
}
if (errors.length) {
  console.error('\nTRIATALENT — ATUALIZAÇÃO INCOMPLETA. Build interrompido para não publicar o fluxo antigo.');
  for (const error of errors) console.error('  - ' + error);
  console.error('\nConfira os arquivos na raiz do repositório. Não envie o ZIP fechado nem crie outra pasta externa.');
  console.error('Não execute npm run seed: esta verificação não precisa alterar o banco.\n');
  process.exit(1);
}
console.log('\nTRIATALENT_FLUXO_DIRETO_V2 — ARQUIVOS CONFERIDOS.');
console.log('TRIATALENT_CLIENTE_PAGAMENTO_V3 — ÁREA DO CLIENTE E PAGAMENTO CONFERIDOS.');
console.log('TRIATALENT_SIMPLES_GEMINI_V4 — TRIAGEM, ENTREVISTA OBJETIVA E GEMINI CONFERIDOS.');
console.log('Cadastro/login com vaga preservada, entrevista direta e correção da ficha presentes.\n');
