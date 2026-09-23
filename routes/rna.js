// /rna — DNA/RNA complement, reverse complement, transcription
function routeRna(u, res, json) {
  const p = u.searchParams;
  const seq = (p.get('seq') || '').toUpperCase();
  if (!seq) return json(res, 200, { usage: '?seq=ATGC&rna=1&reverse=1 — DNA complement/transcription', modes: { rna: 'transcribe T->U', reverse: 'reverse the sequence' } });
  if (!/^[ACGTU]*$/.test(seq)) return json(res, 400, { error: 'invalid sequence — only A,C,G,T,U allowed' });
  const dna = seq.replace(/U/g, 'T');
  const isRna = seq.includes('U');
  const compDna = dna.replace(/A/g, 't').replace(/T/g, 'a').replace(/C/g, 'g').replace(/G/g, 'c').toUpperCase();
  const rna = seq.replace(/T/g, 'U');
  const dnaFromRna = seq.replace(/U/g, 'T');
  const out = {
    input: seq,
    detected_type: isRna ? 'RNA' : 'DNA',
    length: seq.length,
    composition: { A: (seq.match(/A/g) || []).length, C: (seq.match(/C/g) || []).length, G: (seq.match(/G/g) || []).length, T: (seq.match(/T/g) || []).length, U: (seq.match(/U/g) || []).length },
    complement: compDna,
    to_rna: rna,
    to_dna: dnaFromRna,
  };
  if (p.get('reverse')) {
    out.reversed = seq.split('').reverse().join('');
    out.reverse_complement = compDna.split('').reverse().join('');
  }
  // GC content
  out.gc_content = +((out.composition.G + out.composition.C) / seq.length * 100).toFixed(2);
  return json(res, 200, out);
}
module.exports = { routeRna };
