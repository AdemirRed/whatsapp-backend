# Script simples para testar WhatsApp API
$API_BASE = "https://whatsapp-backend-1-0eqq.onrender.com"
$headers = @{ "x-api-key" = "154466" }

Write-Host "🔍 Testando API..." -ForegroundColor Cyan

# Testar ping
try {
    $ping = Invoke-RestMethod -Uri "$API_BASE/ping" -Headers $headers
    Write-Host "✅ Ping: $($ping.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no ping: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Testar health
try {
    $health = Invoke-RestMethod -Uri "$API_BASE/health" -Headers $headers
    Write-Host "📊 Sessões encontradas:" -ForegroundColor Blue
    $health.sessionDirectory.files | ForEach-Object {
        Write-Host "   - $_" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️ Health check falhou" -ForegroundColor Yellow
}

# Testar status da sessão redblack
Write-Host "`n🔍 Status da sessão 'redblack':" -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "$API_BASE/session/status/redblack" -Headers $headers
    Write-Host "   Status: $($status.state)" -ForegroundColor $(if ($status.state -eq "CONNECTED") { "Green" } else { "Red" })
    Write-Host "   Mensagem: $($status.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao verificar status: $($_.Exception.Message)" -ForegroundColor Red
}

# Se não conectado, mostrar QR
Write-Host "`n📱 Obtendo novo QR Code..." -ForegroundColor Cyan
try {
    $qr = Invoke-RestMethod -Uri "$API_BASE/session/qr/redblack" -Headers $headers
    Write-Host "✅ QR Code gerado!" -ForegroundColor Green
    Write-Host $qr.qr -ForegroundColor Yellow
    Write-Host "`n📋 Para conectar:" -ForegroundColor Blue
    Write-Host "1. Abra WhatsApp no celular" -ForegroundColor White
    Write-Host "2. Vá em Configurações > Aparelhos conectados" -ForegroundColor White
    Write-Host "3. Toque em 'Conectar um aparelho'" -ForegroundColor White
    Write-Host "4. Escaneie o QR code acima" -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao obter QR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n⏳ Aguarde alguns segundos e verifique o status novamente..." -ForegroundColor Yellow
