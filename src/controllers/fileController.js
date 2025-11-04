const { sendErrorResponse } = require('../utils')

/**
 * Serve HTML page for file to base64 conversion.
 *
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {void}
 */
const fileToBase64Page = (req, res) => {
  // #swagger.ignore = true
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversor de Arquivo para Base64 - WhatsApp API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9ff;
            position: relative;
        }
        .upload-area:hover {
            border-color: #764ba2;
            background: #f0f2ff;
        }
        .upload-area.dragover {
            border-color: #764ba2;
            background: #e8ebff;
            transform: scale(1.02);
        }
        .upload-icon {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .upload-text {
            color: #667eea;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .upload-btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            margin: 15px 0;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            font-size: 16px;
        }
        .upload-btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .upload-hint {
            color: #999;
            font-size: 14px;
            margin-top: 10px;
        }
        input[type="file"] {
            display: none;
        }
        .file-info {
            display: none;
            margin-top: 20px;
            padding: 20px;
            background: #f8f9ff;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .file-info.show {
            display: block;
        }
        .file-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
            word-break: break-all;
        }
        .file-details {
            color: #666;
            font-size: 14px;
        }
        .result-area {
            display: none;
            margin-top: 20px;
        }
        .result-area.show {
            display: block;
        }
        .result-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .result-box {
            background: #f8f9ff;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            max-height: 200px;
            overflow-y: auto;
            word-break: break-all;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #333;
            margin-bottom: 10px;
        }
        .button-group {
            display: flex;
            gap: 10px;
        }
        .copy-btn, .new-btn {
            flex: 1;
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .copy-btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .new-btn {
            background: #6c757d;
        }
        .new-btn:hover {
            background: #5a6268;
        }
        .copy-btn:active, .new-btn:active {
            transform: translateY(0);
        }
        .copy-btn.copied {
            background: #25D366;
        }
        .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
        .loading.show {
            display: block;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            display: none;
            margin-top: 20px;
            padding: 15px;
            background: #fee;
            border-left: 4px solid #f44;
            border-radius: 8px;
            color: #c33;
        }
        .error.show {
            display: block;
        }
        .file-types {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        .file-type {
            background: #f8f9ff;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 13px;
            color: #667eea;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Conversor Universal para Base64</h1>
        <p class="subtitle">Selecione qualquer arquivo para converter em formato Base64</p>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📤</div>
            <div class="upload-text">Arraste o arquivo aqui ou</div>
            <button class="upload-btn" id="selectBtn">
                <span>📂 Select from device</span>
            </button>
            <div class="upload-hint">Arraste e solte ou clique no botão acima</div>
            <input type="file" id="fileInput" accept="*/*">
        </div>

        <div class="file-types">
            <span class="file-type">🎵 Áudio</span>
            <span class="file-type">🖼️ Imagem</span>
            <span class="file-type">🎬 Vídeo</span>
            <span class="file-type">📄 Documento</span>
            <span class="file-type">📦 Qualquer arquivo</span>
        </div>

        <div class="file-info" id="fileInfo">
            <div class="file-name" id="fileName"></div>
            <div class="file-details" id="fileDetails"></div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>Convertendo arquivo...</div>
        </div>

        <div class="error" id="error"></div>

        <div class="result-area" id="resultArea">
            <div class="result-label">
                <span>🎯 Base64 (Data URI):</span>
            </div>
            <div class="result-box" id="resultBox"></div>
            <div class="button-group">
                <button class="copy-btn" id="copyBtn">📋 Copiar Base64</button>
                <button class="new-btn" id="newBtn">🔄 Novo Arquivo</button>
            </div>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const selectBtn = document.getElementById('selectBtn');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileDetails = document.getElementById('fileDetails');
        const loading = document.getElementById('loading');
        const resultArea = document.getElementById('resultArea');
        const resultBox = document.getElementById('resultBox');
        const copyBtn = document.getElementById('copyBtn');
        const newBtn = document.getElementById('newBtn');
        const errorDiv = document.getElementById('error');

        // Click to select file
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        uploadArea.addEventListener('click', (e) => {
            if (e.target !== selectBtn) {
                fileInput.click();
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Handle file
        function handleFile(file) {
            // Reset
            errorDiv.classList.remove('show');
            resultArea.classList.remove('show');
            
            // Show file info
            fileName.textContent = '📎 ' + file.name;
            fileDetails.textContent = \`Tipo: \${file.type || 'desconhecido'} | Tamanho: \${formatBytes(file.size)}\`;
            fileInfo.classList.add('show');

            // Show loading
            loading.classList.add('show');

            // Convert to base64
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                
                // Hide loading
                loading.classList.remove('show');
                
                // Show result
                resultBox.textContent = base64;
                resultArea.classList.add('show');
            };
            reader.onerror = function() {
                loading.classList.remove('show');
                errorDiv.textContent = '❌ Erro ao ler o arquivo. Tente novamente.';
                errorDiv.classList.add('show');
            };
            reader.readAsDataURL(file);
        }

        // Copy to clipboard
        copyBtn.addEventListener('click', () => {
            const text = resultBox.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copiado!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(() => {
                errorDiv.textContent = '❌ Erro ao copiar. Selecione e copie manualmente.';
                errorDiv.classList.add('show');
            });
        });

        // New file button
        newBtn.addEventListener('click', () => {
            fileInput.value = '';
            fileInfo.classList.remove('show');
            resultArea.classList.remove('show');
            errorDiv.classList.remove('show');
        });

        // Format bytes
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
    </script>
</body>
</html>
  `;
  
  res.send(html);
}

/**
 * Convert uploaded file to base64
 * @async
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 */
const convertFileToBase64 = async (req, res) => {
  // #swagger.tags = ['File']
  // #swagger.summary = 'Convert uploaded file to Base64'
  // #swagger.description = 'Upload a file and receive it converted to Base64 format with metadata'
  /* #swagger.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              file: {
                type: "string",
                format: "binary",
                description: "File to convert to Base64"
              }
            },
            required: ["file"]
          }
        }
      }
  } */
  /* #swagger.responses[200] = {
      description: "File converted successfully",
      content: {
        "application/json": {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  filename: { type: 'string', example: 'document.pdf' },
                  mimetype: { type: 'string', example: 'application/pdf' },
                  size: { type: 'number', example: 123456 },
                  base64: { type: 'string', example: 'data:application/pdf;base64,JVBERi0xLjQK...' },
                  dataUri: { type: 'string', example: 'data:application/pdf;base64,JVBERi0xLjQK...' }
                }
              },
              message: { type: 'string', example: 'File converted to Base64 successfully' }
            }
          }
        }
      }
  } */
  /* #swagger.responses[400] = {
      description: "Bad Request - No file uploaded",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
  } */
  /* #swagger.responses[413] = {
      description: "File too large",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
  } */
  try {
    if (!req.file) {
      return sendErrorResponse(res, 400, 'No file uploaded. Please upload a file.')
    }

    const file = req.file
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return sendErrorResponse(res, 413, 'File too large. Maximum size is 10MB.')
    }

    // Convert to base64
    const base64Data = file.buffer.toString('base64')
    const dataUri = `data:${file.mimetype};base64,${base64Data}`

    const result = {
      success: true,
      data: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        base64: base64Data,
        dataUri: dataUri,
        sizeFormatted: formatBytes(file.size)
      },
      message: 'File converted to Base64 successfully'
    }

    res.json(result)
  } catch (error) {
    /* #swagger.responses[500] = {
        description: "Server error",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
    } */
    console.log('convertFileToBase64 ERROR', error)
    sendErrorResponse(res, 500, `Error converting file: ${error.message}`)
  }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

module.exports = {
  fileToBase64Page,
  convertFileToBase64
}
