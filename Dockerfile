# ── Stage 1: Build Frontend ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production Server ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy Server Dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy Server Code & Built Frontend
COPY server/ ./server/
COPY --from=builder /app/dist ./server/public

EXPOSE 5000

CMD ["node", "server/server.js"]
