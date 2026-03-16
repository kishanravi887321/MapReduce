# Frontend Placeholder

Routes available on the backends:

- GET / → `{ message: "Express server is running." }`
- GET /health → `{ status: "ok" }`
- POST /pdf/wordcount → multipart/form-data field `file` (PDF) → `{ wordCount: number }`

Implement your frontend here to call the services on ports 7001, 7002, or 7003.
