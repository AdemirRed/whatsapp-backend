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

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies (postinstall aplica o patch no Channel.js automaticamente)
RUN npm ci --only=production

# Copy the rest of the source code to the working directory
COPY . .

# Expose the port the API will run on
EXPOSE 200

# Start the API
CMD ["npm", "start"]