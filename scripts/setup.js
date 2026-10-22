/**
 * Script de preparação: cria as tabelas no banco PostgreSQL.
 * Uso: npm run setup
 *
 * Precisa da variável DATABASE_URL (veja o arquivo .env.local).
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { openDatabase } = require('./pg');

async function main() {
  const db = openDatabase();
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await db.exec(schema);
  // Atualiza apenas o nome antigo exato; preserva personalizações e dados.
  await db.prepare("UPDATE settings SET value_json = ? WHERE key = 'company_name' AND value_json = ?").run(JSON.stringify('Triatalent'), JSON.stringify(['LC','Recrutamento'].join(' ')));
  await db.prepare("UPDATE users SET name=? WHERE email=? AND name=?").run('Marina Costa (Admin Triatalent)','admin@lcrecrutamento.com.br','Marina Costa (Admin '+['L','C'].join('')+')');
  console.log('✔ Tabelas criadas/conferidas no banco PostgreSQL.');
  await db.close();
}

main().catch((e) => {
  console.error('\n  [ERRO] Não consegui preparar o banco de dados.');
  console.error('  ', e.message);
  console.error('\n  Verifique a variável DATABASE_URL no arquivo .env.local\n');
  process.exit(1);
});
