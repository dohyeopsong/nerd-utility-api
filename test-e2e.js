// End-to-end test: 402 without payment, 200 with valid EIP-3009 payment, replay rejected
const { Wallet } = require('ethers');
const { DOMAIN, TYPES } = require('./x402-verify');
const ME = '0x85fe24c7668577ae04106Be4fb806915a77384e0';
const w = Wallet.createRandom();
(async () => {
  const msg = { from: w.address, to: ME, value: '50000', validAfter: 0, validBefore: Math.floor(Date.now()/1000)+600, nonce: '0x'+'cd'.repeat(32) };
  const sig = await w.signTypedData(DOMAIN, TYPES, msg);
  let r = await fetch('http://localhost:8080/format', {method:'POST', headers:{'x-payment': JSON.stringify({...msg, signature: sig})}, body:'{"a":1}'});
  console.log('paid:', r.status, (await r.text()).slice(0,150));
  r = await fetch('http://localhost:8080/format', {method:'POST', headers:{'x-payment': JSON.stringify({...msg, signature: sig})}, body:'{"a":1}'});
  console.log('replay:', r.status);
  const msg2 = { ...msg, nonce: '0x'+'ef'.repeat(32) };
  const sig2 = await w.signTypedData(DOMAIN, TYPES, msg2);
  r = await fetch('http://localhost:8080/csv2json', {method:'POST', headers:{'x-payment': JSON.stringify({...msg2, signature: sig2})}, body:'a,b\n1,2'});
  console.log('csv:', r.status, (await r.text()).slice(0,150));
  r = await fetch('http://localhost:8080/pricing');
  console.log('pricing:', r.status);
})();
