FROM node:20-slim

# Install dependencies for Puppeteer and yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    chromium \
    chromium-sandbox \
    fonts-dejavu-core \
    fontconfig \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy app code
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
