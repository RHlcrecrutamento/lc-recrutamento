/**
 * Entrevista online — acesso público via token individual do convite.
 * Uma pergunta por vez, com consentimento, progresso e geração de relatório
 * ao final. O relatório NUNCA é validado automaticamente.
 */
import { displayBrand } from '@/lib/brand';
import { resumeSourceHash } from '@/lib/resumes';
import { db, id, audit, setStage, uj, j, now } from '@/lib/db';
import { ok, fail, handleApiError, readJson } from '@/lib/http';
import { buildInterviewPlan, generateReport, employmentHints, normalizeEmployment } from '@/lib/ai';

const CONSENT_VERSION = 'v1.0';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const interview = await db
      .prepare(
        `SELECT i.*, a.job_id, a.stage, j.title AS job_title, j.description AS job_description,
                j.activities AS job_activities, j.requirements_mandatory, j.requirements_desirable,
                j.benefits, j.modality, j.city, j.state, j.contract_type, j.work_schedule,
                c.name AS candidate_name
         FROM interviews i
         JOIN applications a ON a.id = i.application_id
         JOIN jobs j ON j.id = a.job_id
         JOIN candidates c ON c.id = a.candidate_id
         WHERE i.token = ?`
      )
      .get((await params).token) as any;
    if (!interview) return fail('Convite não encontrado ou link inválido.', 404);
    if (interview.status === 'cancelada') return fail('Esta entrevista foi cancelada pela equipe de recrutamento.', 410);

    const plan = uj<any>(interview.question_plan_json, { questions: [], intro: '', consent_text: '' });
    const progress = uj<any>(interview.progress_json, { current: 0 });
    const answers = await db
      .prepare('SELECT question_key, answer FROM interview_answers WHERE interview_id = ?')
      .all(interview.id) as any[];
    const messages = await db
      .prepare('SELECT seq, role, content FROM interview_messages WHERE interview_id = ? ORDER BY seq')
      .all(interview.id);

    const qIndex = Math.min(progress.current || 0, plan.questions.length);
    const currentQuestion = qIndex < plan.questions.length ? plan.questions[qIndex] : null;

    return ok({
      status: interview.status,
      consent_given: !!interview.consent_at,
      consent_text: displayBrand(plan.consent_text),
      intro: displayBrand(plan.intro),
      mode: plan.mode,
      ai_enabled: !!interview.ai_enabled,
      job_title: interview.job_title,
      job_summary: {
        description: interview.job_description,
        activities: interview.job_activities,
        requirements_mandatory: interview.requirements_mandatory,
        requirements_desirable: interview.requirements_desirable,
        benefits: interview.benefits,
        modality: interview.modality,
        city: interview.city,
        state: interview.state,
        contract_type: interview.contract_type,
        work_schedule: interview.work_schedule,
      },
      total_questions: plan.questions.length,
      current_index: qIndex,
      current_question: currentQuestion,
      answers_count: answers.length,
      completed: interview.status === 'concluida',
      messages: messages.map((m:any)=>m.role==='assistant'?{...m,content:displayBrand(m.content)}:m),
      started_at: interview.started_at,
      completed_at: interview.completed_at,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request, {params}:{params:Promise<{token:string}>}) {
 try {
  const b=await readJson(req,20000);
  const result=await db.transaction(async()=>{
   const interview=await db.prepare('SELECT * FROM interviews WHERE token=? FOR UPDATE').get((await params).token) as any;
   const reject=(message:string,status=400):never=>{const e:any=new Error(message);e.status=status;throw e;};
   if(!interview)reject('Entrevista não encontrada.',404);
   if(interview.status==='cancelada')reject('Entrevista cancelada.',410);
   if(interview.status==='concluida')reject('Entrevista já concluída.',409);
   const application=await db.prepare('SELECT * FROM applications WHERE id=? FOR UPDATE').get(interview.application_id) as any;
   const published=await db.prepare('SELECT id FROM reports WHERE application_id=? AND published_at IS NOT NULL LIMIT 1').get(interview.application_id);
   if(!application||application.team_decision||application.closed_reason||published)reject('Esta candidatura já foi analisada ou encerrada. Consulte suas candidaturas no portal.',409);
   const plan=uj<any>(interview.question_plan_json,{questions:[]});
   if(b.action==='iniciar'){
    if(b.consent!==true)reject('É necessário aceitar o tratamento de dados para iniciar.');
    if(interview.consent_at)return {msg:'Entrevista já iniciada.'};
    const app=await db.prepare('SELECT candidate_id FROM applications WHERE id=?').get(interview.application_id) as any;
    if(plan.version===2){
     const person=await db.prepare('SELECT * FROM candidates WHERE id=?').get(app.candidate_id) as any;
     const hints=await employmentHints(person);
     if(hints.length){plan.mode='ia';let h=0;for(const q of plan.questions)if(q.type==='employment')q.prefill=hints[h++]||{};}
     await db.prepare('UPDATE interviews SET question_plan_json=?,mode=?,ai_enabled=? WHERE id=?').run(j(plan),plan.mode,plan.mode==='ia'?1:0,interview.id);
    }
    await db.prepare("UPDATE interviews SET status='em_andamento',started_at=COALESCE(started_at,datetime('now')),consent_version=?,consent_at=datetime('now') WHERE id=?").run('v2-triatalent-gemini',interview.id);
    await db.prepare('INSERT INTO consents(id,candidate_id,version,purpose,legal_basis,granted) VALUES(?,?,?,?,?,1)').run(id('cns'),app.candidate_id,'v2-triatalent-gemini',plan.consent_text||'Entrevista para recrutamento','Consentimento (LGPD)');
    await db.prepare('INSERT INTO interview_messages(id,interview_id,seq,role,content) VALUES(?,?,1,?,?)').run(id('msg'),interview.id,'assistant',(plan.intro||'Entrevista Triatalent')+'\n\n'+(plan.questions[0]?.question||''));
    await setStage(interview.application_id,'entrevista_em_andamento');
    return {msg:'Entrevista iniciada.'};
   }
   if(b.action!=='responder')reject('Ação inválida.');
   if(interview.status!=='em_andamento'||!interview.consent_at)reject('Inicie e aceite o aviso de tratamento de dados antes de responder.',403);
   const progress=uj<any>(interview.progress_json,{current:0});const index=progress.current||0;const q=plan.questions[index];
   if(!q)reject('Não há pergunta pendente.',409);
   if(plan.version===2&&b.question_key!==q.key)reject('Esta pergunta já mudou. Atualize a entrevista antes de enviar novamente.',409);
   let answer='';
   if(q.type==='choice'){
    if(!Number.isInteger(b.choice_index)||b.choice_index<0||b.choice_index>=q.options.length)reject('Marque uma das opções disponíveis.');
    answer=q.options[b.choice_index];
    if(/^Outro/.test(answer)){const extra=String(b.other||'').trim();if(extra.length<3||extra.length>800)reject('Descreva a opção Outro em 3 a 800 caracteres.');answer+=' Complemento: '+extra;}
   }else if(q.type==='employment'){answer=JSON.stringify(normalizeEmployment(b.employment));}
   else{answer=String(b.answer||'').trim();if(answer.length<2||answer.length>4000)reject('Informe uma resposta de 2 a 4000 caracteres.');}
   await db.prepare('INSERT INTO interview_answers(id,interview_id,question_key,category,question,answer) VALUES(?,?,?,?,?,?)').run(id('ans'),interview.id,q.key,q.category,q.question,answer);
   const seq=Number((await db.prepare('SELECT COALESCE(MAX(seq),0) m FROM interview_messages WHERE interview_id=?').get(interview.id) as any).m);
   await db.prepare('INSERT INTO interview_messages(id,interview_id,seq,role,content) VALUES(?,?,?,?,?)').run(id('msg'),interview.id,seq+1,'candidate',q.type==='employment'?'Dados do histórico profissional confirmados.':answer);
   const next=index+1;
   await db.prepare('UPDATE interviews SET progress_json=? WHERE id=?').run(j({current:next}),interview.id);
   if(next>=plan.questions.length){
    await db.prepare("UPDATE interviews SET status='concluida',completed_at=datetime('now') WHERE id=?").run(interview.id);
    await finalizeInterview(interview,plan);
    return {completed:true,msg:'Entrevista concluída. A equipe Triatalent revisará seu currículo e respostas antes de decidir sobre a apresentação à empresa.'};
   }
   await db.prepare('INSERT INTO interview_messages(id,interview_id,seq,role,content) VALUES(?,?,?,?,?)').run(id('msg'),interview.id,seq+2,'assistant',plan.questions[next].question);
   return {completed:false,next_index:next};
  })();
  return ok(result);
 }catch(e){return handleApiError(e);}
}
async function finalizeInterview(interview:any,plan:any){
 const answers=await db.prepare('SELECT question_key,category,question,answer FROM interview_answers WHERE interview_id=? ORDER BY created_at,id').all(interview.id) as any[];
 const context=await db.prepare('SELECT j.*,a.candidate_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?').get(interview.application_id) as any;
 const candidate=await db.prepare('SELECT * FROM candidates WHERE id=?').get(context.candidate_id) as any;
 const report=await generateReport(context,plan,answers,candidate);
 await db.prepare(`INSERT INTO reports(id,interview_id,application_id,status,generator,professional_summary,competencies_json,requirements_met_json,requirements_unmet_json,requirements_insufficient_json,confirm_points_json,next_questions_json,compatibility_score,compatibility_justification,weights_json,public_summary_json,ai_generated_at,source_resume_hash)
 VALUES(?,?,?,'aguardando_revisao',?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)`).run(id('rel'),interview.id,interview.application_id,report.generator,report.professional_summary,j(report.competencies),j(report.requirements_met),j(report.requirements_unmet),j(report.requirements_insufficient),j(report.confirm_points),j(report.next_questions),report.compatibility_score,report.compatibility_justification,j(report.weights),j(report.public_summary),resumeSourceHash(candidate));
 await setStage(interview.application_id,'relatorio_aguardando_revisao');
 await audit(null,'entrevista_concluida','interviews',interview.id,{applicationId:interview.application_id,generator:report.generator});
}
