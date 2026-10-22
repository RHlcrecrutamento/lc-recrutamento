/** Aceitação incremental. Recusa banco e servidor remotos; não use no Render. */
require('dotenv').config({path:'.env.local'});
const {openDatabase}=require('./pg');
const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const BASE=process.env.TEST_BASE_URL || 'http://localhost:3000';
const url=new URL(process.env.DATABASE_URL || 'postgresql://invalid');
if(!['localhost','127.0.0.1'].includes(url.hostname) || !['localhost','127.0.0.1'].includes(new URL(BASE).hostname)) throw Error('Teste permitido somente com banco e servidor locais.');
const db=openDatabase();
const tag=crypto.randomBytes(8).toString('hex');
const email=tag+'@empresa.example.test';
const pass='EmpresaTeste@2026';
const fixtures=[];
let passed=0;
function check(name,condition){if(!condition)throw Error('FALHOU: '+name);passed++;console.log('✔ '+name);}
const body={company:'Empresa Fictícia '+tag,name:'Responsável Teste',email,password:pass,phone:'31999990000',state:'MG',city:'Contagem',accept:true};
async function post(path,body,cookie='',xff='127.0.0.7',origin=''){
 const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':xff,...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
 return {status:r.status,json:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]};
}
function cnpj(base){const d=s=>{let w=s.length-7;const sum=[...s].reduce((v,c)=>{v+=(c.charCodeAt(0)-48)*w;if(--w<2)w=9;return v},0);const n=sum%11;return n<2?'0':String(11-n)};return base+d(base)+d(base+d(base))}
async function main(){
 // Limpa somente os contadores de IPs fictícios dedicados a este teste local.
 for(const ip of ['127.0.0.7','127.0.0.9','127.0.0.10']) {
   const key=crypto.createHash('sha256').update('company-signup-ip:'+ip).digest('hex');
   await db.prepare('DELETE FROM auth_rate_limits WHERE key=?').run(key);
 }
 check('Página pública de cadastro existe',(await fetch(BASE+'/cadastro/empresa')).status===200);
 const loginHtml=await (await fetch(BASE+'/entrar/empresa')).text();
 check('Entrada da empresa oferece cadastro sem convite',loginHtml.includes('href="/cadastro/empresa"')&&!loginHtml.includes('somente por convite'));
 let r=await post('/api/auth/cadastro-empresa',{...body,accept:false});check('Termos obrigatórios',r.status===400);
 r=await post('/api/auth/cadastro-empresa',{...body,password:'123'});check('Senha fraca rejeitada',r.status===400);
 r=await post('/api/auth/cadastro-empresa',{...body,cnpj:'11111111111111'});check('CNPJ inválido rejeitado',r.status===400);
 r=await post('/api/auth/cadastro-empresa',{...body,website:'spam'});check('Campo anti-bot preenchido rejeitado',r.status===400);
 r=await post('/api/auth/cadastro-empresa',body,'','127.0.0.8','https://externo.example');check('Origem externa bloqueada',r.status===403);
 r=await post('/api/auth/cadastro-empresa',{...body,role:'ADMIN',company_id:'empresa_arbitraria',active:1});
 check('Empresa cria conta sem convite e sem serviço de e-mail',r.status===201);
 fixtures.push(r.json.data);
 check('Perfil forçado a CLIENTE pelo servidor',r.json.data.role==='CLIENTE');
 const first=r.json.data;
 const clientCookie=r.cookie;
 const user=await db.prepare('SELECT * FROM users WHERE id=?').get(first.id);
 const company=await db.prepare('SELECT * FROM companies WHERE id=?').get(first.company_id);
 check('Empresa nova gerada, sem usar company_id do navegador',company&&company.id!=='empresa_arbitraria'&&company.name===body.company);
 check('Conta vinculada somente à própria empresa',user.role==='CLIENTE'&&user.company_id===company.id);
 check('Senha armazenada com bcrypt',user.password_hash!==pass&&bcrypt.compareSync(pass,user.password_hash));
 check('Cadastro inicia sessão com cookie HttpOnly',!!clientCookie);
 const consent=await db.prepare("SELECT id FROM audit_logs WHERE user_id=? AND action='empresa_autocadastro'").get(first.id);
 check('Aceite e cadastro registrados na auditoria',!!consent);
 const html=await (await fetch(BASE+'/cliente',{headers:{Cookie:clientCookie}})).text();
 check('Nova empresa entra no próprio painel',html.includes('Minhas vagas')||html.includes('Painel'));
 const denied=await fetch(BASE+'/admin',{headers:{Cookie:clientCookie},redirect:'manual'});
 check('Nova empresa não acessa painel administrativo',denied.status===307||denied.status===303);
 r=await post('/api/auth/cadastro-empresa',body,'','127.0.0.9');check('E-mail duplicado rejeitado',r.status===409);
 const after=await db.prepare('SELECT COUNT(*) AS n FROM companies WHERE name=?').get(body.company);
 check('Falha por e-mail não deixa empresa órfã',Number(after.n)===1);
 const vat=cnpj('90'+String(Date.now()).slice(-10));
 r=await post('/api/auth/cadastro-empresa',{...body,email:tag+'-b@empresa.example.test',company:'Empresa B '+tag,cnpj:vat},'','127.0.0.10');
 check('CNPJ válido aceito',r.status===201);fixtures.push(r.json.data);
 r=await post('/api/auth/cadastro-empresa',{...body,email:tag+'-c@empresa.example.test',cnpj:vat},'','127.0.0.10');
 check('CNPJ existente não cria vínculo automático',r.status===409);
 const other=await db.prepare('SELECT company_id FROM users WHERE id=?').get(fixtures[1].id);
 check('Duas empresas mantêm IDs distintos',other.company_id!==first.company_id);
 const existingApp=await db.prepare("SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.company_id<>? LIMIT 1").get(first.company_id);
 if(existingApp){const response=await fetch(BASE+'/api/cliente/candidatos/'+existingApp.id,{headers:{Cookie:clientCookie}});check('URL direta de candidato de outra empresa bloqueada',response.status===404);}
 r=await post('/api/auth/login',{email,password:pass,portal:'empresa'});check('Conta nova autentica pelo portal da empresa',r.status===200);
 r=await post('/api/auth/login',{email,password:pass,portal:'equipe'});check('Conta nova não autentica como equipe',r.status===403);
 r=await post('/api/auth/cadastro-empresa',{...body,email:tag+'-signed@empresa.example.test'},clientCookie);check('Cadastro não troca silenciosamente sessão ativa',r.status===409);
 const admin=await post('/api/auth/login',{email:'admin@lcrecrutamento.com.br',password:'Admin@123',portal:'equipe'});
 check('Administrador continua entrando',admin.status===200);
 const dashboard=await (await fetch(BASE+'/admin',{headers:{Cookie:admin.cookie}})).text();
 const paths=['/recrutamento/vagas','/recrutamento/candidatos','/recrutamento/avisos','/admin/empresas','/admin/usuarios','/admin/configuracoes','/admin/pagamentos','/admin/auditoria'];
 check('Duas filas clicáveis e administração avançada substituem os 12 indicadores',paths.every(p=>dashboard.includes('href="'+p+'"'))&&dashboard.includes('Vagas aguardando revisão')&&dashboard.includes('Candidatos aguardando análise'));
 for(const path of paths){const response=await fetch(BASE+path,{headers:{Cookie:admin.cookie}});check('Destino abre: '+path,response.status===200);}
 const pending=await (await fetch(BASE+'/admin/entrevistas?filtro=pendentes',{headers:{Cookie:admin.cookie}})).text();
 check('Filtro de entrevistas não mostra seção de relatórios',!pending.includes('Relatórios ('));
 const review=await (await fetch(BASE+'/admin/entrevistas?filtro=revisar',{headers:{Cookie:admin.cookie}})).text();
 check('Filtro de revisão não mostra seção de entrevistas',!review.includes('Entrevistas ('));
 console.log(`\n${passed} verificações incrementais aprovadas.`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 for(const f of fixtures){if(!f?.id)continue;await db.prepare('DELETE FROM sessions WHERE user_id=?').run(f.id);await db.prepare('DELETE FROM users WHERE id=?').run(f.id);await db.prepare('DELETE FROM companies WHERE id=?').run(f.company_id);await db.prepare('DELETE FROM audit_logs WHERE user_id=?').run(f.id);}
 await db.close();
});
