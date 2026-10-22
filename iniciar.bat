@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
REM ==========================================================
REM  Triatalent - Inicializador (Windows)
REM  De dois cliques neste arquivo para iniciar o sistema.
REM ==========================================================
cd /d "%~dp0"

echo.
echo   ================================================
echo    Triatalent - Plataforma ATS
echo   ================================================
echo.

REM ---------- 1) Verifica se o Node.js esta instalado ----------
where node >nul 2>nul
if errorlevel 1 (
  echo   [ERRO] O Node.js nao foi encontrado neste computador.
  echo.
  echo   Faca o download GRATUITO em: https://nodejs.org
  echo   Escolha a versao "LTS", clique em Avancar ate terminar.
  echo   Depois, abra este arquivo novamente ^(iniciar.bat^).
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo   [ERRO] O npm nao foi encontrado. Reinstale o Node.js: https://nodejs.org
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo   Node.js encontrado: !NODEVER!

for /f "tokens=1 delims=." %%a in ("!NODEVER:v=!") do set NODEMAJOR=%%a
if !NODEMAJOR! LSS 18 (
  echo.
  echo   [ERRO] Seu Node.js e antigo ^(versao !NODEVER!^).
  echo   Baixe a versao LTS em https://nodejs.org e instale por cima.
  echo.
  pause
  exit /b 1
)

REM ---------- 2) Instala as dependencias se necessario ----------
if not exist "node_modules\next\package.json" (
  echo.
  echo   Instalando as pecas do sistema ^(primeira vez, aguarde 1 a 5 minutos^)...
  echo   Se aparecer uma janela de antivirus, clique em "Permitir".
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   [ERRO] A instalacao falhou. Verifique a internet e o antivirus.
    echo.
    pause
    exit /b 1
  )
)

REM ---------- 3) Verifica o endereco do banco de dados ----------
if not exist ".env.local" (
  echo.
  echo   [ERRO] Falta o arquivo ".env.local" nesta pasta.
  echo   Ele guarda o endereco do banco de dados na nuvem.
  echo   Veja o guia: GUIA-PUBLICAR-NA-INTERNET.md
  echo.
  pause
  exit /b 1
)

findstr /b "DATABASE_URL=postgresql" ".env.local" >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [ERRO] O arquivo ".env.local" nao tem um endereco de banco valido.
  echo   A linha precisa comecar com:  DATABASE_URL=postgresql://...
  echo.
  echo   Pegue esse endereco no painel do Supabase ^(veja o guia^)
  echo   e cole no arquivo .env.local, substituindo a linha antiga.
  echo.
  pause
  exit /b 1
)

REM ---------- 4) Confere se o banco ja esta preparado ----------
echo   Verificando o banco de dados na nuvem...
for /f "delims=" %%s in ('node scripts\check-db.js 2^>nul') do set DBSTATE=%%s

if "!DBSTATE!"=="SEM_CONEXAO" (
  echo.
  echo   [ERRO] Nao consegui conectar no banco de dados.
  echo   Confira se o endereco DATABASE_URL no arquivo .env.local esta
  echo   completo e se a sua internet esta funcionando.
  echo.
  pause
  exit /b 1
)

if "!DBSTATE!"=="SEM_TABELAS" (
  echo   Criando as tabelas do banco...
  call npm run setup
  if errorlevel 1 (
    echo   [ERRO] Nao foi possivel criar as tabelas.
    pause
    exit /b 1
  )
  set DBSTATE=VAZIO
)

if "!DBSTATE!"=="VAZIO" (
  echo   Banco sem configuracao. Nao criarei dados de exemplo automaticamente.
  echo   Esta atualizacao usa o banco existente. Confira DATABASE_URL.
  echo   Nao rode seed em banco real. Leia LEIA-ME-SIMPLES-V4.md.
  pause
  exit /b 1
)

call npm run setup
if errorlevel 1 (
  echo   Falha ao conferir a estrutura. Nao apague o banco.
  pause
  exit /b 1
)

echo   Banco de dados: OK

REM ---------- 5) Compila o sistema na primeira vez ----------
if not exist ".next\BUILD_ID" (
  echo.
  echo   Preparando o sistema pela PRIMEIRA VEZ ^(1 a 3 minutos^)...
  echo   Aparecerao varias mensagens na tela - e so aguardar, esta normal!
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo   [ERRO] A compilacao do sistema falhou.
    echo   Envie uma foto da mensagem de erro para o suporte.
    echo.
    pause
    exit /b 1
  )
)

REM ---------- 6) Inicia o sistema ----------
echo.
echo   ================================================
echo    Sistema iniciando!
echo    Abra o navegador e digite:  http://localhost:3000
echo    Para encerrar: feche esta janela.
echo   ================================================
echo.
call npm run start
echo.
echo   O sistema foi encerrado.
pause
