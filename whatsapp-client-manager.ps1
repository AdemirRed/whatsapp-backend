# Script PowerShell para Gerenciar Clientes WhatsApp
# Salve como: whatsapp-client-manager.ps1

# Configurações
$API_BASE = "https://whatsapp-backend-1-0eqq.onrender.com"
$API_KEY = "154466"
$headers = @{ "x-api-key" = $API_KEY }

# Função para fazer requisições com retry
function Invoke-WhatsAppAPI {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [int]$MaxRetries = 3
    )
    
    $uri = "$API_BASE$Endpoint"
    $attempt = 1
    
    while ($attempt -le $MaxRetries) {
        try {
            Write-Host "Tentativa $attempt para $Endpoint..." -ForegroundColor Yellow
            $result = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -TimeoutSec 30
            Write-Host "✅ Sucesso!" -ForegroundColor Green
            return $result
        }
        catch {
            Write-Host "❌ Erro na tentativa $attempt`: $($_.Exception.Message)" -ForegroundColor Red
            if ($attempt -eq $MaxRetries) {
                throw
            }
            Start-Sleep -Seconds 2
            $attempt++
        }
    }
}

# Função para testar conectividade
function Test-API {
    Write-Host "🔍 Testando conectividade com a API..." -ForegroundColor Cyan
    try {
        $result = Invoke-WhatsAppAPI -Endpoint "/ping"
        Write-Host "✅ API funcionando: $($result.message)" -ForegroundColor Green
        
        # Tentar obter informações de sistema se disponível
        try {
            $systemInfo = Invoke-WhatsAppAPI -Endpoint "/health"
            if ($systemInfo) {
                Write-Host "📊 Info do sistema obtida" -ForegroundColor Blue
                # Mostrar informações sobre sessões se disponível
                if ($systemInfo.sessionsPath) {
                    Write-Host "💾 Diretório de sessões: $($systemInfo.sessionsPath)" -ForegroundColor Blue
                }
                if ($systemInfo.diskInfo) {
                    Write-Host "🗄️ Info do disco: $($systemInfo.diskInfo)" -ForegroundColor Blue
                }
            }
        } catch {
            # Não é crítico se falhar
        }
        
        return $true
    }
    catch {
        Write-Host "❌ API não está respondendo" -ForegroundColor Red
        return $false
    }
}

# Função para verificar status do sistema e disco
function Get-SystemStatus {
    Write-Host "🔍 Verificando status do sistema..." -ForegroundColor Cyan
    try {
        $result = Invoke-WhatsAppAPI -Endpoint "/health"
        if ($result) {
            Write-Host "✅ Status do sistema:" -ForegroundColor Green
            $result.PSObject.Properties | ForEach-Object {
                Write-Host "   $($_.Name): $($_.Value)" -ForegroundColor White
            }
        }
        return $result
    }
    catch {
        Write-Host "❌ Erro ao obter status do sistema: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para iniciar uma sessão
function Start-WhatsAppSession {
    param([string]$SessionId)
    
    Write-Host "🚀 Iniciando sessão: $SessionId" -ForegroundColor Cyan
    try {
        $result = Invoke-WhatsAppAPI -Endpoint "/session/start/$SessionId"
        Write-Host "✅ Sessão iniciada: $($result.message)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Erro ao iniciar sessão: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para obter QR Code
function Get-WhatsAppQR {
    param([string]$SessionId)
    
    Write-Host "📱 Obtendo QR Code para: $SessionId" -ForegroundColor Cyan
    try {
        $result = Invoke-WhatsAppAPI -Endpoint "/session/qr/$SessionId"
        Write-Host "✅ QR Code obtido!" -ForegroundColor Green
        Write-Host "QR Code: $($result.qr)" -ForegroundColor White
        
        # Salvar QR em arquivo para facilitar
        $qrFile = "qr_$SessionId.txt"
        $result.qr | Out-File -FilePath $qrFile -Encoding UTF8
        Write-Host "💾 QR Code salvo em: $qrFile" -ForegroundColor Blue
        
        return $result.qr
    }
    catch {
        Write-Host "❌ Erro ao obter QR: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para verificar status da sessão
function Get-WhatsAppStatus {
    param([string]$SessionId)
    
    Write-Host "📊 Verificando status da sessão: $SessionId" -ForegroundColor Cyan
    try {
        $result = Invoke-WhatsAppAPI -Endpoint "/session/status/$SessionId"
        Write-Host "✅ Status: $($result.state) - $($result.message)" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Host "❌ Erro ao verificar status: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para enviar mensagem (se a sessão estiver conectada)
function Send-WhatsAppMessage {
    param(
        [string]$SessionId,
        [string]$PhoneNumber,
        [string]$Message
    )
    
    Write-Host "💬 Enviando mensagem via $SessionId para $PhoneNumber" -ForegroundColor Cyan
    try {
        $body = @{
            chatId = "$PhoneNumber@c.us"
            text = $Message
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$API_BASE/client/sendMessage/$SessionId" -Method POST -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "✅ Mensagem enviada!" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Host "❌ Erro ao enviar mensagem: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para processo completo de conectar cliente
function Connect-WhatsAppClient {
    param([string]$SessionId)
    
    Write-Host "🔧 Processo completo para conectar cliente: $SessionId" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta
    
    # 1. Testar API
    if (-not (Test-API)) {
        return
    }
    
    # 2. Iniciar sessão
    if (-not (Start-WhatsAppSession -SessionId $SessionId)) {
        return
    }
    
    Start-Sleep -Seconds 3
    
    # 3. Obter QR Code
    $qr = Get-WhatsAppQR -SessionId $SessionId
    if (-not $qr) {
        return
    }
    
    Write-Host ""
    Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "1. Abra o WhatsApp no seu celular" -ForegroundColor White
    Write-Host "2. Vá em Configurações > Aparelhos conectados > Conectar um aparelho" -ForegroundColor White
    Write-Host "3. Escaneie o QR code acima" -ForegroundColor White
    Write-Host "4. Aguarde a conexão ser estabelecida" -ForegroundColor White
    Write-Host ""
    
    # 4. Aguardar conexão
    Write-Host "⏳ Aguardando conexão (máximo 2 minutos)..." -ForegroundColor Yellow
    $timeout = 120 # 2 minutos
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        
        $status = Get-WhatsAppStatus -SessionId $SessionId
        if ($status -and $status.state -eq "CONNECTED") {
            Write-Host "🎉 CLIENTE CONECTADO COM SUCESSO!" -ForegroundColor Green
            Write-Host "Sessão $SessionId está pronta para uso!" -ForegroundColor Green
            return $true
        }
        
        Write-Host "Aguardando... ($elapsed/$timeout segundos)" -ForegroundColor Gray
    }
    
    Write-Host "⏰ Timeout - Cliente não conectou no tempo esperado" -ForegroundColor Red
    Write-Host "Tente verificar o status manualmente com: Get-WhatsAppStatus -SessionId $SessionId" -ForegroundColor Yellow
    return $false
}

# Função para listar comandos disponíveis
function Show-Commands {
    Write-Host "🛠️  COMANDOS DISPONÍVEIS:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host "Test-API                                    # Testa conectividade"
    Write-Host "Connect-WhatsAppClient -SessionId 'nome'    # Processo completo"
    Write-Host "Start-WhatsAppSession -SessionId 'nome'     # Inicia sessão"
    Write-Host "Get-WhatsAppQR -SessionId 'nome'            # Obtém QR Code"
    Write-Host "Get-WhatsAppStatus -SessionId 'nome'        # Verifica status"
    Write-Host "Send-WhatsAppMessage -SessionId 'nome' -PhoneNumber '5511999999999' -Message 'Olá'"
    Write-Host ""
    Write-Host "📋 EXEMPLO DE USO:" -ForegroundColor Yellow
    Write-Host "Connect-WhatsAppClient -SessionId 'cliente01'" -ForegroundColor White
    Write-Host ""
}

# Mostrar comandos ao carregar o script
Show-Commands

Write-Host "✅ Script carregado! Use os comandos acima para gerenciar clientes WhatsApp." -ForegroundColor Green
