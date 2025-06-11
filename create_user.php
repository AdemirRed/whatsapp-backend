<?php
$message = null;
$qrData = null;
$sessionStatus = null;
$terminateResult = null;

// Função para fazer requisições à API
function makeApiRequest($url, $method = 'GET') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-api-key: redblack']);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['response' => $response, 'code' => $httpCode];
}

// Processar requisições POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $sessionId = $_POST['sessionId'] ?? '';

    if (empty($sessionId)) {
        $message = ['type' => 'error', 'text' => 'Por favor, preencha o campo ID da Sessão.'];
    } else {
        switch ($action) {
            case 'start':
                $url = "http://192.168.0.200:200/session/start/{$sessionId}";
                $result = makeApiRequest($url);
                $message = $result['code'] === 200 
                    ? ['type' => 'success', 'text' => 'Sessão iniciada com sucesso!']
                    : ['type' => 'error', 'text' => 'Erro ao iniciar a sessão.'];
                break;
                
            case 'terminate':
                $url = "http://192.168.0.200:200/session/terminate/{$sessionId}";
                $result = makeApiRequest($url);
                $terminateResult = $result['code'] === 200 
                    ? ['type' => 'success', 'text' => 'Sessão terminada com sucesso!']
                    : ['type' => 'error', 'text' => 'Erro ao terminar a sessão.'];
                break;
                
            case 'terminateInactive':
                $url = "http://192.168.0.200:200/session/terminateInactive";
                $result = makeApiRequest($url);
                $terminateResult = $result['code'] === 200 
                    ? ['type' => 'success', 'text' => 'Sessões inativas terminadas com sucesso!']
                    : ['type' => 'error', 'text' => 'Erro ao terminar sessões inativas.'];
                break;
                
            case 'terminateAll':
                $url = "http://192.168.0.200:200/session/terminateAll";
                $result = makeApiRequest($url);
                $terminateResult = $result['code'] === 200 
                    ? ['type' => 'success', 'text' => 'Todas as sessões foram terminadas!']
                    : ['type' => 'error', 'text' => 'Erro ao terminar todas as sessões.'];
                break;
        }
    }
}

// Processar requisições GET
if (isset($_GET['action']) && !empty($_GET['sessionId'])) {
    $sessionId = $_GET['sessionId'];
    $action = $_GET['action'];
    
    switch ($action) {
        case 'status':
            $url = "http://192.168.0.200:200/session/status/{$sessionId}";
            $result = makeApiRequest($url);
            if ($result['code'] === 200) {
                $sessionStatus = json_decode($result['response'], true);
            } else {
                $message = ['type' => 'error', 'text' => 'Erro ao obter status da sessão.'];
            }
            break;
            
        case 'qr':
            $url = "http://192.168.0.200:200/session/qr/{$sessionId}";
            $result = makeApiRequest($url);
            if ($result['code'] === 200) {
                $responseData = json_decode($result['response'], true);
                if ($responseData['success'] && isset($responseData['qr'])) {
                    $qrData = $responseData['qr'];
                } else {
                    $message = ['type' => 'error', 'text' => 'Erro ao obter o QR Code.'];
                }
            } else {
                $message = ['type' => 'error', 'text' => 'Erro ao se conectar ao servidor para o QR Code.'];
            }
            break;
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp API Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px 0;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(45deg, #25d366, #128c7e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }

        .header p {
            color: #b0b0b0;
            font-size: 1.1rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 30px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #25d366, #128c7e);
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(37, 211, 102, 0.1);
            border-color: rgba(37, 211, 102, 0.3);
        }

        .card h2 {
            color: #ffffff;
            margin-bottom: 20px;
            font-size: 1.4rem;
            font-weight: 600;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #e0e0e0;
        }

        input[type="text"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            color: #ffffff;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        input[type="text"]:focus {
            outline: none;
            border-color: #25d366;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
        }

        input[type="text"]::placeholder {
            color: #888;
        }

        .btn {
            background: linear-gradient(45deg, #25d366, #128c7e);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 10px;
            margin-bottom: 10px;
            display: inline-block;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
        }

        .btn.btn-danger {
            background: linear-gradient(45deg, #e74c3c, #c0392b);
        }

        .btn.btn-danger:hover {
            box-shadow: 0 8px 20px rgba(231, 76, 60, 0.3);
        }

        .btn.btn-info {
            background: linear-gradient(45deg, #3498db, #2980b9);
        }

        .btn.btn-info:hover {
            box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
        }

        .btn.btn-warning {
            background: linear-gradient(45deg, #f39c12, #e67e22);
        }

        .btn.btn-warning:hover {
            box-shadow: 0 8px 20px rgba(243, 156, 18, 0.3);
        }

        .message {
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 500;
            border-left: 4px solid;
        }

        .message.success {
            background: rgba(46, 204, 113, 0.1);
            color: #2ecc71;
            border-left-color: #2ecc71;
        }

        .message.error {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border-left-color: #e74c3c;
        }

        .qr-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .qr-code {
            max-width: 256px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .status-info {
            background: rgba(52, 152, 219, 0.1);
            border: 1px solid rgba(52, 152, 219, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }

        .status-info h3 {
            color: #3498db;
            margin-bottom: 15px;
        }

        .status-info pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            color: #e0e0e0;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }

        .wide-card {
            grid-column: 1 / -1;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .card {
                padding: 20px;
            }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WhatsApp API Manager</h1>
            <p>Gerencie suas sessões do WhatsApp de forma profissional</p>
        </div>

        <?php if (!empty($message)): ?>
            <div class="message <?= $message['type'] ?>">
                <?= htmlspecialchars($message['text']) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($terminateResult)): ?>
            <div class="message <?= $terminateResult['type'] ?>">
                <?= htmlspecialchars($terminateResult['text']) ?>
            </div>
        <?php endif; ?>

        <div class="grid">
            <!-- Iniciar Sessão -->
            <div class="card">
                <h2>🚀 Iniciar Sessão</h2>
                <form method="POST">
                    <input type="hidden" name="action" value="start">
                    <div class="form-group">
                        <label for="sessionId">ID da Sessão:</label>
                        <input type="text" id="sessionId" name="sessionId" placeholder="Digite o ID da sessão" required>
                    </div>
                    <button type="submit" class="btn">Iniciar Sessão</button>
                </form>
            </div>

            <!-- Status da Sessão -->
            <div class="card">
                <h2>📊 Status da Sessão</h2>
                <form method="GET">
                    <input type="hidden" name="action" value="status">
                    <div class="form-group">
                        <label for="statusSessionId">ID da Sessão:</label>
                        <input type="text" id="statusSessionId" name="sessionId" placeholder="Digite o ID da sessão" required>
                    </div>
                    <button type="submit" class="btn btn-info">Verificar Status</button>
                </form>
            </div>

            <!-- Gerar QR Code -->
            <div class="card">
                <h2>📱 Gerar QR Code</h2>
                <form method="GET">
                    <input type="hidden" name="action" value="qr">
                    <div class="form-group">
                        <label for="qrSessionId">ID da Sessão:</label>
                        <input type="text" id="qrSessionId" name="sessionId" placeholder="Digite o ID da sessão" required>
                    </div>
                    <button type="submit" class="btn">Gerar QR Code</button>
                </form>
            </div>

            <!-- Terminar Sessão -->
            <div class="card">
                <h2>🛑 Terminar Sessão</h2>
                <form method="POST">
                    <input type="hidden" name="action" value="terminate">
                    <div class="form-group">
                        <label for="terminateSessionId">ID da Sessão:</label>
                        <input type="text" id="terminateSessionId" name="sessionId" placeholder="Digite o ID da sessão" required>
                    </div>
                    <button type="submit" class="btn btn-danger">Terminar Sessão</button>
                </form>
            </div>

            <!-- Ações Globais -->
            <div class="card wide-card">
                <h2>⚡ Ações Globais</h2>
                <p style="color: #b0b0b0; margin-bottom: 20px;">Gerencie todas as sessões de uma vez</p>
                <div class="button-group">
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="terminateInactive">
                        <input type="hidden" name="sessionId" value="global">
                        <button type="submit" class="btn btn-warning">Terminar Sessões Inativas</button>
                    </form>
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="terminateAll">
                        <input type="hidden" name="sessionId" value="global">
                        <button type="submit" class="btn btn-danger" onclick="return confirm('Tem certeza que deseja terminar TODAS as sessões?')">Terminar Todas as Sessões</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Exibir Status -->
        <?php if (isset($sessionStatus) && $sessionStatus): ?>
            <div class="card">
                <div class="status-info">
                    <h3>📈 Status da Sessão</h3>
                    <pre><?= json_encode($sessionStatus, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?></pre>
                </div>
            </div>
        <?php endif; ?>

        <!-- Exibir QR Code -->
        <?php if (isset($qrData) && $qrData): ?>
            <div class="card">
                <h2>📱 QR Code Gerado</h2>
                <div class="qr-container">
                    <canvas id="qrcode"></canvas>
                    <p style="margin-top: 15px; color: #b0b0b0;">Escaneie o código QR com seu WhatsApp</p>
                </div>
                <script>
                    // Geração inicial do QR Code
                    const qrValue = <?= json_encode($qrData) ?>;
                    if (typeof qrValue === 'string' && qrValue.trim()) {
                        QRCode.toCanvas(document.getElementById('qrcode'), qrValue, {
                            width: 256,
                            margin: 2,
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            }
                        }, function (error) {
                            if (error) console.error(error);
                        });
                    } else {
                        console.error("Invalid data for QR Code", qrValue);
                    }

                    // Atualizar o QR Code a cada 30 segundos
                    const sessionId = <?= json_encode($_GET['sessionId'] ?? '') ?>;
                    if (sessionId) {
                        const qrEndpoint = "http://192.168.0.200:200/session/qr/" + sessionId;
                        setInterval(function(){
                            fetch(qrEndpoint, {
                                method: 'GET',
                                headers: { 'x-api-key': 'redblack' }
                            })
                            .then(response => response.json())
                            .then(data => {
                                if(data.success && data.qr) {
                                    QRCode.toCanvas(document.getElementById('qrcode'), data.qr, {
                                        width: 256,
                                        margin: 2,
                                        color: {
                                            dark: '#000000',
                                            light: '#FFFFFF'
                                        }
                                    }, function(error) {
                                        if (error) console.error(error);
                                    });
                                }
                            })
                            .catch(error => console.error('Erro na requisição:', error));
                        }, 30000);
                    }
                </script>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>