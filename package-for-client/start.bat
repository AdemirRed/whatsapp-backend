@echo off
title WhatsApp Web API v1.0.0
echo ================================
echo    WhatsApp Web API - v1.0.0
echo ================================
echo.

:: Verificar se Node.js existe
if exist "node.exe" goto :start_with_local

:: Verificar se Node.js está instalado no sistema
node --version >nul 2>&1
if %errorlevel% == 0 goto :start_with_system

echo ❌ Node.js não encontrado!
echo.
echo 📥 Baixando Node.js portável...
echo ⏳ Aguarde alguns minutos...
echo.

:: Baixar Node.js portável
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-x64.zip' -OutFile 'node.zip'}"

if not exist "node.zip" (
    echo ❌ Falha ao baixar Node.js
    echo 🌐 Verifique sua conexão com a internet
    pause
    exit /b 1
)

echo 📦 Extraindo Node.js...
powershell -Command "Expand-Archive -Path 'node.zip' -DestinationPath '.' -Force"
move "node-v18.17.0-win-x64\node.exe" "."
rmdir /s /q "node-v18.17.0-win-x64"
del "node.zip"

echo ✅ Node.js instalado com sucesso!
echo.

:start_with_local
echo 🚀 Iniciando servidor com Node.js local...
node server.js
goto :end

:start_with_system
echo 🚀 Iniciando servidor com Node.js do sistema...
node server.js
goto :end

:end
echo.
echo ⚠️  Servidor finalizado
pause