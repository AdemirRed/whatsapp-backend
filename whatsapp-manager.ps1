# Script PowerShell para Gerenciar Clientes WhatsApp
# Uso: . .\whatsapp-manager.ps1

# Configurações
$API_BASE = "https://whatsapp-backend-1-0eqq.onrender.com"
$API_KEY = "154466"
$headers = @{ "x-api-key" = $API_KEY }

# Função para testar API
function Test-WhatsAppAPI {
    try {
        Write-Host "🔍 Testando API..." -ForegroundColor Cyan
        $result = Invoke-RestMethod -Uri "$API_BASE/ping" -Method GET -Headers $headers
        Write-Host "✅ API OK: $($result.message)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ API indisponível: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para iniciar sessão
function Start-WhatsAppClient {
    param([string]$SessionId)
    
    Write-Host "🚀 Iniciando cliente: $SessionId" -ForegroundColor Cyan
    
    try {
        $result = Invoke-RestMethod -Uri "$API_BASE/session/start/$SessionId" -Method GET -Headers $headers
        Write-Host "✅ Cliente iniciado: $($result.message)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para obter QR Code
function Get-WhatsAppQR {
    param([string]$SessionId)
    
    Write-Host "📱 Obtendo QR Code para: $SessionId" -ForegroundColor Cyan
    
    try {
        $result = Invoke-RestMethod -Uri "$API_BASE/session/qr/$SessionId" -Method GET -Headers $headers -TimeoutSec 30
        Write-Host "✅ QR Code obtido!" -ForegroundColor Green
        
        # Salvar em arquivo
        $qrFile = "qr_$SessionId.txt"
        $result.qr | Out-File -FilePath $qrFile -Encoding UTF8
        Write-Host "💾 QR salvo em: $qrFile" -ForegroundColor Blue
        
        Write-Host "QR Code:" -ForegroundColor Yellow
        Write-Host $result.qr -ForegroundColor White
        
        return $result.qr
    }
    catch {
        Write-Host "❌ Erro ao obter QR: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para verificar status
function Get-WhatsAppClientStatus {
    param([string]$SessionId)
    
    Write-Host "📊 Status do cliente: $SessionId" -ForegroundColor Cyan
    
    try {
        $result = Invoke-RestMethod -Uri "$API_BASE/session/status/$SessionId" -Method GET -Headers $headers -TimeoutSec 30
        
        $status = $result.state
        $message = $result.message
        
        if ($status -eq "CONNECTED") {
            Write-Host "✅ CONECTADO: $message" -ForegroundColor Green
        }
        elseif ($status -eq "STARTING") {
            Write-Host "🔄 INICIANDO: $message" -ForegroundColor Yellow
        }
        else {
            Write-Host "⚠️  STATUS: $status - $message" -ForegroundColor Yellow
        }
        
        return $result
    }
    catch {
        Write-Host "❌ Erro ao verificar status: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função completa para conectar cliente
function Connect-WhatsAppClient {
    param([string]$SessionId)
    
    Write-Host ""
    Write-Host "🔧 CONECTANDO CLIENTE: $SessionId" -ForegroundColor Magenta
    Write-Host "=================================" -ForegroundColor Magenta
    
    # Passo 1: Testar API
    if (-not (Test-WhatsAppAPI)) {
        return $false
    }
    
    # Passo 2: Iniciar cliente
    if (-not (Start-WhatsAppClient -SessionId $SessionId)) {
        return $false
    }
    
    Start-Sleep -Seconds 3
    
    # Passo 3: Obter QR Code
    Write-Host ""
    $qr = Get-WhatsAppQR -SessionId $SessionId
    if (-not $qr) {
        return $false
    }
    
    # Instruções
    Write-Host ""
    Write-Host "📋 INSTRUÇÕES:" -ForegroundColor Yellow
    Write-Host "1. Abra WhatsApp no celular" -ForegroundColor White
    Write-Host "2. Vá em: Configurações > Aparelhos conectados" -ForegroundColor White
    Write-Host "3. Toque em: Conectar um aparelho" -ForegroundColor White
    Write-Host "4. Escaneie o QR Code acima" -ForegroundColor White
    Write-Host ""
    
    # Aguardar conexão
    Write-Host "⏳ Aguardando conexão..." -ForegroundColor Yellow
    Write-Host "   Use: Get-WhatsAppClientStatus -SessionId '$SessionId' para verificar"
    Write-Host ""
    
    return $true
}

# Função para enviar mensagem
function Send-WhatsAppMessage {
    param(
        [string]$SessionId,
        [string]$Phone,
        [string]$Message
    )
    
    Write-Host "💬 Enviando mensagem..." -ForegroundColor Cyan
    
    try {
        $body = @{
            chatId = "$Phone@c.us"
            text = $Message
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$API_BASE/client/sendMessage/$SessionId" -Method POST -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "✅ Mensagem enviada!" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Host "❌ Erro ao enviar: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Mostrar comandos disponíveis
function Show-WhatsAppCommands {
    Write-Host ""
    Write-Host "🛠️  COMANDOS DISPONÍVEIS:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host "Test-WhatsAppAPI                           # Testa conectividade"
    Write-Host "Connect-WhatsAppClient -SessionId 'nome'   # Conecta cliente completo"
    Write-Host "Start-WhatsAppClient -SessionId 'nome'     # Inicia sessão"
    Write-Host "Get-WhatsAppQR -SessionId 'nome'           # Obtém QR Code"
    Write-Host "Get-WhatsAppClientStatus -SessionId 'nome' # Verifica status"
    Write-Host "Send-WhatsAppMessage -SessionId 'nome' -Phone '5511999999999' -Message 'Olá'"
    Write-Host ""
    Write-Host "📋 EXEMPLO:" -ForegroundColor Yellow
    Write-Host "Connect-WhatsAppClient -SessionId 'cliente01'" -ForegroundColor White
    Write-Host ""
}

# Executar ao carregar
Show-WhatsAppCommands
Write-Host "✅ Script carregado! API: $API_BASE" -ForegroundColor Green
