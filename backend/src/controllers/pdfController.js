const pdfParse = require('pdf-parse');

async function getWordCountFromPdf(buffer) {
  if (!buffer) {
    throw new Error('No PDF buffer provided');
  }

  const data = await pdfParse(buffer);
  const text = (data && data.text) || '';
  const words = text
    .toLowerCase()
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];

  const frequency = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  const sortedFrequency = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const topWords = sortedFrequency.slice(0, 20).map(([word, count]) => ({ word, count }));

  return {
    wordCount: words.length,
    uniqueWordCount: sortedFrequency.length,
    frequencies: frequency,
    topWords,
  };
}

module.exports = {
  getWordCountFromPdf,
};
