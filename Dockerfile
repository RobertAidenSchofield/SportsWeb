FROM node:22-alpine

WORKDIR /app

# Install system dependencies if required
RUN apk add --no-cache tzdata

COPY package*.json ./
RUN npm ci --omit=dev || npm install

COPY . .

# Environment variables will be supplied via docker-compose or container runner
ENV NODE_ENV=production

# Run the standalone sports digest worker
CMD ["npm", "run", "start-worker"]

