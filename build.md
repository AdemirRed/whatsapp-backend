# 📦 Build Executável - WhatsApp API

## 🚀 Como gerar o executável

### 1️⃣ Instalar dependências
```bash
npm install
```

### 2️⃣ Gerar executável para Windows
```bash
npm run build:win
```

### 3️⃣ Outros sistemas (opcional)
```bash
npm run build:linux    # Linux
npm run build:mac      # macOS  
npm run build:all      # Todos os sistemas
```

## 📁 Resultado

O executável será gerado em: `dist/whatsapp-web-api.exe`

## 📋 Para distribuir ao cliente

1. **Copie esses arquivos:**
   - `dist/whatsapp-web-api.exe` (executável principal)
   - `.env` (arquivo de configuração - EDITAR ANTES)
   - `sessions/` (pasta para sessões - pode estar vazia)

2. **Configure o .env para o cliente:**
   - Ajuste `BASE_WEBHOOK_URL`
   - Configure `API_KEY`
   - Defina `PORT` se necessário

3. **Instrução para o cliente:**
   ```bash
   # No CMD ou PowerShell do cliente
   ./whatsapp-web-api.exe
   ```

## ⚙️ Configurações importantes

- ✅ Puppeteer incluído (não precisa instalar Chrome)
- ✅ WhatsApp Web cache incluído
- ✅ Todas as dependências embedadas
- ✅ Arquivo único, sem necessidade de Node.js
- ✅ Compatível com Windows x64

## 📝 Notas

- O executável é grande (~200MB) porque inclui Chrome/Chromium
- Primeira execução pode ser mais lenta (cache do WhatsApp Web)
- Cliente precisa apenas do .exe + .env configurado