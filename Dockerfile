# Usa Debian slim - mais estável que Alpine para Chromium em ambientes cloud
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Instala Chromium e dependências necessárias
ENV CHROME_BIN="/usr/bin/chromium" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" \
    NODE_ENV="production" \
    # Aponta sessões para o volume do Railway (/app/.wwebjs_auth)
    SESSIONS_PATH="/app/.wwebjs_auth"
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libnspr4 \
    libnss3 \
    libxss1 \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json, package-lock.json e patch.js antes do npm ci
# (patch.js precisa existir antes do postinstall rodar durante npm ci)
COPY package*.json patch.js ./

# Install the dependencies (postinstall roda node patch.js automaticamente)
RUN npm ci --only=production

# Copy the rest of the source code to the working directory
COPY . .

# Expose the port the API will run on
EXPOSE 200

# Start the API
CMD ["npm", "start"]