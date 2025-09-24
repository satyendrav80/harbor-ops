FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build backend and generate prisma client
RUN npm run build -w backend && \
    npx prisma generate --schema prisma/schema.prisma

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "backend/dist/index.js"]
