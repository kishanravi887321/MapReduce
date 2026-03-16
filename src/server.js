const express = require('express');

const app = express();
const PORT = process.env.PORT || 7001;

app.use(express.json());

app.get('/', (_req, res) => {
  res.send({ message: 'Express server is running.' });
});

app.get('/health', (_req, res) => {
  res.status(200).send({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
