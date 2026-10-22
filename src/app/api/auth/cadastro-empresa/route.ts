import { cookies } from 'next/headers';
import { db, id, audit } from '@/lib/db';
import { getSessionUser, getClientIp, hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';
import { assertSameOrigin, limit, validPassword, PASSWORD_RULE } from '@/lib/access-security';
import { normalizeCnpj, validCnpj } from '@/lib/company-registration';
import { ok, fail, readJson, handleApiError } from '@/lib/http';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (await getSessionUser()) return fail('Saia da conta atual antes de cadastrar uma nova empresa.', 409);
    const ip = await getClientIp();
    await limit('company-signup-ip', ip, 8, 60);
    const b = await readJson(req, 12_000);
    if (String(b.website || '')) return fail('Não foi possível concluir o cadastro.', 400);
    const company = String(b.company || '').trim();
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const phone = String(b.phone || '').replace(/\D/g, '');
    const city = String(b.city || '').trim();
    const state = String(b.state || '').trim().toUpperCase();
    const segment = String(b.segment || '').trim();
    const cnpj = normalizeCnpj(String(b.cnpj || '').trim());
    if (company.length < 3 || company.length > 160) return fail('Informe o nome da empresa (3 a 160 caracteres).');
    if (name.length < 3 || name.length > 120) return fail('Informe o nome do responsável (3 a 120 caracteres).');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Informe um e-mail válido.');
    if (!validPassword(password)) return fail(PASSWORD_RULE);
    if (!/^(?:55)?\d{10,11}$/.test(phone)) return fail('Informe um telefone com DDD.');
    if (city.length > 120 || segment.length > 120) return fail('Cidade ou segmento muito longo.');
    if (state && !['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(state)) return fail('Selecione um estado válido.');
    if (cnpj && !validCnpj(cnpj)) return fail('CNPJ inválido. Confira o número ou deixe o campo opcional vazio.');
    if (b.accept !== true) return fail('É necessário aceitar os Termos de Uso e declarar ciência da Política de Privacidade.');
    const companyId = id('emp');
    const userId = id('usr');
    const passwordHash = hashPassword(password);
    await db.transaction(async () => {
      // Serializa cadastros do mesmo CNPJ sem impor índice novo ao banco existente.
      // Nunca vincula automaticamente um cadastro a uma empresa já existente.
      if (cnpj) {
        await db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get('company-cnpj:' + cnpj);
        const existing = await db.prepare("SELECT id FROM companies WHERE regexp_replace(upper(COALESCE(cnpj, '')), '[^A-Z0-9]', '', 'g') = ?").get(cnpj);
        if (existing) { const e: any = new Error('Este CNPJ já possui cadastro. Solicite acesso à equipe Triatalent; não criaremos um vínculo automático.'); e.status = 409; throw e; }
      }
      const existingEmail = await db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
      if (existingEmail) { const e: any = new Error('Já existe uma conta com este e-mail. Entre ou recupere sua senha.'); e.status = 409; throw e; }
      await db.prepare(`INSERT INTO companies (id,name,cnpj,segment,city,state,contact_email,contact_phone,plan,active) VALUES (?,?,?,?,?,?,?,?,'padrao',1)`)
        .run(companyId,company,cnpj || null,segment,city,state,email,phone);
      // Perfil e empresa são definidos exclusivamente no servidor; ignorar role/company_id recebidos.
      await db.prepare(`INSERT INTO users (id,name,email,password_hash,role,phone,city,state,company_id) VALUES (?,?,?,?,'CLIENTE',?,?,?,?)`)
        .run(userId,name,email,passwordHash,phone,city,state,companyId);
    })();
    const legal = await db.prepare("SELECT type, version FROM legal_texts WHERE active = 1 AND type IN ('termos','privacidade') ORDER BY updated_at DESC").all();
    await audit(userId, 'empresa_autocadastro', 'companies', companyId, {terms_accepted: true, legal_versions: legal, accepted_at: new Date().toISOString()}, ip);
    const token = await createSession(userId);
    (await cookies()).set(SESSION_COOKIE, token, {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https'), path: '/', maxAge: 7 * 86400});
    return ok({id:userId,company_id:companyId,role:'CLIENTE'}, 201);
  } catch (e: any) {
    if (e?.code === '23505') return fail('Não foi possível cadastrar: estes dados já estão em uso. Entre ou fale com a equipe.', 409);
    return handleApiError(e);
  }
}
