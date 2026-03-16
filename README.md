# Backend: Express Server (port 7001)

Minimal Express server lives under `backend/` and listens on port 7001 (or `PORT` env override) with a root and health endpoint.

## Setup

```sh
cd backend
npm install .
```

## Run

- Development (auto-reload):

```sh
cd backend
npm run dev
```

- Production:

```sh
cd backend
npm start
```

Server defaults to port 7001. Override with `PORT=xxxx` if needed.

## Endpoints

- `GET /` → `{ message: "Express server is running." }`
- `GET /health` → `{ status: "ok" }`
