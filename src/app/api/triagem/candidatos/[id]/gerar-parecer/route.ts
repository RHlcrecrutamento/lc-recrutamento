import { requireUser } from '@/lib/auth';
import { assertSameOrigin,limit } from '@/lib/access-security';
import { db,uj,j,audit } from '@/lib/db';
import { generateReport } from '@/lib/ai';
import { resumeSourceHash } from '@/lib/resumes';
import { reject } from '@/lib/triage';
import { ok,handleApiError } from '@/lib/http';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{
 assertSameOrigin(req);const u=await requireUser(['ADMIN','RECRUTADOR']);await limit('gerar-parecer',u.id,20,60);
 const result=await db.transaction(async()=>{
 const a=await db.prepare('SELECT * FROM applications WHERE id=? FOR UPDATE').get((await params).id) as any;if(!a)reject('Candidatura não encontrada.',404);if(a.team_decision||a.closed_reason)reject('A decisão já foi registrada.',409);
 const i=await db.prepare("SELECT * FROM interviews WHERE application_id=? ORDER BY created_at DESC,id DESC LIMIT 1").get(a.id) as any;
 const r=await db.prepare('SELECT * FROM reports WHERE application_id=? ORDER BY created_at DESC LIMIT 1').get(a.id) as any;if(!i||i.status!=='concluida'||!r||r.published_at)reject('Regeração disponível somente após entrevista concluída e antes da publicação.',409);
 const job=await db.prepare('SELECT * FROM jobs WHERE id=?').get(a.job_id) as any;const c=await db.prepare('SELECT * FROM candidates WHERE id=? FOR SHARE').get(a.candidate_id) as any;
 const answers=await db.prepare('SELECT * FROM interview_answers WHERE interview_id=? ORDER BY created_at,id').all(i.id) as any[];
 const result=await generateReport(job,uj(i.question_plan_json,{} as any),answers,c);
 await db.prepare("UPDATE reports SET generator=?,professional_summary=?,requirements_met_json=?,requirements_unmet_json=?,requirements_insufficient_json=?,compatibility_score=?,compatibility_justification=?,public_summary_json=?,source_resume_hash=?,status='aguardando_revisao' WHERE id=?").run(result.generator,result.professional_summary,j(result.requirements_met),j(result.requirements_unmet),j(result.requirements_insufficient),result.compatibility_score,result.compatibility_justification,j(result.public_summary),resumeSourceHash(c),r.id);
 await audit(u.id,'parecer_regenerado','reports',r.id,{generator:result.generator});return {msg:result.generator==='ia'?'Novo parecer gerado com Gemini. Revise antes de aprovar.':'Parecer estruturado atualizado. Gemini não configurado, indisponível ou resposta inválida; nenhuma IA foi simulada.'};
 })();return ok(result);
}catch(e){return handleApiError(e);}}
