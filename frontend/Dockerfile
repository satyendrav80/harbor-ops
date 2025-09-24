FROM node:20-alpine
WORKDIR /app

ENV VITE_BACKEND_URL=http://backend:${BACKEND_PORT:-4000}
ENV FRONTEND_PORT=${FRONTEND_PORT:-5173}


# Install dependencies
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build frontend
RUN npm run build -w frontend

EXPOSE ${FRONTEND_PORT}
CMD ["npm", "run", "start:frontend"]
