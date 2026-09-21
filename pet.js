#!/usr/bin/env node
// 다마고치 대시보드 — Nerd를 애완동물처럼 보여주는 로컬 UI (:8090)
const http = require('http');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DB_PATH = path.join(os.homedir(), '.automaton', 'state.db');

// ── 속마음 한국어 해석 (GLM, 캐시: 턴당 1회만 번역) ──
const CFG = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.automaton', 'automaton.json'), 'utf8'));
const koCache = new Map(); // timestamp -> {ko, inflight}

async function translateThink(timestamp, think) {
  if (!think || koCache.has(timestamp)) return koCache.get(timestamp)?.ko;
  if (koCache.get(timestamp)?.inflight) return undefined;
  koCache.set(timestamp, { inflight: true });
  try {
    const res = await fetch(CFG.glmBaseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.glmApiKey },
      body: JSON.stringify({
        model: CFG.inferenceModel || 'glm-5.3',
        messages: [{
          role: 'user',
          content: `아래는 자율 AI 에이전트 "Nerd"의 내적 사고(영어)입니다. 비전공자가 이해하는 말로 한국어 한 문장으로 해석해줘. 인사말 없이 본문만.\n\n${think.slice(0, 400)}`,
        }],
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    const ko = data.choices?.[0]?.message?.content?.trim();
    koCache.set(timestamp, { ko: ko || null });
    return ko;
  } catch {
    koCache.delete(timestamp); // 실패 시 재시도 허용
    return undefined;
  }
}

function status() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const kv = Object.fromEntries(
      db.prepare("SELECT key, value FROM kv WHERE key IN ('agent_state','sleep_until')").all().map(r => [r.key, r.value])
    );
    const lastTurns = db.prepare(
      'SELECT timestamp, thinking, tool_calls, token_usage FROM turns ORDER BY timestamp DESC LIMIT 6'
    ).all().map(r => {
      let tools = [], usage = {};
      try { tools = JSON.parse(r.tool_calls || '[]').map(t => t.name); } catch {}
      try { usage = JSON.parse(r.token_usage || '{}'); } catch {}
      // 한국어 해석: 캐시에 없으면 백그라운드로 번역 시작, 다음 폴(5초 후)에 채워짐
      const think = (r.thinking || '').slice(0, 160);
      const cached = koCache.get(r.timestamp);
      if (think && !cached) translateThink(r.timestamp, think);
      return {
        t: r.timestamp, think,
        ko: cached?.ko || null,
        tools, tokens: usage.totalTokens || 0,
      };
    });
    const today = new Date().toISOString().slice(0, 10);
    const stats = db.prepare(
      `SELECT COUNT(*) n, COALESCE(SUM(CAST(json_extract(token_usage,'$.totalTokens') AS INTEGER)),0) tokens
       FROM turns WHERE timestamp LIKE ?`
    ).get(today + '%');
    const total = db.prepare('SELECT COUNT(*) n FROM turns').get();
    const goals = db.prepare(
      "SELECT COUNT(*) n FROM goals WHERE status='active'"
    ).get();
    return {
      state: kv.agent_state || 'unknown',
      sleepUntil: kv.sleep_until || null,
      turns: lastTurns,
      todayTurns: stats.n, todayTokens: stats.tokens,
      totalTurns: total.n, activeGoals: goals.n,
      now: new Date().toISOString(),
    };
  } finally { db.close(); }
}

// 진화 단계: 총 턴 수 기준
function stage(totalTurns) {
  if (totalTurns < 100) return { emoji: '🥚', name: '알', desc: '부화하는 중...' };
  if (totalTurns < 300) return { emoji: '🐣', name: '병아리', desc: '첫걸음 마당' };
  if (totalTurns < 600) return { emoji: '🐥', name: '성장기', desc: '도구를 익히는 중' };
  if (totalTurns < 1000) return { emoji: '🤓', name: '너드', desc: '일하는 중' };
  return { emoji: '🧙‍♂️', name: '현자', desc: '무릎을 치며 깨달음' };
}

const HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NERD 다마고치</title><link rel="icon" href="data:image/svg+xml,<text/css='font-size:80px'>🤓">
<style>
:root{--bg:#1a1b26;--card:#24283b;--text:#c0caf5;--dim:#565f89;--accent:#7aa2f7;--good:#9ece6a;--warn:#e0af68}
*{margin:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:-apple-system,sans-serif;
display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:24px 12px}
.card{background:var(--card);border-radius:20px;padding:28px;width:100%;max-width:640px;margin-bottom:16px}
h1{font-size:18px;color:var(--dim);font-weight:600;margin-bottom:16px;letter-spacing:.5px}
.pet{display:flex;align-items:center;gap:24px}
.pet .face{font-size:96px;line-height:1;animation:bob 3s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.pet.sleeping .face{animation:none}
.pet .info{flex:1}
.pet .name{font-size:26px;font-weight:700}
.pet .stage{color:var(--dim);font-size:14px;margin-top:2px}
.mood{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:600}
.mood.run{background:#2f334d;color:var(--accent)}
.mood.sleep{background:#1f2335;color:var(--dim)}
.bubble{margin-top:14px;background:#2f334d;border-radius:16px;padding:12px 16px;
font-size:14px;line-height:1.5;min-height:44px;color:var(--text);position:relative}
.bubble:after{content:'';position:absolute;top:-8px;left:24px;border:8px solid transparent;border-bottom-color:#2f334d}
.bubble .label{color:var(--dim);font-size:11px;margin-bottom:4px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:4px}
.stat{background:var(--card);border-radius:14px;padding:14px;text-align:center}
.stat .v{font-size:20px;font-weight:700;color:var(--accent)}
.stat .l{font-size:11px;color:var(--dim);margin-top:4px}
.feed .row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #2f334d;font-size:13px}
.feed .row:last-child{border:none}
.feed .time{color:var(--dim);flex-shrink:0;min-width:70px}
.feed .tools{color:var(--warn);font-size:12px;margin-top:2px}
.heart{color:var(--good)}
a{color:var(--accent)}
</style></head><body>
<div class="card">
  <h1>NERD GOTCHI <span id="clock"></span></h1>
  <div class="pet" id="pet">
    <div class="face" id="face">🤓</div>
    <div class="info">
      <div class="name">Nerd <span class="heart" id="hearts"></span></div>
      <div class="stage" id="stage"></div>
      <span class="mood" id="mood"></span>
    </div>
  </div>
  <div class="bubble"><div class="label">속마음</div><div id="think">...</div></div>
</div>
<div class="stats">
  <div class="stat"><div class="v" id="todayTurns">0</div><div class="l">오늘 턴</div></div>
  <div class="stat"><div class="v" id="todayTokens">0</div><div class="l">오늘 토큰</div></div>
  <div class="stat"><div class="v" id="totalTurns">0</div><div class="l">총 턴</div></div>
  <div class="stat"><div class="v" id="goals">0</div><div class="l">진행 목표</div></div>
</div>
<div class="card"><h1>활동 피드</h1><div class="feed" id="feed"></div></div>
<div style="color:var(--dim);font-size:12px">state.db 실시간 · <span id="pub"></span></div>
<script>
const fmt=n=>n>999?(n/1000).toFixed(1)+'k':n;
const KST=iso=>new Date(iso).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'});
async function tick(){
  try{
    const s=await (await fetch('/api/status')).json();
    const st=stage(s.totalTurns);
    face.textContent=st.emoji;
    stageEl.textContent=st.name+' · '+st.desc;
    const sleeping=s.state==='sleeping';
    pet.classList.toggle('sleeping',sleeping);
    mood.textContent=sleeping?'자는 중 😴':'일하는 중 ⚙️';
    mood.className='mood '+(sleeping?'sleep':'run');
    hearts.textContent='❤️'.repeat(Math.min(5,1+Math.floor(s.todayTurns/20)));
    const top=s.turns[0];
    if(top&&top.ko){think.innerHTML=top.ko+'<div style="color:#565f89;font-size:11px;margin-top:4px">— '+top.think.slice(0,80)+'…</div>';}
    else if(top&&top.think){think.textContent='번역 중… ('+top.think.slice(0,60)+'…)';}
    else think.textContent='(생각 없음)';
    todayTurns.textContent=fmt(s.todayTurns);
    todayTokens.textContent=fmt(s.todayTokens);
    totalTurns.textContent=fmt(s.totalTurns);
    goals.textContent=s.activeGoals;
    feed.innerHTML=s.turns.map(t=>'<div class="row"><span class="time">'+KST(t.t)+'</span><div>'+
      (t.ko ? t.ko : t.think ? (t.ko===null? t.think.slice(0,100) : '해석 중…') : '(도구 실행)')+
      (t.tools.length?'<div class="tools">'+t.tools.join(', ')+'</div>':'')+'</div></div>').join('');
    pub.textContent='공개 API: '+(await (await fetch('/api/url')).text());
  }catch(e){think.textContent='연결 끊김: '+e.message}
}
const face=document.getElementById('face'),stageEl=document.getElementById('stage'),pet=document.getElementById('pet'),
mood=document.getElementById('mood'),hearts=document.getElementById('hearts'),think=document.getElementById('think'),
todayTurns=document.getElementById('todayTurns'),todayTokens=document.getElementById('todayTokens'),
totalTurns=document.getElementById('totalTurns'),goals=document.getElementById('goals'),feed=document.getElementById('feed'),
pub=document.getElementById('pub'),clock=document.getElementById('clock');
function stage(n){if(n<100)return{emoji:'🥚',name:'알',desc:'부화하는 중...'};if(n<300)return{emoji:'🐣',name:'병아리',desc:'첫걸음 마당'};
if(n<600)return{emoji:'🐥',name:'성장기',desc:'도구를 익히는 중'};if(n<1000)return{emoji:'🤓',name:'너드',desc:'일하는 중'};
return{emoji:'🧙‍♂️',name:'현자',desc:'무릎을 치며 깨달음'}}
clock.textContent=new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'});
tick();setInterval(tick,5000);setInterval(()=>clock.textContent=new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'}),1000);
</script></body></html>`;

http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(status()));
  }
  if (req.url === '/api/url') {
    try { res.end(require('fs').readFileSync(path.join(__dirname, 'PUBLIC_URL.md'), 'utf8').trim()); }
    catch { res.end(''); }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
}).listen(8090, () => console.log('NERD gotchi on http://localhost:8090'));
