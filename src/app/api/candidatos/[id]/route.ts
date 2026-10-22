/** Detalhe e edição de candidato — dados completos só para equipe interna. */
import { db, audit, uj } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { getAnonymizedCandidate, candidateCode } from '@/lib/access';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);

    if (user.role === 'CLIENTE') {
      // Cliente NUNCA recebe dados completos do banco de talentos.
      // Só perfil anonimizado de candidato já liberado da SUA empresa.
      const app = await db
        .prepare(
          `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
           WHERE a.candidate_id = ? AND j.company_id = ? LIMIT 1`
        )
        .get((await params).id, user.company_id) as any;
      if (!app) return fail('Candidato não encontrado.', 404);
      const anon = await getAnonymizedCandidate(app.id, user);
      if (!anon) return fail('Este candidato ainda não está disponível para análise.', 403);
      return ok(anon);
    }

    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    const cand = await db.prepare('SELECT * FROM candidates WHERE id = ?').get((await params).id) as any;
    if (!cand) return fail('Candidato não encontrado.', 404);
    const apps = await db
      .prepare(
        `SELECT a.*, j.title AS job_title, j.company_id, c.name AS company_name
         FROM applications a JOIN jobs j ON j.id = a.job_id JOIN companies c ON c.id = j.company_id
         WHERE a.candidate_id = ? ORDER BY a.created_at DESC`
      )
      .all((await params).id);
    return ok({ candidate: cand, applications: apps });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    const b = await readJson(req);

    if (user.role === 'CANDIDATO') {
      if (user.candidate_id !== (await params).id) return fail('Você só pode editar o seu próprio perfil.', 403);
    } else if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) {
      return fail('Sem permissão.', 403);
    }

    if(b.resume_text !== undefined && (typeof b.resume_text !== 'string' || b.resume_text.length > 50000)) return fail('Currículo inválido: limite de 50.000 caracteres.',400);
    const fields = ['resume_text', 'name', 'email', 'phone', 'whatsapp', 'city', 'state', 'title', 'professional_summary',
      'education', 'courses', 'skills', 'experience', 'availability', 'salary_expectation', 'birth_date'];
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (b[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(b[f]);
      }
    }
    if (!sets.length) return fail('Nada para atualizar.', 400);
    vals.push((await params).id);
    await db.prepare(`UPDATE candidates SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...vals);
    await audit(user.id, 'candidato_editado', 'candidates', (await params).id, undefined, await getClientIp());
    return ok({ msg: 'Perfil atualizado.' });
  } catch (e) {
    return handleApiError(e);
  }
}
