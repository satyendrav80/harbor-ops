# Harbor Ops Monorepo

Monorepo with TypeScript backend (Express + Prisma + PostgreSQL) and frontend (React + Vite + Tailwind).

## Requirements
- Node.js 20+
- Docker + Docker Compose

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Install deps:

```bash
npm i
npm i -w backend
npm i -w frontend
```

3. Run locally (dev):

```bash
npm run dev
```
- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## Database (Prisma + PostgreSQL)

- Migrate (dev):
```bash
npm run db:migrate
```

- Seed:
```bash
npm run db:seed
```

## Tests
```bash
npm test
```

## Docker

Build and run all services:
```bash
docker-compose up --build
```

Services:
- Postgres: 5432
- Backend: 4000 (GET /health → { ok: true })
- Frontend: 5173 (displays "Backend OK" when backend healthy)

## Project Structure
```
/backend
  package.json
  src/index.ts
/frontend
  package.json
  src/main.tsx
/prisma
  schema.prisma
  seed.ts
/docker-compose.yml
/.env.example
/README.md
```

## Acceptance Criteria Quick Check
- `docker-compose up --build` should start Postgres (5432), backend (4000), frontend (5173).
- `GET http://localhost:4000/health` returns `{ ok: true }`.
- Frontend at `http://localhost:5173` displays `Backend OK` when backend is reachable.
