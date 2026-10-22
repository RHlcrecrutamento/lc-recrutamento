/** Candidatos (banco de talentos) — acesso restrito à equipe interna. */
import { db, id, audit, getSetting, now } from '@/lib/db';
import { getSessionUser, getClientIp, hashPassword } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) {
      return fail('Acesso restrito à equipe de recrutamento.', 403);
    }
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const skill = (url.searchParams.get('skill') || '').trim();
    const city = (url.searchParams.get('cidade') || '').trim();

    let sql = `SELECT c.id, c.name, c.email, c.phone, c.city, c.state, c.title, c.skills, c.availability,
                      c.salary_expectation, c.origin, c.created_at,
                      (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = c.id) AS total_vagas
               FROM candidates c WHERE 1=1`;
    const params: unknown[] = [];
    if (q) {
      sql += ` AND (c.name LIKE ? OR c.title LIKE ? OR c.skills LIKE ? OR c.experience LIKE ? OR c.email LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    if (skill) {
      sql += ` AND c.skills LIKE ?`;
      params.push(`%${skill}%`);
    }
    if (city) {
      sql += ` AND c.city LIKE ?`;
      params.push(`%${city}%`);
    }
    sql += ' ORDER BY c.created_at DESC LIMIT 200';
    return ok(await db.prepare(sql).all(...params));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    if (name.length < 3) return fail('Informe o nome do candidato.', 400);

    const candId = id('cnd');
    await db.prepare(
      `INSERT INTO candidates (id, name, email, phone, whatsapp, cpf, birth_date, city, state, title,
        professional_summary, education, courses, skills, experience, availability, salary_expectation,
        resume_text, origin, consent_version, consent_at, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      candId, name, String(b.email || ''), String(b.phone || ''), String(b.whatsapp || b.phone || ''),
      String(b.cpf || ''), String(b.birth_date || ''), String(b.city || ''), String(b.state || ''),
      String(b.title || ''), String(b.professional_summary || ''), String(b.education || ''),
      String(b.courses || ''), String(b.skills || ''), String(b.experience || ''),
      String(b.availability || ''), String(b.salary_expectation || ''), String(b.resume_text || ''),
      String(b.origin || 'Cadastro manual'), b.consent ? 'v1.0' : null, b.consent ? now() : null, user.id
    );
    await audit(user.id, 'candidato_criado', 'candidates', candId, undefined, await getClientIp());
    return ok({ id: candId }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
