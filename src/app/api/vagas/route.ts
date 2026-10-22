/** Vagas: listagem pública e criação (cliente/admin). */
import { normalizeJobMoneyAndBenefits } from '@/lib/job-benefits';
import { db, id, audit, getSetting, now, JOB_STATUSES } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get('publico') === '1';
    const user = await getSessionUser();

    if (publicOnly) {
      if (!await getSetting<boolean>('allow_public_jobs')) return ok([]);
      const rows = await db
        .prepare(
          `SELECT j.id, j.title, j.city, j.state, j.modality, j.contract_type, j.salary_min, j.salary_max,
                  j.salary_disclosed, j.description, j.requirements_mandatory, j.benefits, j.openings, j.public_slug,
                  c.name AS company_name
           FROM jobs j JOIN companies c ON c.id = j.company_id
           WHERE j.is_public = 1 AND j.status IN ('aprovada','em_recrutamento')
           ORDER BY j.created_at DESC`
        )
        .all();
      return ok(rows);
    }

    if (!user) return fail('Não autenticado.', 401);
    let rows;
    if (user.role === 'CLIENTE') {
      rows = await db
        .prepare(
          `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS total_candidatos
           FROM jobs j WHERE j.company_id = ? ORDER BY j.created_at DESC`
        )
        .all(user.company_id);
    } else if (user.role === 'RECRUTADOR' || user.role === 'ADMIN') {
      rows = await db
        .prepare(
          `SELECT j.*, c.name AS company_name,
                  (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS total_candidatos,
                  (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.stage >= 11) AS total_liberados
           FROM jobs j JOIN companies c ON c.id = j.company_id
           ORDER BY j.created_at DESC`
        )
        .all();
    } else {
      return fail('Sem permissão.', 403);
    }
    return ok(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);
    if (!['ADMIN', 'RECRUTADOR', 'CLIENTE'].includes(user.role)) return fail('Sem permissão.', 403);

    const b = await readJson(req);
    delete b.benefits_config_json;
    normalizeJobMoneyAndBenefits(b);
    if(user.role === 'CLIENTE') {delete b.experience;delete b.competencies;delete b.requirements_desirable;delete b.confidential_info;}
    const title = String(b.title || '').trim();
    if (title.length < 3) return fail('Informe o título da vaga.', 400);

    let companyId = b.company_id;
    if (user.role === 'CLIENTE') {
      companyId = user.company_id; // cliente nunca escolhe outra empresa
      if (!companyId) return fail('Cliente sem empresa vinculada.', 400);
    } else if (!companyId) {
      return fail('Informe a empresa contratante.', 400);
    }
    const company = await db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
    if (!company) return fail('Empresa não encontrada.', 404);

    // Cliente cria como rascunho/aguardando aprovação; equipe Triatalent pode criar já aprovada
    const status =
      user.role === 'CLIENTE'
        ? String(b.status || 'rascunho') === 'aguardando_aprovacao'
          ? 'aguardando_aprovacao'
          : 'rascunho'
        : String(b.status || 'em_recrutamento');

    const jobId = id('vag');
    const slug =
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40) + '-' + jobId.slice(-5);

    await db.prepare(
      `INSERT INTO jobs (id, company_id, title, openings, description, objectives, activities, requirements_mandatory,
        requirements_desirable, education, courses, experience, competencies, salary_min, salary_max, salary_disclosed,
        benefits, benefits_config_json, contract_type, work_schedule, work_scale, work_days, modality, address, city, state, neighborhood,
        start_date, hiring_deadline, notes, confidential_info, status, is_public, public_slug, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      jobId, companyId, title, Number(b.openings) || 1,
      b.description || null, b.objectives || null, b.activities || null,
      b.requirements_mandatory || null, b.requirements_desirable || null,
      b.education || null, b.courses || null, b.experience || null, b.competencies || null,
      b.salary_min ? Number(b.salary_min) : null, b.salary_max ? Number(b.salary_max) : null,
      b.salary_disclosed === false || Number(b.salary_disclosed) === 0 ? 0 : 1,
      b.benefits || null, b.benefits_config_json || null, b.contract_type || 'CLT', b.work_schedule || null, b.work_scale || null,
      b.work_days || null, b.modality || 'Presencial', b.address || null, b.city || null, b.state || null,
      b.neighborhood || null, b.start_date || null, b.hiring_deadline || null, b.notes || null,
      b.confidential_info || null, status, b.is_public === true || Number(b.is_public) === 1 ? 1 : 0, slug, user.id
    );

    await audit(user.id, 'vaga_criada', 'jobs', jobId, { title, status }, await getClientIp());
    return ok({ id: jobId, status }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
