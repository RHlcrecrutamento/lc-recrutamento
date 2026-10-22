import { db, id, audit, setStage, uj, j } from './db';
import { resumeSourceHash, redactPublicText } from './resumes';
import { candidateCode } from './access';
export function reject(message:string,status=400):never{const e:any=new Error(message);e.status=status;throw e;}
export function siteLink(path:string){try{const u=new URL(process.env.APP_URL||'');return u.protocol==='https:'?new URL(path,u.origin).toString():'';}catch{return '';}}
export function whatsappPhone(raw:string){const n=String(raw||'').replace(/\D/g,'');return /^55\d{10,11}$/.test(n)?n:/^\d{10,11}$/.test(n)?'55'+n:'';}
export async function draft(p:{event:string;jobId?:string;applicationId?:string;candidateId?:string;companyId?:string;recipient:string;phone?:string;message:string}){
 await db.prepare(`INSERT INTO notification_drafts(id,event_key,job_id,application_id,candidate_id,company_id,recipient,phone,message) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING`).run(id('aviso'),p.event,p.jobId||null,p.applicationId||null,p.candidateId||null,p.companyId||null,p.recipient,p.phone||'',p.message);
}
export async function reviewJob(jobId:string,decision:string,note:string,userId:string){
 return db.transaction(async()=>{
  const job=await db.prepare('SELECT * FROM jobs WHERE id=? FOR UPDATE').get(jobId) as any;
  if(!job)reject('Vaga não encontrada.',404);
  if(!['aprovada','reprovada'].includes(decision))reject('Decisão inválida.');
  if(job.review_decision===decision)return {msg:'Esta decisão já foi registrada. O aviso permanece na fila de WhatsApp.'};
  if(job.status!=='aguardando_aprovacao')reject('A vaga não está aguardando aprovação.',409);
  const company=await db.prepare('SELECT * FROM companies WHERE id=?').get(job.company_id) as any;
  const contact=await db.prepare("SELECT phone FROM users WHERE company_id=? AND role='CLIENTE' AND active=1 ORDER BY created_at LIMIT 1").get(job.company_id) as any;
  const status=decision==='aprovada'?'aprovada':'cancelada';
  await db.prepare("UPDATE jobs SET status=?,review_decision=?,review_note=?,approved_by=?,approved_at=datetime('now'),updated_at=datetime('now') WHERE id=?").run(status,decision,note.slice(0,2000),userId,jobId);
  await draft({event:`job:${jobId}:${decision}`,jobId,companyId:job.company_id,recipient:company.name,phone:company.contact_phone||contact?.phone,message:`Triatalent: a vaga ${job.title} foi ${decision==='aprovada'?'aprovada e está aberta para candidaturas':'reprovada nesta revisão'}. Consulte sua área do cliente para acompanhar. ${siteLink('/cliente/vagas/'+jobId)}`});
  await audit(userId,'revisao_vaga','jobs',jobId,{decision});
  return {msg:'Decisão salva. O aviso está pronto em WhatsApp — envio manual.'};
 })();
}
export function presentationLines(raw:unknown){const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length||lines.length>20||lines.some(x=>x.length>500))reject('O parecer deve ter de 1 a 20 linhas, com até 500 caracteres por linha.');return lines;}
export async function reviewApplication(applicationId:string,b:any,userId:string){
 return db.transaction(async()=>{
  const app=await db.prepare('SELECT * FROM applications WHERE id=? FOR UPDATE').get(applicationId) as any;
  if(!app)reject('Candidatura não encontrada.',404);
  if(!['aprovado','reprovado'].includes(b.decision))reject('Decisão inválida.');
  if(app.team_decision===b.decision)return {msg:'Decisão já registrada. Confira a fila de WhatsApp.'};
  if(app.team_decision||app.closed_reason)reject('Esta candidatura já foi decidida ou encerrada.',409);
  const candidate=await db.prepare('SELECT * FROM candidates WHERE id=? FOR UPDATE').get(app.candidate_id) as any;
  const job=await db.prepare('SELECT * FROM jobs WHERE id=?').get(app.job_id) as any;
  const interview=await db.prepare("SELECT * FROM interviews WHERE application_id=? ORDER BY created_at DESC,id DESC LIMIT 1").get(app.id) as any;
  const report=await db.prepare('SELECT * FROM reports WHERE application_id=? ORDER BY created_at DESC LIMIT 1 FOR UPDATE').get(app.id) as any;
  if(!interview||interview.status!=='concluida'||!report)reject('A entrevista precisa estar concluída e o parecer disponível antes da decisão.',409);
  if(report.published_at)reject('Este perfil já foi apresentado. Consulte o histórico; esta fila trata apenas análises pendentes.',409);
  if(b.decision==='aprovado'){
   if(['cancelada','concluida'].includes(job.status))reject('A vaga está encerrada. Não é possível apresentar um novo candidato para ela.',409);
   if(b.reviewed!==true)reject('Confirme a revisão do currículo, das respostas, do histórico e do parecer.');
   if(b.source_hash!==resumeSourceHash(candidate))reject('Os dados do candidato mudaram. Atualize a página e revise novamente.',409);
   if(report.source_resume_hash&&report.source_resume_hash!==b.source_hash)reject('O currículo mudou depois da geração do parecer. Gere novamente e revise a nova versão.',409);
   const lines=presentationLines(b.presentation);
   const cv=String(b.public_resume||'').trim();
   if(candidate.resume_text?.trim()&&(cv.length<20||cv.length>50000))reject('Revise o currículo anonimizado (20 a 50.000 caracteres).');
   const current=uj<any>(report.public_summary_json,{});
   // Preserva a quantidade, ordem e texto das perguntas. Só a resposta pública pode ser anonimizada.
   const sourceAnswers=Array.isArray(current.essential_answers)?current.essential_answers:[];
   const sourceHistory=Array.isArray(current.work_history)?current.work_history:[];
   if(!Array.isArray(b.essential_answers)||b.essential_answers.length!==sourceAnswers.length||!Array.isArray(b.work_history)||b.work_history.length!==sourceHistory.length)reject('As seções públicas não correspondem ao relatório atual. Recarregue a página.',409);
   const essentials=sourceAnswers.map((a:any,i:number)=>({...a,answer:String(b.essential_answers[i]?.answer||'Não informado').slice(0,2000)}));
   const history=sourceHistory.map((a:any,i:number)=>{if(a.unavailable)return a;const item=b.work_history[i]||{};return {company:String(item.company||'Não informado').slice(0,180),role:String(item.role||'Não informado').slice(0,180),entry:String(item.entry||'Não informado').slice(0,40),exit:String(item.exit||'Não informado').slice(0,40),reason:String(item.reason||'Não informado').slice(0,500),current:!!a.current};});
   const publication={...current,summary:lines.join('\n'),presentation_lines:lines,essential_answers:essentials,work_history:history,score:report.compatibility_score};
   for(const text of [cv,...lines,...essentials.map((x:any)=>x.answer),...history.flatMap((x:any)=>[x.company,x.role,x.entry,x.exit,x.reason])])if(redactPublicText(text,candidate)!==String(text||''))reject('Ainda há nome, contatos, documentos, endereço ou links pessoais detectáveis. Remova-os da versão pública.');
   if(candidate.resume_text?.trim())await db.prepare(`INSERT INTO candidate_public_resumes(candidate_id,source_hash,public_text,reviewed_by) VALUES(?,?,?,?) ON CONFLICT(candidate_id) DO UPDATE SET source_hash=EXCLUDED.source_hash,public_text=EXCLUDED.public_text,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=datetime('now')`).run(candidate.id,b.source_hash,cv,userId);
   await db.prepare("UPDATE reports SET status='validado',reviewed_by=?,reviewed_at=datetime('now'),published_at=datetime('now'),professional_summary=?,public_summary_json=? WHERE id=?").run(userId,lines.join('\n'),j(publication),report.id);
   await db.prepare("UPDATE applications SET released_by=?,released_at=datetime('now') WHERE id=?").run(userId,app.id);
   await setStage(app.id,'liberado_para_cliente');
   const company=await db.prepare('SELECT * FROM companies WHERE id=?').get(job.company_id) as any;
   const contact=await db.prepare("SELECT phone FROM users WHERE company_id=? AND role='CLIENTE' AND active=1 ORDER BY created_at LIMIT 1").get(job.company_id) as any;
   await draft({event:`application:${app.id}:cliente-disponivel`,jobId:job.id,applicationId:app.id,candidateId:candidate.id,companyId:job.company_id,recipient:company.name,phone:company.contact_phone||contact?.phone,message:`Triatalent: há um candidato aguardando sua análise para a vaga ${job.title} (${candidateCode(candidate.id)}). Acesse o currículo e o parecer e aprove para seguir ao pagamento ou reprove o perfil. ${siteLink('/cliente/candidato/'+app.id)}`});
  }else{
   await db.prepare('UPDATE reports SET published_at=NULL WHERE application_id=?').run(app.id);
   await setStage(app.id,'encerramento',{closed_reason:'Não aprovado pela equipe para esta vaga.'});
  }
  await db.prepare("UPDATE applications SET team_decision=?,team_reviewed_by=?,team_reviewed_at=datetime('now') WHERE id=?").run(b.decision,userId,app.id);
  await draft({event:`application:${app.id}:candidato:${b.decision}`,jobId:job.id,applicationId:app.id,candidateId:candidate.id,recipient:candidate.name,phone:candidate.whatsapp||candidate.phone,message:b.decision==='aprovado'?`Triatalent: sua candidatura à vaga ${job.title} foi aprovada para apresentação à empresa. Isso ainda não é uma oferta de emprego nem garantia de contratação. Acompanhe seu portal. ${siteLink('/me/candidaturas')}`:`Triatalent: agradecemos sua participação na seleção para ${job.title}. Após análise da equipe, sua candidatura não seguirá nesta oportunidade. Você pode participar de outras vagas compatíveis com seu perfil. ${siteLink('/me/candidaturas')}`});
  await audit(userId,'decisao_equipe','applications',app.id,{decision:b.decision,reportId:report.id});
  return {msg:'Decisão registrada. Confira e envie os avisos na fila de WhatsApp.'};
 })();
}
