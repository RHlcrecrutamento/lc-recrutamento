@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo Triatalent V4 - atualizar sem apagar dados
if not exist ".env.local" (
 echo Falta seu .env.local original nesta pasta. Nao use credenciais de exemplo.
 echo Copie os arquivos da atualizacao para a pasta do programa que ja funciona.
 pause
 exit /b 1
)
echo Preserve um backup da pasta e do banco antes de continuar.
echo Este atualizador nao executa seed nem reset.
echo Feche a outra janela que esteja rodando o site antes de continuar.
pause
call npm install
if errorlevel 1 goto erro
call npm run setup
if errorlevel 1 goto erro
call npm run build
if errorlevel 1 goto erro
echo.
echo Atualizacao concluida. Abra http://localhost:3000 quando aparecer Ready.
call npm start
pause
exit /b 0
:erro
echo.
echo A atualizacao parou por erro. Nao apague o banco e nao execute seed.
echo Guarde a mensagem de erro e consulte LEIA-ME-SIMPLES-V4.md.
pause
exit /b 1
