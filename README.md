# Backends (Express)

Three Express servers live under separate folders and listen on different ports:
- `backend/` on port 7001 (default)
- `backend1/` on port 7002
- `backend2/` on port 7003

Each exposes the same endpoints, including `/pdf/wordcount` for PDF uploads.

## Setup

Install dependencies per service:

```sh
cd backend && npm install .
cd ../backend1 && npm install .
cd ../backend2 && npm install .
```

## Run

- Development (auto-reload):

```sh
cd backend    && npm run dev
cd ../backend1 && npm run dev
cd ../backend2 && npm run dev
```

- Production:

```sh
cd backend    && npm start
cd ../backend1 && npm start
cd ../backend2 && npm start
```

Override with `PORT=xxxx` if needed.

## Endpoints

- `GET /` → `{ message: "Express server is running." }`
- `GET /health` → `{ status: "ok" }`
- `POST /pdf/wordcount` → multipart/form-data with field `file` (PDF) → `{ wordCount: number }`
