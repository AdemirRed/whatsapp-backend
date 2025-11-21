@echo off
echo ================================
echo   WhatsApp API - Teste Rápido
echo ================================
echo.

:: Verificar se Node.js está disponível
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js detectado no sistema
    goto :test_api
) else (
    echo ❌ Node.js não encontrado no sistema
    echo 💡 O script start.bat fará o download automático
)

:test_api
echo.
echo 🧪 Testando estrutura do projeto...

if exist "server.js" (
    echo ✅ server.js - OK
) else (
    echo ❌ server.js - FALTANDO
    goto :error
)

if exist "src" (
    echo ✅ src/ - OK
) else (
    echo ❌ src/ - FALTANDO
    goto :error
)

if exist "node_modules" (
    echo ✅ node_modules/ - OK
) else (
    echo ❌ node_modules/ - FALTANDO
    goto :error
)

if exist ".env" (
    echo ✅ .env - OK
) else (
    echo ❌ .env - FALTANDO
    goto :error
)

echo.
echo ✅ Estrutura do projeto: OK
echo 🚀 Pronto para uso!
echo.
echo 💡 Para iniciar: execute start.bat
echo 📖 Para ajuda: leia README.md
goto :end

:error
echo.
echo ❌ Estrutura incompleta!
echo 📋 Verifique se todos os arquivos foram copiados
goto :end

:end
echo.
pause