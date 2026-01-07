const { sendErrorResponse } = require('../utils')
const sharp = require('sharp')

/**
 * Serve HTML page for image/video to sticker conversion.
 *
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {void}
 */
const createStickerPage = (req, res) => {
  // #swagger.ignore = true
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criador de Stickers - WhatsApp API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
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
            max-width: 700px;
            width: 100%;
        }
        h1 {
            color: #128C7E;
            margin-bottom: 10px;
            font-size: 28px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .upload-area {
            border: 3px dashed #25D366;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f0f9f5;
        }
        .upload-area:hover {
            border-color: #128C7E;
            background: #e6f5ed;
        }
        .upload-area.dragover {
            border-color: #128C7E;
            background: #d9f2e6;
            transform: scale(1.02);
        }
        .upload-icon {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .upload-text {
            color: #25D366;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .upload-hint {
            color: #999;
            font-size: 14px;
        }
        input[type="file"] {
            display: none;
        }
        .preview-area {
            display: none;
            margin-top: 30px;
        }
        .preview-area.show {
            display: block;
        }
        .preview-box {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .preview-item {
            flex: 1;
            min-width: 200px;
        }
        .preview-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        .preview-img {
            width: 100%;
            max-width: 300px;
            border-radius: 10px;
            border: 2px solid #e0e0e0;
            display: block;
            margin: 0 auto;
        }
        .sticker-options {
            background: #f0f9f5;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .option-group {
            margin-bottom: 15px;
        }
        .option-label {
            display: block;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .option-input {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        .option-input:focus {
            outline: none;
            border-color: #25D366;
        }
        .size-selector {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .size-btn {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
        }
        .size-btn.active {
            border-color: #25D366;
            background: #25D366;
            color: white;
        }
        .size-btn:hover {
            border-color: #25D366;
        }
        .generate-btn {
            width: 100%;
            background: #25D366;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 20px;
            transition: all 0.3s ease;
        }
        .generate-btn:hover {
            background: #128C7E;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(37, 211, 102, 0.4);
        }
        .generate-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .result-area {
            display: none;
            margin-top: 30px;
            padding: 20px;
            background: #f0f9f5;
            border-radius: 10px;
            border-left: 4px solid #25D366;
        }
        .result-area.show {
            display: block;
        }
        .result-label {
            font-weight: 600;
            color: #128C7E;
            margin-bottom: 10px;
        }
        .result-box {
            background: white;
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
        .copy-btn {
            background: #128C7E;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            width: 100%;
        }
        .copy-btn:hover {
            background: #0d6b5f;
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
            border-top: 3px solid #25D366;
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
        .info-box {
            background: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-top: 20px;
            border-radius: 8px;
        }
        .info-box strong {
            color: #f57c00;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Criador de Stickers</h1>
        <p class="subtitle">Converta imagens e vídeos em stickers para WhatsApp</p>
        
        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">🖼️</div>
            <div class="upload-text">Clique ou arraste imagem/vídeo aqui</div>
            <div class="upload-hint">PNG, JPG, GIF, MP4, WEBM (máx 512x512px para melhor qualidade)</div>
            <input type="file" id="fileInput" accept="image/*,video/*">
        </div>

        <div class="preview-area" id="previewArea">
            <div class="preview-box">
                <div class="preview-item">
                    <div class="preview-label">📸 Imagem Original</div>
                    <img id="originalPreview" class="preview-img" alt="Original">
                </div>
                <div class="preview-item">
                    <div class="preview-label">✨ Preview do Sticker</div>
                    <img id="stickerPreview" class="preview-img" alt="Sticker">
                </div>
            </div>

            <div class="sticker-options">
                <div class="option-group">
                    <label class="option-label">📏 Tamanho do Sticker:</label>
                    <div class="size-selector">
                        <button class="size-btn active" data-size="512">512x512 (Recomendado)</button>
                        <button class="size-btn" data-size="256">256x256</button>
                        <button class="size-btn" data-size="128">128x128</button>
                    </div>
                </div>
                
                <div class="option-group">
                    <label class="option-label" for="stickerName">🏷️ Nome do Sticker:</label>
                    <input type="text" id="stickerName" class="option-input" value="Meu Sticker" maxlength="32">
                </div>
                
                <div class="option-group">
                    <label class="option-label" for="stickerAuthor">✍️ Autor:</label>
                    <input type="text" id="stickerAuthor" class="option-input" value="WhatsApp API" maxlength="32">
                </div>

                <button class="generate-btn" id="generateBtn">🎨 Gerar Sticker WebP</button>
            </div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>Processando sticker...</div>
        </div>

        <div class="error" id="error"></div>

        <div class="result-area" id="resultArea">
            <div class="result-label">🎉 Sticker WebP Base64 (pronto para enviar!):</div>
            <div class="result-box" id="resultBox"></div>
            <button class="copy-btn" id="copyBtn">📋 Copiar Base64</button>
            
            <div class="info-box">
                <strong>💡 Como usar:</strong><br>
                Use este base64 no endpoint <code>POST /client/sendMessage/:sessionId</code><br>
                com <code>contentType: "Sticker"</code>
            </div>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const previewArea = document.getElementById('previewArea');
        const originalPreview = document.getElementById('originalPreview');
        const stickerPreview = document.getElementById('stickerPreview');
        const generateBtn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        const resultArea = document.getElementById('resultArea');
        const resultBox = document.getElementById('resultBox');
        const copyBtn = document.getElementById('copyBtn');
        const errorDiv = document.getElementById('error');
        const sizeButtons = document.querySelectorAll('.size-btn');
        
        let currentFile = null;
        let selectedSize = 512;

        // Click to select file
        uploadArea.addEventListener('click', () => fileInput.click());

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

        // Size selection
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSize = parseInt(btn.dataset.size);
            });
        });

        // Handle file
        function handleFile(file) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                errorDiv.textContent = 'Por favor, selecione uma imagem ou vídeo.';
                errorDiv.classList.add('show');
                return;
            }

            currentFile = file;
            errorDiv.classList.remove('show');
            resultArea.classList.remove('show');

            // Show original preview
            const reader = new FileReader();
            reader.onload = (e) => {
                originalPreview.src = e.target.result;
                previewArea.classList.add('show');
            };
            reader.readAsDataURL(file);
        }

        // Generate sticker
        generateBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            loading.classList.add('show');
            errorDiv.classList.remove('show');
            resultArea.classList.remove('show');

            try {
                // Create canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = selectedSize;
                canvas.height = selectedSize;

                // Load image
                const img = new Image();
                img.onload = () => {
                    // Calculate scaling to fit in square
                    const scale = Math.min(selectedSize / img.width, selectedSize / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;
                    const x = (selectedSize - width) / 2;
                    const y = (selectedSize - height) / 2;

                    // Draw with transparent background
                    ctx.clearRect(0, 0, selectedSize, selectedSize);
                    ctx.drawImage(img, x, y, width, height);

                    // Update preview
                    stickerPreview.src = canvas.toDataURL('image/png');

                    // Convert to WebP
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = e.target.result;
                            
                            loading.classList.remove('show');
                            resultBox.textContent = base64;
                            resultArea.classList.add('show');
                        };
                        reader.readAsDataURL(blob);
                    }, 'image/webp', 0.95);
                };

                img.onerror = () => {
                    loading.classList.remove('show');
                    errorDiv.textContent = 'Erro ao processar a imagem.';
                    errorDiv.classList.add('show');
                };

                img.src = URL.createObjectURL(currentFile);
            } catch (error) {
                loading.classList.remove('show');
                errorDiv.textContent = 'Erro ao gerar sticker: ' + error.message;
                errorDiv.classList.add('show');
            }
        });

        // Copy to clipboard
        copyBtn.addEventListener('click', () => {
            const text = resultBox.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copiado!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            });
        });
    </script>
</body>
</html>
  `;
  
  res.send(html);
}

/**
 * Convert image/video to sticker format (API endpoint).
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.body.base64 - Base64 encoded image/video data.
 * @param {number} req.body.size - Sticker size (128, 256, or 512).
 * @returns {Promise<void>}
 * @throws {Error} If there was an error converting to sticker.
 */
const convertToSticker = async (req, res) => {
  // #swagger.summary = 'Convert image/video to sticker'
  // #swagger.description = 'Convert image or video data to WebP sticker format suitable for WhatsApp.'
  /* #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { 
            $ref: "#/definitions/ConvertToStickerBody" 
          },
          examples: {
            image: {
              summary: "Convert image to sticker",
              value: {
                base64: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
                size: 512
              }
            }
          }
        }
      }
    }
  */
  try {
    const { base64, size = 512 } = req.body

    if (!base64) {
      /* #swagger.responses[400] = {
        description: "Bad Request - Base64 data is required.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 400, 'Base64 data is required')
      return
    }

    // Validate size
    const validSizes = [128, 256, 512]
    if (!validSizes.includes(size)) {
      sendErrorResponse(res, 400, 'Size must be 128, 256, or 512')
      return
    }

    // Remove data URI prefix if exists
    let imageData = base64
    if (base64.includes(',')) {
      imageData = base64.split(',')[1]
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64')

    // Process with sharp to create sticker
    const stickerBuffer = await sharp(imageBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 95 })
      .toBuffer()

    // Convert to base64
    const stickerBase64 = stickerBuffer.toString('base64')
    const dataUri = `data:image/webp;base64,${stickerBase64}`

    /* #swagger.responses[200] = {
      description: "Sticker converted successfully.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ConvertToStickerResponse" }
        }
      }
    }
    */
    res.json({
      success: true,
      sticker: dataUri,
      mimetype: 'image/webp',
      size: stickerBuffer.length,
      message: 'Sticker converted successfully'
    })
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('convertToSticker ERROR', error)
    sendErrorResponse(res, 500, error.message)
  }
}

module.exports = {
  createStickerPage,
  convertToSticker
}
