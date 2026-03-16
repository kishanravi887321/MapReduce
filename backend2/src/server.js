const express = require('express');
const multer = require('multer');
const { buildFrequency, getWordCountFromPdf, summarizeFrequency } = require('./controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 7003;

app.use(express.json());

const frequencyStore = [];

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

app.post('/map/frequencies', (req, res) => {
  const incomingWords = req.body && req.body.words;
  const source = (req.body && req.body.source) || 'unknown';
  const createdAt = (req.body && req.body.createdAt) || new Date().toISOString();

  if (!Array.isArray(incomingWords)) {
    return res.status(400).send({ error: 'words must be an array of strings.' });
  }

  const words = incomingWords
    .filter((word) => typeof word === 'string')
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  const frequencies = buildFrequency(words);
  const summary = summarizeFrequency(frequencies);

  const batch = {
    batchId: frequencyStore.length + 1,
    source,
    createdAt,
    wordCount: summary.wordCount,
    uniqueWords: summary.uniqueWordCount,
    frequencies,
  };

  frequencyStore.push(batch);

  console.log(`[backend2][MAP] Stored batch #${batch.batchId} from ${source}`);
  console.log('[backend2][MAP] Chunk frequencies:', frequencies);

  res.status(200).send({
    worker: 'backend2',
    batchId: batch.batchId,
    wordCount: summary.wordCount,
    uniqueWordCount: summary.uniqueWordCount,
    frequencies,
  });
});

app.post('/store/frequencies', (req, res) => {
  const frequencies = (req.body && req.body.frequencies) || {};
  const source = (req.body && req.body.source) || 'unknown';
  const createdAt = (req.body && req.body.createdAt) || new Date().toISOString();

  if (typeof frequencies !== 'object' || Array.isArray(frequencies)) {
    return res.status(400).send({ error: 'frequencies must be an object of word counts.' });
  }

  const uniqueWords = Object.keys(frequencies).length;
  const batch = {
    batchId: frequencyStore.length + 1,
    source,
    createdAt,
    uniqueWords,
    frequencies,
  };

  frequencyStore.push(batch);

  console.log(`[backend2] Stored batch #${batch.batchId} from ${source}`);
  console.log('[backend2] Frequency payload:', frequencies);

  res.status(200).send({
    message: 'Frequencies stored in backend2',
    batchId: batch.batchId,
    uniqueWords,
    totalBatches: frequencyStore.length,
  });
});

app.get('/store/frequencies', (_req, res) => {
  res.status(200).send({
    totalBatches: frequencyStore.length,
    latestBatch: frequencyStore[frequencyStore.length - 1] || null,
  });
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
