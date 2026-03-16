const express = require('express');
const multer = require('multer');
const {
  extractWordsFromPdf,
  summarizeFrequency,
} = require('./controllers/pdfController');

const app = express();
const PORT = process.env.PORT || 7001;

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'http://127.0.0.1:5500' || origin === 'http://localhost:5500') {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function splitWordsIntoChunks(words, chunkCount) {
  const chunks = Array.from({ length: chunkCount }, () => []);
  for (let index = 0; index < (words || []).length; index += 1) {
    chunks[index % chunkCount].push(words[index]);
  }
  return chunks;
}

function reduceFrequencyMaps(partials) {
  const finalFrequency = {};
  for (const partial of partials) {
    for (const [word, count] of Object.entries(partial || {})) {
      finalFrequency[word] = (finalFrequency[word] || 0) + count;
    }
  }
  return finalFrequency;
}

async function sendMapTaskToWorker(workerName, workerUrl, payload) {
  try {
    console.log(`[backend] Sending map task to ${workerName} at ${workerUrl}`);
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    return {
      worker: workerName,
      ok: response.ok,
      status: response.status,
      response: data,
    };
  } catch (error) {
    return {
      worker: workerName,
      ok: false,
      error: error.message,
    };
  }
}

app.post('/dispatch/test', async (req, res) => {
  const incomingWords = req.body && req.body.words;
  const words = Array.isArray(incomingWords)
    ? incomingWords.filter((word) => typeof word === 'string' && word.trim().length > 0)
    : ['distributed', 'mapreduce', 'hadoop', 'spark', 'mapreduce'];

  const [worker1Words, worker2Words] = splitWordsIntoChunks(words, 2);
  const createdAt = new Date().toISOString();

  const dispatchResults = await Promise.all([
    sendMapTaskToWorker('backend1', 'http://localhost:7002/map/frequencies', {
      source: 'backend-dispatch-test',
      createdAt,
      words: worker1Words,
    }),
    sendMapTaskToWorker('backend2', 'http://localhost:7003/map/frequencies', {
      source: 'backend-dispatch-test',
      createdAt,
      words: worker2Words,
    }),
  ]);

  const successfulPartials = dispatchResults
    .filter((item) => item.ok && item.response && item.response.frequencies)
    .map((item) => item.response.frequencies);

  const reducedFrequency = reduceFrequencyMaps(successfulPartials);

  console.log('[backend] Test map-reduce results:', dispatchResults);

  res.status(200).send({
    message: 'Map-reduce dispatch test completed',
    dispatchResults,
    reduced: summarizeFrequency(reducedFrequency),
  });
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

    const words = await extractWordsFromPdf(req.file.buffer);
    const [worker1Words, worker2Words] = splitWordsIntoChunks(words, 2);

    const createdAt = new Date().toISOString();
    const mapResults = await Promise.all([
      sendMapTaskToWorker('backend1', 'http://localhost:7002/map/frequencies', {
        source: 'backend',
        createdAt,
        words: worker1Words,
      }),
      sendMapTaskToWorker('backend2', 'http://localhost:7003/map/frequencies', {
        source: 'backend',
        createdAt,
        words: worker2Words,
      }),
    ]);

    const failedWorkers = mapResults.filter((result) => !result.ok);
    if (failedWorkers.length > 0) {
      return res.status(502).send({
        error: 'One or more worker nodes failed during map phase.',
        mapResults,
      });
    }

    const partialFrequencies = mapResults
      .map((result) => result.response && result.response.frequencies)
      .filter(Boolean);

    const reducedFrequency = reduceFrequencyMaps(partialFrequencies);
    const reducedSummary = summarizeFrequency(reducedFrequency);

    console.log('[backend] Map phase completed:', mapResults.map((item) => ({
      worker: item.worker,
      wordsReceived: item.response ? item.response.wordCount : 0,
    })));
    console.log('[backend] Reduce phase completed. Unique words:', reducedSummary.uniqueWordCount);

    res.status(200).send({
      ...reducedSummary,
      mapResults,
    });
  } catch (err) {
    console.error('Error processing PDF word count:', err.message);
    res.status(500).send({ error: 'Failed to process PDF.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
