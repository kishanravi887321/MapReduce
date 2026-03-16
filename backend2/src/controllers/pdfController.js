const pdfParse = require('pdf-parse');

async function getWordCountFromPdf(buffer) {
  if (!buffer) {
    throw new Error('No PDF buffer provided');
  }

  const data = await pdfParse(buffer);
  const text = (data && data.text) || '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  return {
    wordCount: words.length,
  };
}

module.exports = {
  getWordCountFromPdf,
};
