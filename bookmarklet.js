(() => {
if (window.__vdash) { alert('Ricarica la pagina Vinted prima di avviare questa versione aggiornata.'); return; }
const LS = 'vdash_settings', LC = 'vdash_cache';
const DEF = { sec: 60, max: 10, minRev: 1, minStars: 4, kw: '', hideUnv: true, showHidden: false, query: '', incWords:'', incMode:'any', sound:false, sndSec: 2, verify:false, dark:false };
const TTL = 6 * 3600 * 1000, MAXC = 300, DELAY = 800;

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const splitKw = s => String(s || '').split(/[\n,;]+/).map(norm).filter(Boolean);
const findKw = (text, kws) => { const t = norm(text); return kws.find(k => t.includes(k)) || null; };
function parse(html) {
  const h = html.replace(/\\"/g, '"');
  const ld = html.match(/application\/ld\+json">(\{.*?\})<\/script>/s);
  let j = {};
  try { j = JSON.parse(ld[1]); } catch (e) {}
  const o = j.offers || {};
  const base = /"feedback_count":(\d+),"feedback_reputation":([\d.]+),"follow_action_visible":(?:true|false),"is_favourite":(?:true|false),"item_id":"\d+","name":"([^"]+)"/;
  const s = h.match(new RegExp(base.source + /,"photo":\{.*?"type":"thumb50","url":"([^"]+)"/.source, 's')) || h.match(base);
  const buy = h.match(/"can_buy":(true|false),"instant_buy":(true|false)/);
  return {
    title: j.name || '', desc: j.description || '', image: j.image || '',
    price: o.price != null ? o.price : null, cur: o.priceCurrency || 'EUR', avail: o.availability || '',
    found: !!s,
    count: s ? +s[1] : 0,
    starsNum: s ? parseFloat(s[2]) * 5 : null,
    stars: s ? (parseFloat(s[2]) * 5).toFixed(1) : '?',
    seller: s ? s[3] : '?',
    sellerPhoto: s && s[4] ? s[4] : '',
    canBuy: buy ? buy[1] === 'true' : false,
    electronicsHint: /verifica\s+(?:dell[’']?\s*)?elettronica|electronics\s+verification/i.test(new DOMParser().parseFromString(html,'text/html').body.textContent || '')
  };
}
function reason(d, S) {
  if (!d || !d.found) return S.hideUnv ? 'non verificabile' : null;
  if (d.count < S.minRev) return 'recensioni ' + d.count;
  if (d.starsNum < S.minStars) return 'stelle ' + d.stars;
  const k = findKw(d.title + ' ' + d.desc, splitKw(S.kw));
  if(k) return 'parola "' + k + '"';
  const inc=splitKw(S.incWords), text=norm(d.title+' '+d.desc);
  if(inc.length && !(S.incMode==='all'?inc.every(w=>text.includes(w)):inc.some(w=>text.includes(w)))) return 'filtro Includi';
  if(S.verify && d.electronicsHint!==true) return d.electronicsHint===false?'verifica elettronica non rilevata':'verifica elettronica da ricontrollare';
  return null;
}
function apiQuery(q, max) {
  let sp;
  q = String(q || '').trim();
  if (/^https?:\/\//i.test(q)) sp = new URL(q).searchParams;
  else if (q.charAt(0) === '?') sp = new URLSearchParams(q);
  else sp = new URLSearchParams({ search_text: q });
  const out = new URLSearchParams(sp.toString());
  if (!out.has('order')) out.set('order', 'newest_first');
  out.set('per_page', String(Math.max(max, 10)));
  out.set('page', '1');
  return out.toString();
}
function idsFromHtml(html) {
  const ids = [], seen = new Set();
  for (const m of html.matchAll(/\/items\/(\d+)-/g)) if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
  return ids;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
let S = { ...DEF, ...load(LS, {}) };
let cache = load(LC, {});
const legacy=load('vdash_include_v1',{});
if(!Object.prototype.hasOwnProperty.call(load(LS,{}),'incWords')) { S.incWords=legacy.words||''; S.incMode=legacy.mode||'any'; S.sound=!!legacy.sound; S.verify=!!legacy.verify; }
const METRICS='vdash_analyses_hour_v1', HOUR=3600000, HIDDEN='vdash_hidden_v1';
let analyses=load(METRICS,{}), hidden=load(HIDDEN,{});
if(!analyses || typeof analyses!=='object' || Array.isArray(analyses)) analyses={};
if(!hidden || typeof hidden!=='object' || Array.isArray(hidden)) hidden={};
function pruneAnalyses(now=Date.now()) { for(const id of Object.keys(analyses)) if(!Number.isFinite(analyses[id]) || analyses[id]>now || now-analyses[id]>=HOUR) delete analyses[id]; }
function recordAnalysis(id,ts) { pruneAnalyses(ts); analyses[String(id)]=ts; try { localStorage.setItem(METRICS,JSON.stringify(analyses)); }catch(e){} }
function hourCount() { pruneAnalyses(); return Object.keys(analyses).length; }
function ageText(ts,now=Date.now()) { if(!Number.isFinite(ts)) return 'Analisi non disponibile'; const seconds=Math.max(0,Math.floor((now-ts)/1000)); return 'Analizzato '+(seconds<60?seconds+' s':Math.floor(seconds/60)+' min '+(seconds%60)+' s')+' fa'; }
function isHidden(id) { return !!hidden[String(id)]; }
function hideItem(id) { hidden[String(id)]=true; saveHidden(); render(); }
function saveHidden() { try { localStorage.setItem(HIDDEN,JSON.stringify(hidden)); }catch(e){} }

let audio=null;
async function soundReady(test=false) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if(audio.state === 'suspended') await audio.resume();
    if(test) await playSound();
    else if(audio.state === 'running') $('vaudio').textContent = 'Audio pronto (volume max)';
  } catch(e) {
    $('vaudio').textContent = 'Audio non disponibile: ' + e.message;
  }
}

async function playSound() {
  try { await soundReady(false); } catch(e){}
  if(!audio || audio.state !== 'running') {
    $('vaudio').textContent = 'Tocca lo schermo o premi Prova suono per abilitare l\'audio';
    return;
  }
  const dur = Math.max(0.5, Math.min(60, Number(S.sndSec) || 2));
  const t = audio.currentTime;
  const o1 = audio.createOscillator();
  const o2 = audio.createOscillator();
  const g = audio.createGain();
  o1.type = 'triangle';
  o1.frequency.value = 920;
  o2.type = 'sine';
  o2.frequency.value = 1840;
  o1.connect(g);
  o2.connect(g);
  g.connect(audio.destination);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.95, t + 0.03);
  g.gain.setValueAtTime(0.95, t + Math.max(0.04, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o1.start(t); o1.stop(t + dur);
  o2.start(t); o2.stop(t + dur);
  o1.onended = () => { o1.disconnect(); o2.disconnect(); g.disconnect(); };
  $('vaudio').textContent = 'Audio attivo (' + dur + ' s)';
}

function updateAges() { root.querySelectorAll('[data-analysis-ts]').forEach(el=>{el.textContent=ageText(Number(el.dataset.analysisTs));});const counter=$('v-hour'); if(counter)counter.textContent='Analizzati negli ultimi 60 min: '+hourCount()+' annunci distinti (inclusi nascosti)'; }
if (location.pathname.indexOf('/catalog') === 0) S.query = location.href;
const save = () => localStorage.setItem(LS, JSON.stringify(S));
const saveCache = () => {
  const ks = Object.keys(cache);
  if (ks.length > MAXC) ks.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, ks.length - MAXC).forEach(k => delete cache[k]);
  try { localStorage.setItem(LC, JSON.stringify(cache)); } catch (e) {}
};

const items = new Map();
let order = [], seenIds = null, newIds = new Set(), running = false, left = S.sec, paused = false, lastErr = '', lastAt = '';

const style = document.createElement('style');
style.textContent = '#vd-dash{position:fixed;inset:0;z-index:2147483647;background:#f2f2f2;overflow:auto;font:14px sans-serif;color:#222;transition:background .2s}' +
  '#vd-dash .bar{position:sticky;top:0;background:#007782;color:#fff;padding:8px 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;z-index:2;transition:background .2s,color .2s}' +
  '#vd-dash .bar label{display:flex;gap:4px;align-items:center;font-size:12px}' +
  '#vd-dash input[type=number]{width:60px}#vd-dash .bar input[type=text]{width:260px}' +
  '#vd-dash textarea{width:150px;height:34px;font-size:12px}' +
  '#vd-dash button{padding:4px 10px;border:0;border-radius:4px;cursor:pointer}' +
  '#vd-dash .st{padding:6px 12px;font-size:12px;color:#555}' +
  '#vd-dash .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:12px}' +
  '#vd-dash .c{background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;position:relative}' +
  '#vd-dash .c.h{opacity:.45}' +
  '#vd-dash .c img.p{width:100%;height:220px;object-fit:cover;display:block}' +
  '#vd-dash .b{padding:8px}#vd-dash .t{font-weight:bold;margin-bottom:4px}' +
  '#vd-dash .d{max-height:80px;overflow:auto;font-size:12px;margin:6px 0;white-space:pre-wrap}' +
  '#vd-dash .n{position:absolute;top:6px;left:6px;background:#e53935;color:#fff;font-size:11px;padding:2px 6px;border-radius:4px}' +
  '#vd-dash .r{position:absolute;top:6px;right:6px;background:#555;color:#fff;font-size:11px;padding:2px 6px;border-radius:4px}' +
  '#vd-dash .buy{display:inline-block;background:#007782;color:#fff;padding:5px 10px;border-radius:4px;text-decoration:none}' +
  '#vd-dash .seller{display:flex;gap:8px;align-items:center;margin:8px 0 6px;font-size:16px;font-weight:700}' +
  '#vd-dash .seller img{width:30px;height:30px;border-radius:50%;object-fit:cover}' +
  '#vd-dash .stats{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}' +
  '#vd-dash .stars{display:inline-flex;align-items:center;gap:5px;background:#fff7d6;color:#5c4300;border:2px solid #d9a900;border-radius:999px;padding:9px 14px;font-size:22px;font-weight:900;line-height:1}' +
  '#vd-dash .reviews{display:inline-flex;align-items:center;background:#e8f0ff;color:#123a78;border:2px solid #7ea3ea;border-radius:999px;padding:9px 14px;font-size:22px;font-weight:900;line-height:1}' +
  '#vd-dash .hide{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.65);color:#fff;border:0;border-radius:6px;padding:7px 9px;font-size:15px;cursor:pointer;z-index:3}' +
  '#vd-dash .hide:hover{background:#c62828}' +
  '#vd-dash.dark-mode{background:#000000 !important}' +
  '#vd-dash.dark-mode .bar{background:#000000 !important;color:#888888 !important;border-bottom:1px solid #222}' +
  '#vd-dash.dark-mode .bar label{color:#888888 !important}' +
  '#vd-dash.dark-mode .bar b{color:#aaaaaa !important}' +
  '#vd-dash.dark-mode .st{color:#777777 !important}' +
  '#vd-dash.dark-mode .bar input,#vd-dash.dark-mode .bar textarea,#vd-dash.dark-mode .bar select{background:#111;color:#ccc;border:1px solid #444}' +
  '#vd-dash.dark-mode .bar button{background:#222;color:#bbb;border:1px solid #444}';
document.head.appendChild(style);

const root = document.createElement('div');
root.id = 'vd-dash';
root.innerHTML =
  '<div class="bar">' +
  '<b>Vinted Dashboard</b>' +
  '<label>Ricerca <input type="text" id="vq" placeholder="testo o URL di ricerca Vinted"></label>' +
  '<label>Refresh (s) <input type="number" id="vs" min="10"></label>' +
  '<label>Primi <input type="number" id="vm" min="1" max="60"></label>' +
  '<label>Rec. min <input type="number" id="vr" min="0"></label>' +
  '<label>Stelle min <input type="number" id="vst" min="0" max="5" step="0.1"></label>' +
  '<label>Escludi <textarea id="vk" placeholder="parole separate da virgola o riga"></textarea></label>' +
  '<label><input type="checkbox" id="vu"> nascondi non verificabili</label>' +
  '<label><input type="checkbox" id="vh"> mostra anche nascosti</label>' +
  '<label>Includi <textarea id="vi" placeholder="parole o frasi, separate da virgola"></textarea></label>' +
  '<select id="vim"><option value="any">Almeno una</option><option value="all">Tutte</option></select>' +
  '<label><input type="checkbox" id="vas"> Suono</label>' +
  '<label>Suono (s) <input type="number" id="vss" min="1" max="30"></label>' +
  '<button id="vatest">Prova suono</button><span id="vaudio"></span>' +
  '<label title="Riconoscimento testuale sperimentale, non conferma al checkout"><input type="checkbox" id="vverify"> Solo con verifica elettronica (sperimentale)</label>' +
  '<label><input type="checkbox" id="vdark"> Sfondo Nero</label>' +
  '<button id="vgo">Aggiorna ora</button><button id="vp">Pausa</button><button id="vx">Chiudi</button>' +
  '</div><div class="st" id="v-hour"></div><div class="st" id="vst2"></div><div class="grid" id="vg"></div>';
document.body.appendChild(root);
const $ = id => root.querySelector('#' + id);

function applyTheme() {
  if (S.dark) root.classList.add('dark-mode');
  else root.classList.remove('dark-mode');
}

function fill() {
  $('vi').value=S.incWords; $('vim').value=S.incMode; $('vas').checked=S.sound; $('vss').value=S.sndSec; $('vverify').checked=S.verify; $('vdark').checked=!!S.dark;
  $('vq').value = S.query; $('vs').value = S.sec; $('vm').value = S.max; $('vr').value = S.minRev;
  $('vst').value = S.minStars; $('vk').value = S.kw; $('vu').checked = S.hideUnv; $('vh').checked = S.showHidden;
  applyTheme();
}
function read() {
  S.incWords=$('vi').value; S.incMode=$('vim').value; S.sound=$('vas').checked;
  S.sndSec = Math.max(1, parseInt($('vss').value, 10) || 2);
  S.verify=$('vverify').checked; S.dark=$('vdark').checked;
  S.query = $('vq').value.trim();
  S.sec = Math.max(10, parseInt($('vs').value, 10) || 60);
  S.max = Math.min(60, Math.max(1, parseInt($('vm').value, 10) || 10));
  S.minRev = Math.max(0, parseInt($('vr').value, 10) || 0);
  S.minStars = Math.max(0, parseFloat($('vst').value) || 0);
  S.kw = $('vk').value;
  S.hideUnv = $('vu').checked; S.showHidden = $('vh').checked;
  applyTheme();
  save();
}

function render() {
  let shown = 0, hid = 0, pend = 0, html = '';
  order.forEach(id => {
    const it = items.get(id);
    if (!it || it.status === 'pending') { pend++; return; }
    const r = isHidden(id) ? 'nascosto manualmente' : reason(it.d, S);
    if (r) { hid++; if (!S.showHidden) return; } else shown++;
    const d = it.d || {};
    html += '<div class="c' + (r ? ' h' : '') + '">' +
      (newIds.has(id) ? '<span class="n">NUOVO</span>' : '') + (r ? '<span class="r">' + esc(r) + '</span>' : '') +
      (d.image ? '<a href="' + esc(it.url) + '" target="_blank"><img class="p" src="' + esc(d.image) + '"></a>' : '') +
      '<div class="b"><div class="t">' + esc(d.title) + '</div>' +
      (it.analyzedAt ? '<div style="font-size:12px;color:#555;margin:5px 0" data-analysis-ts="'+it.analyzedAt+'" title="Ultima lettura dei dettagli: '+esc(new Date(it.analyzedAt).toLocaleString())+'">'+ageText(it.analyzedAt)+'</div>' : '<div>Analisi non riuscita</div>') +
      '<div><b>' + (d.price != null ? esc(d.price) + ' ' + esc(d.cur) : '') + '</b></div>' +
      '<div class="seller">' + (d.sellerPhoto ? '<img src="' + esc(d.sellerPhoto) + '">' : '') + '<b>' + esc(d.seller) + '</b></div>' +
      '<div class="stats"><span class="stars">★ ' + esc(d.stars) + '</span><span class="reviews">' + esc(d.count) + ' recensioni</span></div>' +
      '<div class="d">' + esc(d.desc) + '</div>' +
      (d.canBuy ? '<a class="buy" href="' + esc(it.url) + '" target="_blank">Acquista</a>' : '<i>Non acquistabile</i>') +
      '<button class="hide" data-hide="'+esc(id)+'" title="Nascondi questo annuncio" aria-label="Nascondi annuncio">🗑</button>' +
      '</div></div>';
  });
  $('vg').innerHTML = html;
  const nn = [...newIds].filter(id => items.get(id) && items.get(id).status === 'ok' && !reason(items.get(id).d, S)).length;
  document.title = (nn ? '(' + nn + ') ' : '') + 'Vinted Dashboard';
  $('vst2').textContent = shown + ' mostrati, ' + hid + ' nascosti, ' + pend + ' in verifica | ultimo aggiornamento ' + (lastAt || '-') +
    ' | prossimo tra ' + (paused ? 'pausa' : left + ' s') + (lastErr ? ' | ERRORE: ' + lastErr : '');
}

async function listIds() {
  const qs = apiQuery(S.query, S.max);
  lastErr = '';
  try {
    const r = await fetch('/catalog?' + qs, { credentials: 'include' });
    if (r.ok) {
      const ids = idsFromHtml(await r.text()).slice(0, S.max);
      if (ids.length) return ids;
    }
    lastErr = 'HTML ' + r.status;
  } catch (e) {
    lastErr = 'HTML ' + e.message;
  }
  return null;
}

async function detail(id) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch('/items/' + id, { credentials: 'include' });
    if (r.ok) return { d: parse(await r.text()), url: r.url };
    await sleep(2000 * (i + 1));
  }
  return null;
}

async function refresh() {
  if (running) return;
  running = true;
  read();
  try {
    const ids = await listIds();
    if (ids) {
      if (seenIds === null) seenIds = new Set(ids);
      else ids.forEach(id => { if (!seenIds.has(id)) { seenIds.add(id); newIds.add(id); } });
      order = ids;
      ids.forEach(id => { if (!items.has(id)) items.set(id, { status: 'pending', d: null, url: '/items/' + id }); });
      render();
      for (const id of ids) {
        const it = items.get(id);
        if (it.status === 'ok') continue;
        const hit = cache[id];
        if (hit && Date.now() - hit.ts < TTL && (!S.verify || typeof hit.d.electronicsHint==='boolean')) { it.d = hit.d; it.url = hit.url; it.analyzedAt=hit.ts; it.status = 'ok'; render(); continue; }
        try {
          const res = await detail(id);
          if (res && (res.d.found || res.d.title)) {
            const ts=Date.now(); it.analyzedAt=ts; recordAnalysis(id,ts);
            cache[id] = { ts, d: res.d, url: res.url }; saveCache(); it.d = res.d; it.url = res.url; it.status = 'ok';
            if(newIds.has(id) && !it.notified && !isHidden(id) && !reason(it.d,S)) {
              it.notified = true;
              if (S.sound) playSound();
            }
          }
          else { it.d = res ? res.d : null; it.status = 'ok'; }
        } catch (e) { it.d = null; it.status = 'ok'; }
        render();
        await sleep(DELAY);
      }
    }
    lastAt = new Date().toLocaleTimeString();
  } finally { running = false; left = S.sec; render(); }
}

setInterval(() => {
  updateAges();
  if (paused || root.style.display === 'none') return;
  left--;
  if (left <= 0) refresh(); else { const status=$('vst2'); status.textContent=status.textContent.replace(/prossimo tra [^|]+/, 'prossimo tra '+left+' s '); }
}, 1000);

['vq','vs','vm','vr','vst','vk','vu','vh','vi','vim','vas','vss','vverify','vdark'].forEach(id => $(id).addEventListener('change', () => {
  const oldQ = S.query, oldM = S.max;
  read(); left = S.sec;
  if (S.query !== oldQ || S.max !== oldM) { items.clear(); seenIds = null; newIds.clear(); refresh(); } else render();
}));
root.addEventListener('click',e=>{
  if(S.sound && (!audio || audio.state!=='running')) soundReady(false);
  const b=e.target.closest('[data-hide]');
  if(b){e.preventDefault();e.stopPropagation();hideItem(b.dataset.hide);}
});
$('vas').addEventListener('change',()=>{if($('vas').checked)soundReady(true);});
$('vatest').addEventListener('click',()=>soundReady(true));

$('vgo').addEventListener('click', refresh);
$('vp').addEventListener('click', () => { paused = !paused; $('vp').textContent = paused ? 'Riprendi' : 'Pausa'; render(); });
$('vx').addEventListener('click', () => { root.style.display = 'none'; document.title = 'Vinted'; });

window.__vdash = {
  toggle() { root.style.display = root.style.display === 'none' ? '' : 'none'; if (root.style.display !== 'none') { left = 1; } }
};
fill();
if(S.sound) soundReady(false);
refresh();
})();
