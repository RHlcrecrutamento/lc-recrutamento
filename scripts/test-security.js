/** Testes de segurança APENAS em banco e servidor locais. Nunca roda em produção. */
require('dotenv').config({path: '.env.local'});
const {openDatabase} = require('./pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
if (!['localhost','127.0.0.1'].includes(dbUrl.hostname) || !['localhost','127.0.0.1'].includes(new URL(BASE).hostname)) {
  throw new Error('Teste bloqueado: exige servidor e banco locais. Não use no Render.');
}
const db = openDatabase();
const uid = 'security_' + crypto.randomBytes(10).toString('hex');
const email = uid + '@example.test';
const password = 'SenhaTeste@2026';
let checks = 0;
function check(name, result) { if (!result) throw new Error('FALHOU: ' + name); console.log('✔ ' + name); checks++; }
async function post(path, body, cookie = '', origin = '') {
  const r = await fetch(BASE + path, {method: 'POST', headers: {'Content-Type':'application/json', ...(cookie ? {Cookie:cookie}:{}), ...(origin ? {Origin:origin}:{})}, body:JSON.stringify(body)});
  return {status:r.status, body:await r.json(), cookie:(r.headers.get('set-cookie') || '').split(';')[0]};
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
async function token(expired = false) {
  const t = crypto.randomBytes(32).toString('hex');
  const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(uid);
  await db.prepare('INSERT INTO password_resets (token_hash, user_id, password_hash_at_issue, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha(t),uid,user.password_hash,new Date(Date.now() + (expired ? -1000 : 1800000)).toISOString());
  return t;
}
async function main() {
  await db.prepare("INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,'CANDIDATO')")
    .run(uid,'Conta temporária de segurança',email,bcrypt.hashSync(password,10));
  for (const path of ['/entrar','/entrar/empresa','/entrar/candidato','/entrar/equipe','/recuperar-senha','/redefinir-senha','/marca/triatalent.webp']) {
    check('Página/asset ' + path, (await fetch(BASE+path)).status === 200);
  }
  let r = await post('/api/auth/login',{email,password,portal:'empresa'});
  check('Candidato não entra pelo portal da empresa',r.status===403 && !r.cookie);
  r = await post('/api/auth/login',{email,password,portal:'equipe'});
  check('Candidato não entra pelo portal da equipe',r.status===403 && !r.cookie);
  r = await post('/api/auth/login',{email,password,portal:'candidato'});
  check('Candidato entra no portal correto',r.status===200 && !!r.cookie);
  let cookie = r.cookie;
  r = await post('/api/auth/login',{email,password,portal:'candidato'},'','https://origem-invalida.example');
  check('Origem externa é bloqueada',r.status===403);
  r = await post('/api/admin/convites',{id:uid},cookie);
  check('Convite é exclusivo do administrador',r.status===403);
  r = await post('/api/auth/senha',{current:password,password:'OutraSenha@2026'});
  check('Troca de senha sem sessão rejeitada',r.status===401);
  r = await post('/api/auth/senha',{current:'errada',password:'OutraSenha@2026'},cookie);
  check('Senha atual obrigatória',r.status===400);
  r = await post('/api/auth/senha',{current:password,password:'fraca'},cookie);
  check('Senha fraca rejeitada',r.status===400);
  r = await post('/api/auth/senha',{current:password,password},cookie);
  check('Reutilizar a mesma senha é rejeitado',r.status===400);
  const oldToken = await token();
  r = await post('/api/auth/senha',{current:password,password:'OutraSenha@2026'},cookie);
  check('Troca de senha com confirmação atual funciona',r.status===200);
  check('Troca encerra todas as sessões',!(await db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(uid)));
  r = await post('/api/auth/redefinir',{token:oldToken,password:'LinkAntigo@2026'});
  check('Troca invalida links anteriores',r.status===400);
  r = await post('/api/auth/redefinir',{token:await token(true),password:'Expirado@2026'});
  check('Link expirado rejeitado',r.status===400);
  r = await post('/api/auth/redefinir',{token:'invalido',password:'NovaSenha@2026'});
  check('Token inválido rejeitado',r.status===400);
  r = await post('/api/auth/login',{email,password:'OutraSenha@2026',portal:'candidato'});
  check('Nova senha permite login',r.status===200);
  const t = await token();
  r = await post('/api/auth/redefinir',{token:t,password:'SenhaFinal@2026'});
  check('Redefinição por token válido funciona',r.status===200);
  r = await post('/api/auth/redefinir',{token:t,password:'ReusoSenha@2026'});
  check('Token é de uso único',r.status===400);
  check('Redefinição encerra todas as sessões',!(await db.prepare('SELECT id FROM sessions WHERE user_id = ?').get(uid)));
  r = await post('/api/auth/login',{email,password:'SenhaFinal@2026',portal:'candidato'});
  check('Senha redefinida autentica corretamente',r.status===200);
  const missing = 'missing_'+uid+'@example.test';
  for(let i=0;i<11;i++) r = await post('/api/auth/login',{email:missing,password:'Errada@2026',portal:'candidato'});
  check('Tentativas repetidas recebem 429',r.status===429);
  r = await post('/api/auth/recuperar',{email:'nao-existe-'+uid+'@example.test'});
  if (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY) check('Sem e-mail configurado não simula envio',r.status===503);
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  check('Senha nunca é armazenada em texto puro',row.password_hash !== 'SenhaFinal@2026' && bcrypt.compareSync('SenhaFinal@2026',row.password_hash));
  console.log(`\n${checks} verificações de segurança aprovadas. Envio real de e-mail NÃO foi testado.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  await db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  await db.close();
});
