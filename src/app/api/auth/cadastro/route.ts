import { limit, assertSameOrigin, validPassword, PASSWORD_RULE } from '@/lib/access-security';
import { getClientIp, getSessionUser } from '@/lib/auth';
/** Autocadastro de candidato (portal do candidato). */
import { db, id, audit, getSetting, now } from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (await getSessionUser()) return fail('Saia da conta atual antes de criar outro cadastro.', 409);
    await limit('signup-ip', await getClientIp(), 15, 60);
    if (!await getSetting<boolean>('allow_candidate_registration')) {
      return fail('Cadastro de candidatos está temporariamente desativado.', 403);
    }
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const phone = String(b.phone || '').trim();
    const resume = String(b.resume_text || '').trim();
    if(resume.length > 50000) return fail('O currículo deve ter até 50.000 caracteres.',400);

    if (name.length < 3) return fail('Informe seu nome completo.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('E-mail inválido.', 400);
    if (!validPassword(password)) return fail(PASSWORD_RULE, 400);
    if (!phone) return fail('Informe um telefone.', 400);

    const exists = await db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email);
    if (exists) return fail('Já existe uma conta com este e-mail.', 409);

    const candId = id('cnd');
    const userId = id('usr');
    const consentVersion = 'v1.0';

    const tx = db.transaction(async () => {
      await db.prepare(
        `INSERT INTO candidates (id, name, email, phone, whatsapp, city, state, title, professional_summary, education, courses, skills, experience, availability, salary_expectation, resume_text, origin, consent_version, consent_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        candId, name, email, phone, String(b.whatsapp || phone), String(b.city || ''), String(b.state || ''),
        String(b.title || ''), String(b.professional_summary || ''), String(b.education || ''),
        String(b.courses || ''), String(b.skills || ''), String(b.experience || ''),
        String(b.availability || ''), String(b.salary_expectation || ''), resume || null, 'Autocadastro portal',
        consentVersion, now()
      );
      await db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, phone, city, state, candidate_id) VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(userId, name, email, hashPassword(password), 'CANDIDATO', phone, String(b.city || ''), String(b.state || ''), candId);
      await db.prepare(`UPDATE candidates SET user_id = ? WHERE id = ?`).run(userId, candId);
      await db.prepare(`INSERT INTO consents (id, candidate_id, version, purpose, legal_basis, granted) VALUES (?,?,?,?,?,1)`).run(
        id('cns'), candId, consentVersion, 'Cadastro e participação em processos seletivos', 'Consentimento (LGPD art. 7º, I)'
      );
    });
    await tx();

    await audit(userId, 'cadastro_candidato', 'candidates', candId);
    const token = await createSession(userId);
    (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https'), path: '/', maxAge: 7 * 86400 });
    return ok({ id: userId, candidate_id: candId, role: 'CANDIDATO' }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
