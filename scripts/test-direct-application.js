/** Teste incremental LOCAL. Não executar no Render nem com banco real. */
require('dotenv').config({path:'.env.local'});
const crypto=require('crypto');
const {openDatabase}=require('./pg');
const BASE=process.env.TEST_BASE_URL || 'http://localhost:3000';
if(!['127.0.0.1','localhost'].includes(new URL(BASE).hostname)||!['127.0.0.1','localhost'].includes(new URL(process.env.DATABASE_URL||'postgresql://invalid').hostname))throw Error('Teste bloqueado: exige banco e servidor locais.');
const db=openDatabase();const tag=crypto.randomBytes(6).toString('hex');const email='direct-'+tag+'@example.test';const jobs=[];let userId,candidateId,n=0;
function check(name,value){if(!value)throw Error('FALHOU: '+name);n++;console.log('✔ '+name);}
async function post(path,body,cookie='',origin=''){const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});return{status:r.status,json:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]};}
async function main(){
 const company=await db.prepare("SELECT company_id FROM users WHERE email='cliente@technova.com.br'").get();if(!company)throw Error('Exige dados fictícios locais de demonstração.');
 for(const [suffix,pub,status] of [['open',1,'aprovada'],['private',0,'aprovada'],['closed',1,'concluida'],['cancel',1,'em_recrutamento']]){const id='job_direct_'+tag+'_'+suffix;jobs.push(id);await db.prepare('INSERT INTO jobs (id,company_id,title,status,is_public,requirements_mandatory) VALUES (?,?,?,?,?,?)').run(id,company.company_id,'Teste direto '+suffix,status,pub,'Experiência com atendimento');}
 const [job,privateJob,closedJob,cancelJob]=jobs;
 const response=await fetch(BASE+'/candidatar/'+job,{redirect:'manual'});
 check('Candidato sem conta é levado ao cadastro preservando a vaga',response.status===307&&response.headers.get('location').includes('/cadastro?vaga='+job));
 const registerHtml=await(await fetch(BASE+'/cadastro?vaga='+job)).text();check('Cadastro mostra vaga e mantém link de login com a vaga',registerHtml.includes('Teste direto open')&&registerHtml.includes('/entrar/candidato?vaga='+job));
 let r=await post('/api/candidaturas/inscricao',{job_id:job,email:'ana.souza@exemplo.com.br',name:'Invasor'});check('Só informar e-mail de terceiro não dá acesso a entrevista',r.status===401&&!r.json.data?.interview_url);
 r=await post('/api/auth/cadastro',{name:'Pessoa Fictícia Direta',email,password:'DiretaTeste@2026',phone:'31999990000',skills:'Atendimento',experience:'Atuei com atendimento ao público por dois anos.'});
 check('Cadastro gratuito cria sessão de candidato',r.status===201&&r.json.data.role==='CANDIDATO'&&!!r.cookie);userId=r.json.data.id;candidateId=r.json.data.candidate_id;const cookie=r.cookie;
 const a=await fetch(BASE+'/cadastro?vaga='+job,{headers:{Cookie:cookie},redirect:'manual'});check('Quem já entrou segue do cadastro à candidatura correta',a.status===307&&a.headers.get('location').includes('/candidatar/'+job));
 const user=await db.prepare("SELECT candidate_id FROM users WHERE email='ana.souza@exemplo.com.br'").get();
 const pair=await Promise.all([post('/api/candidaturas/inscricao',{job_id:job,candidate_id:user.candidate_id,email:'ana.souza@exemplo.com.br'},cookie),post('/api/candidaturas/inscricao',{job_id:job},cookie)]);
 check('Candidatura libera entrevista imediatamente sem aprovação',pair.every(x=>[200,201].includes(x.status)&&x.json.data.interview_url.startsWith('/entrevista/')));
 check('Cliques simultâneos retornam a mesma entrevista',pair[0].json.data.interview_url===pair[1].json.data.interview_url);
 const appId=pair[0].json.data.application_id;const interviewPath=pair[0].json.data.interview_url;const token=interviewPath.split('/').pop();
 const app=await db.prepare('SELECT * FROM applications WHERE id=?').get(appId);check('Candidatura pertence ao perfil da sessão, não ao ID recebido',app.candidate_id===candidateId&&app.candidate_id!==user.candidate_id);
 check('Candidato não é publicado automaticamente',app.stage<11&&!app.released_at&&!app.released_by);
 check('Uma única candidatura e uma única entrevista são criadas',Number((await db.prepare('SELECT COUNT(*) n FROM applications WHERE candidate_id=? AND job_id=?').get(candidateId,job)).n)===1&&Number((await db.prepare('SELECT COUNT(*) n FROM interviews WHERE application_id=?').get(appId)).n)===1);
 check('Entrevista abre por link imediato',(await fetch(BASE+interviewPath)).status===200);
 const client=await post('/api/auth/login',{email:'cliente@technova.com.br',password:'Cliente@123',portal:'empresa'});
 r=await post('/api/candidaturas/inscricao',{job_id:job},client.cookie);check('Empresa não pode se inscrever como candidato',r.status===403);
 const hidden=await fetch(BASE+'/api/cliente/candidatos/'+appId,{headers:{Cookie:client.cookie}});check('Empresa não vê candidato antes da revisão',hidden.status===403);
 r=await post('/api/candidaturas/inscricao',{job_id:privateJob},cookie);check('Vaga privada bloqueada',r.status===404);
 r=await post('/api/candidaturas/inscricao',{job_id:closedJob},cookie);check('Vaga encerrada bloqueada',r.status===409);
 r=await post('/api/candidaturas/inscricao',{job_id:job},cookie,'https://externo.example');check('Origem externa bloqueada',r.status===403);
 r=await post('/api/entrevista/'+token,{action:'iniciar',consent:false});check('Consentimento ainda é obrigatório',r.status===400);
 r=await post('/api/entrevista/'+token,{action:'iniciar',consent:true});check('Candidato inicia entrevista sem intervenção da equipe',r.status===200);
 let info=await(await fetch(BASE+'/api/entrevista/'+token)).json();check('Perguntas derivadas da vaga estão disponíveis',info.ok&&info.data.current_question&&info.data.total_questions>=1);
 for(let i=0;i<60&&!info.data.completed;i++){const q=info.data.current_question;const body={action:'responder',question_key:q.key,...(q.type==='choice'?{choice_index:0}:q.type==='employment'?{employment:{unavailable:true}}:{answer:'Resposta profissional fictícia de atendimento.'})};r=await post('/api/entrevista/'+token,body);if(r.status!==200)throw Error('Falha ao responder '+r.status+' '+JSON.stringify(r.json));info=await(await fetch(BASE+'/api/entrevista/'+token)).json();}
 check('Entrevista direta pode ser concluída',info.data.completed===true);
 const report=await db.prepare('SELECT * FROM reports WHERE application_id=?').get(appId);check('Relatório aguarda revisão humana',report?.status==='aguardando_revisao'&&!report.published_at&&!report.reviewed_by);
 const finished=await db.prepare('SELECT * FROM applications WHERE id=?').get(appId);check('Após concluir continua sem liberação para a empresa',finished.stage===8&&!finished.released_at);
 const blocked=await fetch(BASE+'/api/cliente/candidatos/'+appId,{headers:{Cookie:client.cookie}});check('Relatório concluído sozinho não torna candidato visível',blocked.status===403);
 r=await post('/api/candidaturas/inscricao',{job_id:job},cookie);check('Entrevista concluída não é refeita ao clicar novamente',r.status===200&&r.json.data.interview_url===interviewPath&&r.json.data.interview_status==='concluida');
 check('Não cria segunda entrevista nem relatório duplicado',Number((await db.prepare('SELECT COUNT(*) n FROM interviews WHERE application_id=?').get(appId)).n)===1&&Number((await db.prepare('SELECT COUNT(*) n FROM reports WHERE application_id=?').get(appId)).n)===1);
 r=await post('/api/candidaturas/inscricao',{job_id:cancelJob},cookie);const cancelId=r.json.data.application_id;await db.prepare("UPDATE interviews SET status='cancelada' WHERE application_id=?").run(cancelId);
 r=await post('/api/candidaturas/inscricao',{job_id:cancelJob},cookie);check('Cancelamento pela equipe não é desfeito pelo candidato',r.status===410);
 console.log(`\n${n} verificações do fluxo direto aprovadas.`);
}
async function cleanup(){
 for(const job of jobs){const apps=await db.prepare('SELECT id FROM applications WHERE job_id=?').all(job);for(const a of apps){const ints=await db.prepare('SELECT id FROM interviews WHERE application_id=?').all(a.id);const reports=await db.prepare('SELECT id FROM reports WHERE application_id=?').all(a.id);for(const r of reports)await db.prepare('DELETE FROM report_notes WHERE report_id=?').run(r.id);await db.prepare('DELETE FROM reports WHERE application_id=?').run(a.id);for(const i of ints){await db.prepare('DELETE FROM interview_answers WHERE interview_id=?').run(i.id);await db.prepare('DELETE FROM interview_messages WHERE interview_id=?').run(i.id);}await db.prepare('DELETE FROM interviews WHERE application_id=?').run(a.id);await db.prepare('DELETE FROM applications WHERE id=?').run(a.id);}await db.prepare('DELETE FROM jobs WHERE id=?').run(job);}
 if(candidateId)await db.prepare('DELETE FROM consents WHERE candidate_id=?').run(candidateId);
 if(userId){await db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);await db.prepare('UPDATE candidates SET user_id=NULL WHERE id=?').run(candidateId);await db.prepare('DELETE FROM users WHERE id=?').run(userId);}
 if(candidateId)await db.prepare('DELETE FROM candidates WHERE id=?').run(candidateId);
 await db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(cleanup);
