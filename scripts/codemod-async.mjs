/**
 * Codemod: migra o código de chamadas síncronas para assíncronas (PostgreSQL).
 *
 * Faz três coisas, em ciclos, até estabilizar:
 *   A) insere "await" antes das chamadas ao banco e aos helpers assíncronos;
 *   B) marca como "async" toda função que passou a conter um await próprio,
 *      ajustando o tipo de retorno (boolean -> Promise<boolean>);
 *   C) detecta "promessas soltas" (função assíncrona chamada sem await nem uso
 *      do resultado) — o erro mais perigoso da migração, porque o TypeScript
 *      NÃO reclama dele.
 *
 * Usa a árvore sintática real do TypeScript (não substituição de texto).
 *
 * Uso: node scripts/codemod-async.mjs [--check] [--verbose]
 */
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const CHECK = process.argv.includes('--check');
const VERBOSE = process.argv.includes('--verbose');

const HELPERS = new Set([
  'audit',
  'getSetting',
  'setSetting',
  'setStage',
  'initSchema',
  'ensureDefaultSettings',
]);
const DB_METHODS = new Set(['prepare', 'exec', 'transaction']);
/** Chamadas que NÃO devem ganhar await automático (tratadas à mão). */
const SKIP_CHAINS = new Set(['db.transaction']);

function collectFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectFiles(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const isFunctionLike = (n) =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n);

/**
 * Sobe pela cadeia de chamadas: em `db.prepare(x).get(y)`, o nó relevante é a
 * chamada MAIS EXTERNA — é ela que precisa do await na frente.
 */
function chainTop(node) {
  let cur = node;
  for (;;) {
    const p = cur.parent;
    if (p && ts.isPropertyAccessExpression(p) && p.expression === cur) {
      const gp = p.parent;
      if (gp && ts.isCallExpression(gp) && gp.expression === p) {
        cur = gp;
        continue;
      }
    }
    return cur;
  }
}

function chainLabel(node) {
  const e = node.expression;
  if (ts.isPropertyAccessExpression(e)) {
    const base = ts.isCallExpression(e.expression) ? chainLabel(e.expression) : e.expression.getText();
    return `${base}.${e.name.text}`;
  }
  return e.getText ? e.getText() : '';
}

function containsOwnAwait(node) {
  let found = false;
  const walk = (n) => {
    if (found) return;
    if (n !== node && isFunctionLike(n)) return;
    if (ts.isAwaitExpression(n)) {
      found = true;
      return;
    }
    n.forEachChild(walk);
  };
  node.forEachChild(walk);
  return found;
}

function hasAsync(node) {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!mods?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

function asyncInsertPos(node) {
  if (!ts.isArrowFunction(node)) {
    const kw = node.getChildren().find((c) => c.kind === ts.SyntaxKind.FunctionKeyword);
    if (kw) return kw.getStart();
  }
  return node.getStart();
}

function isTargetCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const e = node.expression;
  if (ts.isPropertyAccessExpression(e)) {
    return ts.isIdentifier(e.expression) && e.expression.text === 'db' && DB_METHODS.has(e.name.text);
  }
  if (ts.isIdentifier(e)) return HELPERS.has(e.text);
  return false;
}

/* ------------------------------------------------------------------ */

let totA = 0,
  totB = 0,
  totC = 0,
  totD = 0;

/**
 * Carrega as opções REAIS do tsconfig (principalmente os "paths" de @/...),
 * senão o type checker não resolve os imports e devolve "any" para tudo.
 */
function projectOptions() {
  const configPath = path.join(ROOT, 'tsconfig.json');
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(raw.config || {}, ts.sys, ROOT);
  return {
    ...parsed.options,
    noEmit: true,
    skipLibCheck: true,
    strict: false,
  };
}

for (let round = 1; round <= 15; round++) {
  const files = collectFiles(SRC);
  const program = ts.createProgram(files, projectOptions());
  const checker = program.getTypeChecker();
  let rA = 0,
    rB = 0,
    rC = 0,
    rD = 0;

  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const edits = [];
    // Componentes de cliente (React): promessas soltas são normais e tratadas
    // pelo React (useEffect/handlers). Não mexer — virar async quebraria o useEffect.
    const isClientComponent = sf.getFullText().includes("'use client'") || sf.getFullText().includes('"use client"');

    const visit = (node) => {
      if (isTargetCall(node)) {
        const label = chainLabel(node);
        if (!SKIP_CHAINS.has(label)) {
          const top = chainTop(node);
          const awaited = top.parent && ts.isAwaitExpression(top.parent);
          if (!awaited) {
            edits.push({ pos: top.getStart(), end: top.getStart(), text: 'await ' });
            rA++;
          }
        }
      }

      // promessas soltas: chamada assíncrona como instrução isolada
      if (
        !isClientComponent &&
        ts.isCallExpression(node) &&
        ts.isExpressionStatement(node.parent) &&
        !isTargetCall(node) &&
        !(node.parent && ts.isAwaitExpression(node.parent))
      ) {
        try {
          const t = checker.getTypeAtLocation(node);
          const s = checker.typeToString(t);
          if (t?.symbol?.name === 'Promise' || /^Promise</.test(s)) {
            edits.push({ pos: node.getStart(), end: node.getStart(), text: 'await ' });
            rC++;
            if (VERBOSE) console.log(`    [solta] ${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.getText().slice(0, 70)}`);
          }
        } catch {
          /* ignora */
        }
      }
      // D) QUALQUER chamada que devolve Promise precisa de await, exceto nos
      //    usos em que a promessa é justamente o que se quer passar adiante.
      if (
        !isClientComponent &&
        ts.isCallExpression(node) &&
        !isTargetCall(node) &&
        !(node.parent && ts.isAwaitExpression(node.parent)) &&
        !ts.isExpressionStatement(node.parent)
      ) {
        const p = node.parent;
        const legit =
          (p && ts.isReturnStatement(p)) ||
          (p && ts.isArrowFunction(p) && p.body === node) ||
          (p && ts.isPropertyAccessExpression(p) && ['then', 'catch', 'finally'].includes(p.name.text)) ||
          (p && ts.isVoidExpression(p)) ||
          (p &&
            ts.isCallExpression(p) &&
            ts.isPropertyAccessExpression(p.expression) &&
            ['all', 'allSettled', 'race', 'any'].includes(p.expression.name.text));
        if (!legit) {
          try {
            const t = checker.getTypeAtLocation(node);
            const s = checker.typeToString(t);
            if (t?.symbol?.name === 'Promise' || /^Promise</.test(s)) {
              edits.push({ pos: node.getStart(), end: node.getStart(), text: 'await ' });
              rD++;
              if (VERBOSE)
                console.log(
                  `    [promise] ${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.getText().slice(0, 60)}`
                );
            }
          } catch {
            /* ignora */
          }
        }
      }
      node.forEachChild(visit);
    };
    visit(sf);

    const walkFn = (node) => {
      if (isFunctionLike(node) && !hasAsync(node) && node.body && containsOwnAwait(node)) {
        edits.push({ pos: asyncInsertPos(node), end: asyncInsertPos(node), text: 'async ' });
        rB++;
        // ajusta tipo de retorno: boolean -> Promise<boolean>
        const rt = node.type;
        if (rt) {
          const txt = rt.getText().trim();
          if (!/^Promise</.test(txt) && !['void', 'any', 'undefined', 'never'].includes(txt)) {
            edits.push({ pos: rt.getStart(), end: rt.getEnd(), text: `Promise<${txt}>` });
          }
        }
      }
      node.forEachChild(walkFn);
    };
    walkFn(sf);

    if (!edits.length) continue;

    // remove edições idênticas (as fases A e C podem mirar o mesmo ponto)
    const seen = new Set();
    const uniq = edits.filter((e) => {
      const k = `${e.pos}:${e.end}:${e.text}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    uniq.sort((a, b) => b.pos - a.pos || b.end - a.end);

    let text = sf.getFullText();
    let lastStart = Infinity;
    for (const e of uniq) {
      if (e.end > lastStart) continue; // evita sobreposição
      text = text.slice(0, e.pos) + e.text + text.slice(e.end);
      lastStart = e.pos;
    }
    if (!CHECK) fs.writeFileSync(file, text);
  }

  totA += rA;
  totB += rB;
  totC += rC;
  totD += rD;
  console.log(`  ciclo ${String(round).padStart(2)}: +${rA} await(db), +${rD} await(expressões), +${rB} async, +${rC} soltas`);
  if (!rA && !rB && !rC && !rD) break;
}

console.log(
  `\n${CHECK ? '[simulação] ' : ''}Total: ${totA} await(db) + ${totD} await(expressões), ${totB} funções async, ${totC} promessas soltas.`
);
