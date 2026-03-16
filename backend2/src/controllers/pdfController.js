const pdfParse = require('pdf-parse');

function tokenizeText(text) {
  return (text || '')
    .toLowerCase()
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
}

function buildFrequency(words) {
  const frequency = {};
  for (const word of words || []) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  return frequency;
}

function summarizeFrequency(frequency) {
  const sortedFrequency = Object.entries(frequency || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const wordCount = sortedFrequency.reduce((sum, [, count]) => sum + count, 0);
  const topWords = sortedFrequency.slice(0, 20).map(([word, count]) => ({ word, count }));

  return {
    wordCount,
    uniqueWordCount: sortedFrequency.length,
    frequencies: frequency,
    topWords,
  };
}

async function extractWordsFromPdf(buffer) {
  if (!buffer) {
    throw new Error('No PDF buffer provided');
  }

  const data = await pdfParse(buffer);
  const text = (data && data.text) || '';
  return tokenizeText(text);
}

async function getWordCountFromPdf(buffer) {
  const words = await extractWordsFromPdf(buffer);
  const frequency = buildFrequency(words);
  return summarizeFrequency(frequency);
}

module.exports = {
  buildFrequency,
  extractWordsFromPdf,
  getWordCountFromPdf,
  summarizeFrequency,
};
