@echo off
color B
cls
echo ==========================================
echo  Iniciando aplicação com NPM START
echo  Reiniciará automaticamente se ocorrer erro
echo ==========================================
echo.

:loop
REM Aguarda 3m segundos antes de iniciar (tempo inicial)
timeout /t 10 /nobreak

color D
REM Inicia o app
echo Iniciando NPM START...
npm start

REM Se o NPM sair (por erro ou não), aguarda 3 segundos antes de tentar novamente
color 4
echo NPM foi finalizado. Reiniciando em 3 segundos...
timeout /t 3 /nobreak

goto loop