CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  segment TEXT,
  city TEXT,
  state TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  plan TEXT DEFAULT 'padrao',
  price_per_unlock_cents INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','RECRUTADOR','CLIENTE','CANDIDATO')),
  phone TEXT,
  city TEXT,
  state TEXT,
  company_id TEXT REFERENCES companies(id),
  candidate_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  blocked_reason TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cpf TEXT,
  birth_date TEXT,
  city TEXT,
  state TEXT,
  title TEXT,
  professional_summary TEXT,
  education TEXT,
  courses TEXT,
  skills TEXT,
  experience TEXT,
  availability TEXT,
  salary_expectation TEXT,
  resume_path TEXT,
  resume_text TEXT,
  origin TEXT DEFAULT 'Cadastro manual',
  consent_version TEXT,
  consent_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  openings INTEGER DEFAULT 1,
  description TEXT,
  objectives TEXT,
  activities TEXT,
  requirements_mandatory TEXT,
  requirements_desirable TEXT,
  education TEXT,
  courses TEXT,
  experience TEXT,
  competencies TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_disclosed INTEGER DEFAULT 1,
  benefits TEXT,
  contract_type TEXT,
  work_schedule TEXT,
  work_scale TEXT,
  work_days Text,
  modality TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  start_date TEXT,
  hiring_deadline TEXT,
  notes TEXT,
  confidential_info TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK(status IN ('rascunho','aguardando_aprovacao','aprovada','em_recrutamento','aguardando_avaliacao_cliente','pausada','concluida','cancelada')),
  public_slug TEXT UNIQUE,
  is_public INTEGER DEFAULT 0,
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  recruiter_id TEXT,
  stage INTEGER NOT NULL DEFAULT 1,
  stage_key TEXT NOT NULL DEFAULT 'candidato_identificado',
  source TEXT DEFAULT 'Cadastro manual',
  released_at TEXT,
  released_by TEXT,
  client_interest TEXT,
  client_interest_at TEXT,
  client_decision TEXT,
  client_decision_note TEXT,
  closed_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'convite_enviado'
    CHECK(status IN ('convite_enviado','convite_visualizado','em_andamento','concluida','cancelada')),
  mode TEXT DEFAULT 'estruturada',
  ai_enabled INTEGER DEFAULT 0,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  question_plan_json TEXT,
  progress_json TEXT,
  consent_version TEXT,
  consent_at TEXT,
  invite_sent_at TEXT,
  invite_count INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interview_messages (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('system','assistant','candidate')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  category TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id),
  application_id TEXT NOT NULL REFERENCES applications(id),
  status TEXT NOT NULL DEFAULT 'aguardando_revisao'
    CHECK(status IN ('aguardando_revisao','em_revisao','validado','complementacao_solicitada')),
  generator TEXT DEFAULT 'estruturada',
  professional_summary TEXT,
  competencies_json TEXT,
  requirements_met_json TEXT,
  requirements_unmet_json TEXT,
  requirements_insufficient_json TEXT,
  confirm_points_json TEXT,
  next_questions_json TEXT,
  compatibility_score INTEGER,
  compatibility_justification TEXT,
  weights_json TEXT,
  public_summary_json TEXT,
  ai_generated_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  validation_notes TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_notes (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'observacao',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_attempts (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  recruiter_id TEXT,
  attempt_type TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  application_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK(status IN ('pendente','aprovado','recusado','cancelado','reembolsado')),
  gateway TEXT NOT NULL,
  gateway_preference_id TEXT,
  gateway_payment_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  refunded_at TEXT
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  event_type TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS unlocks (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  application_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  unlocked_by TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details_json TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  version TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT,
  granted INTEGER DEFAULT 1,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Arquivos de currículo (PDF/DOCX) guardados no próprio banco.
-- Na nuvem o disco local é apagado a cada reinício, então o arquivo precisa
-- morar junto com os dados. Nunca é servido diretamente: só pelas rotas
-- autenticadas do painel.
CREATE TABLE IF NOT EXISTS resume_files (
  id TEXT PRIMARY KEY,
  ext TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS legal_texts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Triatalent: segurança de acesso (migração aditiva, preserva cadastros).
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_expiry ON auth_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash_at_issue TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- Triatalent: atualização incremental de benefícios e currículo revisado. Sem apagar dados.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits_config_json TEXT;
CREATE TABLE IF NOT EXISTS candidate_public_resumes (
  candidate_id TEXT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  public_text TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_expires_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_checked_at TEXT;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_environment TEXT NOT NULL DEFAULT 'production';

ALTER TABLE candidate_public_resumes ENABLE ROW LEVEL SECURITY;

-- Triatalent V4: triagem humana simplificada e avisos MANUAIS.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS review_decision TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_decision TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_reviewed_by TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_reviewed_at TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_resume_hash TEXT;
CREATE TABLE IF NOT EXISTS notification_drafts (
 id TEXT PRIMARY KEY,
 event_key TEXT UNIQUE NOT NULL,
 job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
 application_id TEXT REFERENCES applications(id) ON DELETE CASCADE,
 candidate_id TEXT REFERENCES candidates(id) ON DELETE CASCADE,
 company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL,
 phone TEXT,
 message TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 confirmed_at TEXT
);
ALTER TABLE notification_drafts ENABLE ROW LEVEL SECURITY;
