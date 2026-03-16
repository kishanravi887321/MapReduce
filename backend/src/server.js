const express = require('express');
const multer = require('multer');
const { getWordCountFromPdf } = require('./controllers/pdfController');

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

function partitionFrequencies(frequencies) {
  const worker1 = {};
  const worker2 = {};

  Object.entries(frequencies || {}).forEach(([word, count], index) => {
    if (index % 2 === 0) {
      worker1[word] = count;
    } else {
      worker2[word] = count;
    }
  });

  return { worker1, worker2 };
}

async function sendFrequencyToWorker(workerName, workerUrl, payload) {
  try {
    console.log(`[backend] Sending frequencies to ${workerName} at ${workerUrl}`);
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
  const incoming = req.body && req.body.frequencies;
  const frequencies = incoming && typeof incoming === 'object' && !Array.isArray(incoming)
    ? incoming
    : { distributed: 2, mapreduce: 3, hadoop: 1, spark: 1 };

  const { worker1, worker2 } = partitionFrequencies(frequencies);
  const createdAt = new Date().toISOString();

  const dispatchResults = await Promise.all([
    sendFrequencyToWorker('backend1', 'http://localhost:7002/store/frequencies', {
      source: 'backend-dispatch-test',
      createdAt,
      frequencies: worker1,
    }),
    sendFrequencyToWorker('backend2', 'http://localhost:7003/store/frequencies', {
      source: 'backend-dispatch-test',
      createdAt,
      frequencies: worker2,
    }),
  ]);

  console.log('[backend] Test dispatch results:', dispatchResults);

  res.status(200).send({
    message: 'Dispatch test completed',
    dispatchResults,
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

    const result = await getWordCountFromPdf(req.file.buffer);
    const { worker1, worker2 } = partitionFrequencies(result.frequencies);

    const createdAt = new Date().toISOString();
    const dispatchResults = await Promise.all([
      sendFrequencyToWorker('backend1', 'http://localhost:7002/store/frequencies', {
        source: 'backend',
        createdAt,
        frequencies: worker1,
      }),
      sendFrequencyToWorker('backend2', 'http://localhost:7003/store/frequencies', {
        source: 'backend',
        createdAt,
        frequencies: worker2,
      }),
    ]);

    console.log('[backend] Dispatched frequency partitions:', dispatchResults);

    res.status(200).send({
      ...result,
      workerDispatch: dispatchResults,
    });
  } catch (err) {
    console.error('Error processing PDF word count:', err.message);
    res.status(500).send({ error: 'Failed to process PDF.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
