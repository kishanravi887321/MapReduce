const express = require('express');
const multer = require('multer');
const { getWordCountFromPdf } = require('./controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 7002;

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/', (_req, res) => {
  res.send({ message: 'Express server is running.' });
});

app.get('/health', (_req, res) => {
  res.status(200).send({ status: 'ok' });
});

app.post('/pdf/wordcount', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: 'PDF file is required in field "file".' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).send({ error: 'Only PDF uploads are allowed.' });
    }

    const result = await getWordCountFromPdf(req.file.buffer);
    res.status(200).send(result);
  } catch (err) {
    console.error('Error processing PDF word count:', err.message);
    res.status(500).send({ error: 'Failed to process PDF.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
