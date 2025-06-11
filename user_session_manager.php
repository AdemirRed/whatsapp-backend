<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

class WhatsAppSessionManager {
    private $apiBaseUrl;
    private $usersFile;
    
    public function __construct($apiBaseUrl = 'http://192.168.0.200:200') {
        $this->apiBaseUrl = rtrim($apiBaseUrl, '/');
        $this->usersFile = __DIR__ . '/users.json';
        $this->initUsersFile();
    }
    
    private function initUsersFile() {
        if (!file_exists($this->usersFile)) {
            file_put_contents($this->usersFile, json_encode([]));
        }
    }
    
    // Gerenciamento de usuários
    public function createUser($username, $sessionId) {
        $users = $this->getUsers();
        
        if (!$users['success']) {
            return $users;
        }
        
        // Verificar se usuário já existe
        foreach ($users['users'] as $user) {
            if ($user['username'] === $username || $user['sessionId'] === $sessionId) {
                return ['success' => false, 'message' => 'Usuário ou sessão já existe'];
            }
        }
        
        // Criar a sessão no servidor
        $startSessionResponse = $this->startSession($sessionId);
        if (!$startSessionResponse['success']) {
            return ['success' => false, 'message' => 'Erro ao iniciar a sessão: ' . $startSessionResponse['message']];
        }
        
        $newUser = [
            'id' => uniqid(),
            'username' => $username,
            'sessionId' => $sessionId,
            'created' => date('Y-m-d H:i:s'),
            'status' => 'starting'
        ];
        
        $users['users'][] = $newUser;
        file_put_contents($this->usersFile, json_encode($users['users'], JSON_PRETTY_PRINT));
        
        return ['success' => true, 'user' => $newUser];
    }
    
    public function getUsers() {
        if (!file_exists($this->usersFile)) {
            return ['success' => false, 'message' => 'Arquivo de usuários não encontrado'];
        }

        $users = json_decode(file_get_contents($this->usersFile), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['success' => false, 'message' => 'Erro ao decodificar JSON de usuários'];
        }

        return ['success' => true, 'users' => $users ?: []];
    }
    
    public function deleteUser($userId) {
        $users = $this->getUsers();
        
        if (!$users['success']) {
            return $users;
        }
        
        $users['users'] = array_filter($users['users'], function($user) use ($userId) {
            return $user['id'] !== $userId;
        });
        
        file_put_contents($this->usersFile, json_encode(array_values($users['users']), JSON_PRETTY_PRINT));
        return ['success' => true];
    }
    
    // Métodos de sessão
    public function startSession($sessionId) {
        $url = "{$this->apiBaseUrl}/session/start/{$sessionId}";
        $response = $this->makeRequest($url);
        $this->updateUserStatus($sessionId, 'starting');
        return $response;
    }
    
    public function getSessionStatus($sessionId) {
        $url = "{$this->apiBaseUrl}/session/status/{$sessionId}";
        $response = $this->makeRequest($url);
        if ($response && isset($response['status'])) {
            $this->updateUserStatus($sessionId, $response['status']);
        }
        return $response;
    }
    
    public function getSessionQr($sessionId) {
        $url = "{$this->apiBaseUrl}/session/qr/{$sessionId}";
        return $this->makeRequest($url);
    }
    
    public function getSessionQrImage($sessionId) {
        $url = "{$this->apiBaseUrl}/session/qr/{$sessionId}/image";
        return $this->makeRequest($url, false);
    }
    
    public function terminateSession($sessionId) {
        $url = "{$this->apiBaseUrl}/session/terminate/{$sessionId}";
        $response = $this->makeRequest($url);
        $this->updateUserStatus($sessionId, 'terminated');
        return $response;
    }
    
    public function terminateInactiveSessions() {
        $url = "{$this->apiBaseUrl}/session/terminateInactive";
        return $this->makeRequest($url);
    }
    
    public function terminateAllSessions() {
        $url = "{$this->apiBaseUrl}/session/terminateAll";
        $response = $this->makeRequest($url);
        $this->updateAllUsersStatus('terminated');
        return $response;
    }
    
    private function makeRequest($url, $decodeJson = true) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'x-api-key: redblack'
        ]);
    
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    
        if ($response === false) {
            return ['success' => false, 'message' => 'Erro na conexão com a API'];
        }
    
        return $decodeJson ? json_decode($response, true) : $response;
    }
    
    private function updateUserStatus($sessionId, $status) {
        $users = $this->getUsers();
        
        if (!$users['success']) {
            return;
        }
        
        foreach ($users['users'] as &$user) {
            if ($user['sessionId'] === $sessionId) {
                $user['status'] = $status;
                $user['lastUpdate'] = date('Y-m-d H:i:s');
                break;
            }
        }
        file_put_contents($this->usersFile, json_encode($users['users'], JSON_PRETTY_PRINT));
    }
    
    private function updateAllUsersStatus($status) {
        $users = $this->getUsers();
        
        if (!$users['success']) {
            return;
        }
        
        foreach ($users['users'] as &$user) {
            $user['status'] = $status;
            $user['lastUpdate'] = date('Y-m-d H:i:s');
        }
        file_put_contents($this->usersFile, json_encode($users['users'], JSON_PRETTY_PRINT));
    }
}

// Processar requisições
$manager = new WhatsAppSessionManager();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'create_user':
            echo json_encode($manager->createUser($input['username'], $input['sessionId']));
            break;
            
        case 'start_session':
            echo json_encode($manager->startSession($input['sessionId']));
            break;
            
        case 'terminate_session':
            echo json_encode($manager->terminateSession($input['sessionId']));
            break;
            
        case 'delete_user':
            echo json_encode($manager->deleteUser($input['userId']));
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Ação inválida']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    $sessionId = $_GET['sessionId'] ?? '';
    
    switch ($action) {
        case 'get_users':
            echo json_encode($manager->getUsers());
            break;
            
        case 'session_status':
            echo json_encode($manager->getSessionStatus($sessionId));
            break;
            
        case 'session_qr':
            echo json_encode($manager->getSessionQr($sessionId));
            break;
            
        case 'session_qr_image':
            header('Content-Type: image/png');
            echo $manager->getSessionQrImage($sessionId);
            break;
            
        case 'terminate_inactive':
            echo json_encode($manager->terminateInactiveSessions());
            break;
            
        case 'terminate_all':
            echo json_encode($manager->terminateAllSessions());
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Ação inválida']);
    }
}
?>
