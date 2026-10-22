#!/usr/bin/env bash
# ==========================================================
#  Triatalent - Inicializador (Linux / macOS)
#  Uso:  ./iniciar.sh
# ==========================================================
set -u
cd "$(dirname "$0")"

echo
echo "  ================================================"
echo "   Triatalent - Plataforma ATS"
echo "  ================================================"
echo

# ---------- 1) Node.js ----------
if ! command -v node >/dev/null 2>&1; then
  echo "  [ERRO] O Node.js não foi encontrado."
  echo "  Baixe a versão LTS gratuita em: https://nodejs.org"
  exit 1
fi
NODEVER=$(node -v)
NODEMAJOR=${NODEVER#v}; NODEMAJOR=${NODEMAJOR%%.*}
echo "  Node.js encontrado: $NODEVER"
if [ "$NODEMAJOR" -lt 18 ]; then
  echo "  [ERRO] Node.js antigo. Instale a versão LTS de https://nodejs.org"
  exit 1
fi

# ---------- 2) Dependências ----------
if [ ! -f "node_modules/next/package.json" ]; then
  echo
  echo "  Instalando as peças do sistema (aguarde 1 a 5 minutos)..."
  npm install --no-audit --no-fund || { echo "  [ERRO] A instalação falhou."; exit 1; }
fi

# ---------- 3) Endereço do banco ----------
if [ ! -f ".env.local" ]; then
  echo "  [ERRO] Falta o arquivo .env.local (endereço do banco de dados)."
  echo "  Veja o guia: GUIA-PUBLICAR-NA-INTERNET.md"
  exit 1
fi
if ! grep -q "^DATABASE_URL=postgresql" .env.local; then
  echo "  [ERRO] O .env.local não tem um endereço de banco válido."
  echo "  A linha precisa começar com: DATABASE_URL=postgresql://..."
  exit 1
fi

# ---------- 4) Banco preparado? ----------
echo "  Verificando o banco de dados na nuvem..."
DBSTATE=$(node scripts/check-db.js 2>/dev/null | tail -1)

case "$DBSTATE" in
  SEM_CONEXAO)
    echo "  [ERRO] Não consegui conectar no banco de dados."
    echo "  Confira o DATABASE_URL no arquivo .env.local."
    exit 1 ;;
  SEM_TABELAS)
    echo "  Criando as tabelas do banco..."
    npm run setup || exit 1
    DBSTATE=VAZIO ;;
esac

if [ "$DBSTATE" = "VAZIO" ]; then
  echo "  Banco sem configuração. Confira DATABASE_URL e LEIA-ME-SIMPLES-V4.md."
  echo "  Não criarei dados de demonstração automaticamente. Não rode seed em banco real."
  exit 1
fi
npm run setup || exit 1
echo "  Banco de dados: OK"

# ---------- 5) Compilação ----------
if [ ! -f ".next/BUILD_ID" ]; then
  echo
  echo "  Preparando o sistema pela PRIMEIRA VEZ (1 a 3 minutos)..."
  npm run build || { echo "  [ERRO] A compilação falhou."; exit 1; }
fi

# ---------- 6) Inicia ----------
echo
echo "  ================================================"
echo "   Sistema iniciando!"
echo "   Abra o navegador e digite:  http://localhost:3000"
echo "   Para encerrar: Ctrl + C"
echo "  ================================================"
echo
npm run start
