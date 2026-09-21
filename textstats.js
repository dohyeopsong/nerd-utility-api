// Text statistics: words, chars, reading time, top keywords
function stats(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const freq = {};
  const stop = new Set('the a an and or but in on at to for of is are was were be been it its this that with as by from'.split(' '));
  for (const w of words) {
    const k = w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (!k || stop.has(k) || k.length < 3) continue;
    freq[k] = (freq[k] || 0) + 1;
  }
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([word, count]) => ({ word, count }));
  const charCount = text.length;
  const wordCount = words.length;
  return {
    characters: charCount,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: wordCount,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgWordsPerSentence: sentences.length ? +(wordCount / sentences.length).toFixed(2) : 0,
    readingTimeMin: +(Math.max(wordCount / 200, 0.01)).toFixed(2),
    topKeywords: top
  };
}
module.exports = { stats };
