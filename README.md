# Express Server (port 7001)

Minimal Express server that listens on port 7001 (or `PORT` env override) with a root and health endpoint.

## Setup

```sh
npm install .
```

## Run

- Development (auto-reload):

```sh
npm run dev
```

- Production:

```sh
npm start
```

Server defaults to port 7001. Override with `PORT=xxxx` if needed.

## Endpoints

- `GET /` → `{ message: "Express server is running." }`
- `GET /health` → `{ status: "ok" }`
