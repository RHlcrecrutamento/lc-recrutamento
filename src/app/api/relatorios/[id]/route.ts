/** Relatório: visualização interna e revisão/validação humana obrigatória. */
import { isReleasedToClient } from '@/lib/access';
import { assertSameOrigin } from '@/lib/access-security';
import { db, id, audit, setStage, uj, j } from '@/lib/db';
import { getSessionUser, getClientIp } from '@/lib/auth';
import { ok, fail, handleApiError, readJson } from '@/lib/http';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return fail('Não autenticado.', 401);

    const report = await db
      .prepare(
        `SELECT r.*, a.candidate_id, a.job_id, a.stage, a.stage_key,
                c.name AS candidate_name, c.title AS candidate_title,
                j.title AS job_title, j.company_id
         FROM reports r
         JOIN applications a ON a.id = r.application_id
         JOIN candidates c ON c.id = a.candidate_id
         JOIN jobs j ON j.id = a.job_id
         WHERE r.id = ?`
      )
      .get((await params).id) as any;
    if (!report) return fail('Relatório não encontrado.', 404);

    if (user.role === 'CLIENTE') {
      if (report.company_id !== user.company_id) return fail('Sem permissão.', 403);
      if (report.status !== 'validado' || !report.published_at || !await isReleasedToClient(report.application_id)) {
        return fail('Este relatório ainda não está disponível para a sua empresa.', 403);
      }
      // Cliente recebe APENAS o resumo público validado
      return ok({
        id: report.id,
        status: report.status,
        compatibility_score: report.compatibility_score,
        compatibility_justification: report.compatibility_justification,
        public_summary: uj(report.public_summary_json, {}),
        validated_at: report.reviewed_at,
        job_title: report.job_title,
        candidate_code: report.candidate_id ? `CAND-${Math.abs([...report.candidate_id].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 900000 + 100000)}` : '',
      });
    }

    if (!['ADMIN', 'RECRUTADOR'].includes(user.role)) return fail('Sem permissão.', 403);
    const answers = await db.prepare('SELECT * FROM interview_answers WHERE interview_id = ?').all(report.interview_id);
    const notes = await db
      .prepare('SELECT n.*, u.name AS author_name FROM report_notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.report_id = ? ORDER BY n.created_at')
      .all((await params).id);
    return ok({ report, answers, notes });
  } catch (e) {
    return handleApiError(e);
  }
}

/** A decisão/edição pública migrou para a revisão simples, em uma transação. */
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const user=await getSessionUser();if(!user||!['ADMIN','RECRUTADOR'].includes(user.role))return fail('Somente a equipe Triatalent pode revisar relatórios.',403);const b=await readJson(req);const r=await db.prepare('SELECT * FROM reports WHERE id=?').get((await params).id) as any;if(!r)return fail('Relatório não encontrado.',404);if(b.action!=='observacao')return fail('Use a análise simples do candidato para revisar o parecer e aprovar ou reprovar. O fluxo antigo foi desativado.',409);await db.prepare('INSERT INTO report_notes(id,report_id,author_id,content,note_type) VALUES(?,?,?,?,?)').run(id('rnt'),r.id,user.id,String(b.notas||'').slice(0,3000),'observacao');await audit(user.id,'observacao_relatorio','reports',r.id);return ok({msg:'Observação interna registrada; não será exibida ao cliente.'});}catch(e){return handleApiError(e);}}
