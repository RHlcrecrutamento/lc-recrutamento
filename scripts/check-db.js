/**
 * Verifica o estado do banco de dados na nuvem.
 * Usado pelo iniciar.bat / iniciar.sh para decidir se precisa preparar o banco.
 *
 * Saída (uma palavra, para o script ler):
 *   PRONTO       - banco existe e já tem dados
 *   VAZIO        - banco existe mas não tem dados (precisa de seed)
 *   SEM_TABELAS  - banco acessível mas sem tabelas (precisa de setup)
 *   SEM_CONEXAO  - não conseguiu conectar (DATABASE_URL errada?)
 */
require('dotenv').config({ path: '.env.local' });
const { openDatabase } = require('./pg');

(async () => {
  const db = openDatabase();
  try {
    const r = await db.prepare('SELECT count(*) AS n FROM settings').get();
    console.log(r && Number(r.n) > 0 ? 'PRONTO' : 'VAZIO');
    await db.close();
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (/relation .* does not exist|tabela|42P01/i.test(msg)) {
      console.log('SEM_TABELAS');
    } else {
      console.log('SEM_CONEXAO');
      console.error('   detalhe: ' + msg);
    }
    try {
      await db.close();
    } catch {}
    process.exit(0);
  }
})();
