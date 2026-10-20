/* Beyond the Screen: Understanding the Network Layer
   Vanilla JS. All network demos are SIMULATIONS (no real traffic). */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ===== Nav, progress bar, scroll-spy, reveal ===== */
const progress = $('#progress');
const links = $$('#navLinks a');
function onScroll() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  let current = '';
  $$('section[id]').forEach(s => { if (s.getBoundingClientRect().top < 140) current = s.id; });
  const map = { vc: 'vc', datagram: 'vc', compare: 'vc', ip: 'ip', ipv4: 'ip', 'ipv4-header': 'ip', ipv6: 'ip', icmp: 'icmp',
    routing: 'routing', linkstate: 'routing', rip: 'routing', ospf: 'routing', bgp: 'routing', protocols: 'routing',
    lab: 'lab', casestudy: 'lab', toc: 'toc', quiz: 'quiz', glossary: 'glossary' };
  links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + (map[current] || '')));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
$('#burger').addEventListener('click', () => {
  const open = $('#navLinks').classList.toggle('open');
  $('#burger').setAttribute('aria-expanded', open);
});
links.forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
  $$('.card, .panel, table, .diagram').forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

/* ===== Hero canvas: drifting nodes with connecting lines and moving packets ===== */
(function hero() {
  const c = $('#bg'), ctx = c.getContext('2d');
  let w, h, pts = [], pk = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    w = c.width = c.offsetWidth; h = c.height = c.offsetHeight;
    const n = Math.max(24, Math.min(70, Math.floor(w * h / 18000)));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; });
    const D = 150;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < D) { ctx.strokeStyle = `rgba(59,130,246,${(1 - d / D) * .45})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    pts.forEach(p => { ctx.fillStyle = 'rgba(34,211,238,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill(); });
    if (Math.random() < .05 && pts.length > 2) {
      const a = pts[Math.floor(Math.random() * pts.length)];
      const b = pts.filter(q => q !== a && Math.hypot(a.x - q.x, a.y - q.y) < D)[0];
      if (b) pk.push({ a, b, t: 0 });
    }
    pk = pk.filter(p => p.t < 1);
    pk.forEach(p => { p.t += .02; ctx.fillStyle = '#a78bfa'; ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 3.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
    if (!reduce) requestAnimationFrame(frame);
  }
  size(); frame();
  addEventListener('resize', size);
})();

/* ===== IPv4 header: clickable fields ===== */
const HDR = [
  ['Version', 4, 1, 'IP version; 4 for IPv4.'],
  ['HLEN', 4, 1, 'Header length in 32-bit words (5–15).'],
  ['Type of service', 8, 2, 'Delay, throughput and reliability hints.'],
  ['Total length', 16, 4, 'Header plus data, up to 65,535 bytes.'],
  ['Identification', 16, 4, 'Groups fragments of one datagram.'],
  ['Flags', 3, 1, 'Reserved, do-not-fragment, more-fragments.'],
  ['Fragment offset', 13, 3, 'Fragment position, in 8-byte units.'],
  ['TTL', 8, 2, 'Hop limit; prevents looping.'],
  ['Protocol', 8, 2, 'Protocol receiving the data.'],
  ['Header checksum', 16, 4, 'Detects header errors.'],
  ['Source IP address', 32, 8, 'Sender’s address.'],
  ['Destination IP address', 32, 8, 'Receiver’s address.'],
  ['Options', 0, 8, 'Optional, e.g. record route.']
];
(function header() {
  const grid = $('#hdrGrid'), info = $('#hdrInfo');
  HDR.forEach(([name, bits, m, text], i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--s', bits || 32);
    b.style.setProperty('--m', m);
    if (!bits) b.classList.add('opt');
    b.innerHTML = `${esc(name)}<small>${bits ? bits + ' bits' : 'variable'}</small>`;
    b.addEventListener('click', () => {
      $$('button', grid).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      info.innerHTML = `<b>${esc(name)}</b> — ${esc(text)}`;
    });
    grid.appendChild(b);
  });
})();

/* ===== ICMP types ===== */
const ICMP = [
  [0, 'Echo Reply', 'Answer to ping.'],
  [3, 'Destination Unreachable', 'Network, host or port unreachable.'],
  [5, 'Redirect', 'A better route exists.'],
  [8, 'Echo Request', 'Sent by ping.'],
  [11, 'Time Exceeded', 'TTL expired; traceroute relies on it.'],
  [12, 'Parameter Problem', 'Bad header field.']
];
(function icmp() {
  const box = $('#icmpBtns'), info = $('#icmpInfo');
  ICMP.forEach(([t, n, d]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = `Type ${t} · ${n}`;
    b.addEventListener('click', () => {
      $$('button', box).forEach(x => x.classList.remove('on')); b.classList.add('on');
      info.innerHTML = `<b>Type ${t} — ${esc(n)}</b><br>${esc(d)}`;
    });
    box.appendChild(b);
  });
})();

/* ===== OSPF states ===== */
const OSPF = [
  ['Down', 'No Hellos received.'],
  ['Init', 'Hello seen; not yet bidirectional.'],
  ['Two-Way', 'Bidirectional; DR and BDR elected.'],
  ['ExStart', 'Master and slave chosen.'],
  ['Exchange', 'Database descriptions swapped.'],
  ['Loading', 'Missing LSAs requested.'],
  ['Full', 'LSDBs synchronised.']
];
(function ospf() {
  const box = $('#ospfBtns'), info = $('#ospfInfo');
  OSPF.forEach(([n, d], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = `${i + 1}. ${n}`;
    b.addEventListener('click', () => {
      $$('button', box).forEach(x => x.classList.remove('on')); b.classList.add('on');
      info.innerHTML = `<b>${n} state</b> — ${esc(d)}`;
    });
    box.appendChild(b);
  });
})();

/* ===== A. Animated packet journey (simulation) ===== */
(function journey() {
  const svg = $('#journeySvg'), log = $('#journeyLog');
  const nodes = [
    { id: 'PC', x: 70, y: 150, t: 'host' }, { id: 'R1', x: 220, y: 70, t: 'r' }, { id: 'R2', x: 220, y: 230, t: 'r' },
    { id: 'R3', x: 400, y: 150, t: 'r' }, { id: 'R4', x: 540, y: 70, t: 'r' }, { id: 'R5', x: 540, y: 230, t: 'r' }, { id: 'Server', x: 660, y: 150, t: 'host' }];
  const edges = [['PC', 'R1'], ['PC', 'R2'], ['R1', 'R3'], ['R2', 'R3'], ['R3', 'R4'], ['R3', 'R5'], ['R4', 'Server'], ['R5', 'Server']];
  const route = ['PC', 'R1', 'R3', 'R4', 'Server'];
  const N = Object.fromEntries(nodes.map(n => [n.id, n]));
  const lines = {};
  edges.forEach(([a, b]) => { lines[a + b] = svgEl('line', { x1: N[a].x, y1: N[a].y, x2: N[b].x, y2: N[b].y, stroke: '#2b3a6b', 'stroke-width': 2 }, svg); });
  for (let i = 0; i < route.length - 1; i++) lines[route[i] + route[i + 1]].setAttribute('stroke', '#3b82f6');
  nodes.forEach(n => {
    const g = svgEl('g', {}, svg);
    if (n.t === 'host') svgEl('rect', { x: n.x - 32, y: n.y - 20, width: 64, height: 40, rx: 8, fill: '#14204a', stroke: '#22d3ee', 'stroke-width': 2 }, g);
    else svgEl('circle', { cx: n.x, cy: n.y, r: 24, fill: '#14204a', stroke: '#8b5cf6', 'stroke-width': 2 }, g);
    svgEl('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 13, 'font-weight': 700 }, g).textContent = n.id;
  });
  const pkt = svgEl('g', { visibility: 'hidden' }, svg);
  svgEl('circle', { r: 9, fill: '#fbbf24', stroke: '#fff', 'stroke-width': 2 }, pkt);
  const ttlTxt = svgEl('text', { y: -14, 'text-anchor': 'middle', fill: '#fbbf24', 'font-size': 12, 'font-weight': 700 }, pkt);
  const legend = svgEl('text', { x: 360, y: 290, 'text-anchor': 'middle', fill: '#8a97b8', 'font-size': 12 }, svg);
  legend.textContent = 'Blue: chosen route.';
  let raf = 0, running = false;
  const place = (x, y, ttl) => { pkt.setAttribute('transform', `translate(${x},${y})`); ttlTxt.textContent = 'TTL ' + ttl; };
  function reset() {
    cancelAnimationFrame(raf); running = false; pkt.setAttribute('visibility', 'hidden');
    $('#sendBtn').disabled = false; log.textContent = 'Press send.';
  }
  function send() {
    if (running) return;
    let ttl = parseInt($('#ttlInput').value, 10);
    if (!(ttl >= 1 && ttl <= 20)) { log.innerHTML = '<span class="err">Enter a TTL from 1 to 20.</span>'; return; }
    running = true; $('#sendBtn').disabled = true; pkt.setAttribute('visibility', 'visible');
    const lines2 = [`PC sends a datagram with TTL ${ttl} (source = PC, destination = Server).`];
    log.innerHTML = lines2.join('<br>');
    let leg = 0, t0 = null; const DUR = 1100;
    place(N.PC.x, N.PC.y, ttl);
    function step(ts) {
      if (t0 === null) t0 = ts;
      const k = Math.min((ts - t0) / DUR, 1), a = N[route[leg]], b = N[route[leg + 1]];
      place(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, ttl);
      if (k < 1) { raf = requestAnimationFrame(step); return; }
      leg++; t0 = null;
      if (route[leg] === 'Server') { lines2.push('<span class="ok">Server received the datagram. Payload delivered to the application.</span>'); log.innerHTML = lines2.join('<br>'); running = false; $('#sendBtn').disabled = false; return; }
      ttl--;
      place(b.x, b.y, ttl);
      lines2.push(`${route[leg]}: looks up the destination in its routing table, decrements TTL to ${ttl}, forwards to ${route[leg + 1]}.`);
      if (ttl <= 0) {
        lines2.push(`<span class="err">TTL reached 0 at ${route[leg]}: packet discarded. A real router would send ICMP Time Exceeded (type 11) to the source.</span>`);
        log.innerHTML = lines2.join('<br>'); pkt.querySelector('circle').setAttribute('fill', '#fb7185'); setTimeout(() => pkt.querySelector('circle').setAttribute('fill', '#fbbf24'), 1500);
        running = false; $('#sendBtn').disabled = false; return;
      }
      log.innerHTML = lines2.join('<br>'); raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  $('#sendBtn').addEventListener('click', send);
  $('#resetBtn').addEventListener('click', reset);
})();

/* ===== B. IPv4 calculator ===== */
function analyseIPv4(str) {
  const s = str.trim();
  if (!s) return { ok: false, msg: 'Enter an IPv4 address.' };
  const parts = s.split('.');
  if (parts.length !== 4) return { ok: false, msg: 'An IPv4 address needs exactly four octets separated by dots.' };
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { ok: false, msg: `“${p}” is not a number (digits only).` };
    if (p.length > 1 && p[0] === '0') return { ok: false, msg: `“${p}” has a leading zero, which is ambiguous; write it without leading zeros.` };
    if (+p > 255) return { ok: false, msg: `${p} is out of range; each octet must be 0–255.` };
  }
  const n = parts.map(Number);
  const bin = n.map(x => x.toString(2).padStart(8, '0'));
  const f = n[0];
  const cls = f < 128 ? 'A' : f < 192 ? 'B' : f < 224 ? 'C' : f < 240 ? 'D' : 'E';
  const rule = { A: 'first bit 0 · first byte 0–127', B: 'first bits 10 · first byte 128–191', C: 'first bits 110 · first byte 192–223', D: 'first bits 1110 · first byte 224–239', E: 'first bits 1111 · first byte 240–255' }[cls];
  return { ok: true, n, bin, cls, rule };
}
(function calc() {
  const inp = $('#ipInput'), out = $('#ipOut');
  function run() {
    const r = analyseIPv4(inp.value);
    if (!r.ok) { out.innerHTML = `<b class="err">Invalid</b> — ${esc(r.msg)}`; return; }
    out.innerHTML = `<b class="ok">Valid IPv4 address</b> (32 bits)<br>
      Dotted decimal: <span class="bits">${r.n.join('.')}</span><br>
      Binary: <span class="bits">${r.bin.map((b, i) => i === 0 ? `<i>${b}</i>` : b).join('.')}</span><br>
      Traditional class: <b>Class ${r.cls}</b> (${r.rule})`;
  }
  $('#ipBtn').addEventListener('click', run);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  run();
})();

/* ===== C. Dijkstra routing simulator ===== */
(function dijkstra() {
  const svg = $('#graphSvg');
  const nodes = { A: [70, 160], B: [230, 60], C: [230, 260], D: [430, 60], E: [430, 260], F: [650, 160] };
  const edges = [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'E', 9], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3]];
  const adj = {}; Object.keys(nodes).forEach(k => adj[k] = []);
  edges.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
  const eEls = {}, nEls = {};
  edges.forEach(([a, b, w]) => {
    const [x1, y1] = nodes[a], [x2, y2] = nodes[b];
    eEls[a + b] = eEls[b + a] = svgEl('line', { x1, y1, x2, y2, class: 'g-edge' }, svg);
  });
  edges.forEach(([a, b, w]) => {
    const [x1, y1] = nodes[a], [x2, y2] = nodes[b];
    svgEl('rect', { x: (x1 + x2) / 2 - 12, y: (y1 + y2) / 2 - 11, width: 24, height: 20, rx: 6, fill: '#0a1124' }, svg);
    svgEl('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 5, class: 'g-w' }, svg).textContent = w;
  });
  for (const k in nodes) {
    const g = svgEl('g', { class: 'g-node' }, svg); nEls[k] = g;
    svgEl('circle', { cx: nodes[k][0], cy: nodes[k][1], r: 22 }, g);
    svgEl('text', { x: nodes[k][0], y: nodes[k][1] + 5 }, g).textContent = k;
  }
  const src = $('#srcSel'), dst = $('#dstSel');
  Object.keys(nodes).forEach(k => { src.add(new Option(k, k)); dst.add(new Option(k, k)); });
  src.value = 'A'; dst.value = 'F';
  const res = $('#dijResult'), logEl = $('#dijLog');
  function run() {
    const s = src.value, d = dst.value;
    Object.values(eEls).forEach(e => e.classList.remove('path'));
    Object.values(nEls).forEach(n => n.classList.remove('path'));
    logEl.innerHTML = '';
    const dist = {}, prev = {}, done = new Set();
    Object.keys(nodes).forEach(k => dist[k] = Infinity); dist[s] = 0;
    const note = t => { const li = document.createElement('li'); li.textContent = t; logEl.appendChild(li); };
    while (done.size < Object.keys(nodes).length) {
      let u = null;
      for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || dist[u] === Infinity) break;
      done.add(u); note(`Settle ${u} (cost ${dist[u]}).`);
      adj[u].forEach(([v, w]) => {
        if (!done.has(v) && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; note(`  Relax ${u}→${v}: new best cost to ${v} = ${dist[v]}.`); }
      });
      if (u === d) break;
    }
    if (s === d) { res.innerHTML = `Source and destination are the same node (cost 0).`; nEls[s].classList.add('path'); return; }
    if (dist[d] === Infinity) { res.innerHTML = '<span class="err">No path found.</span>'; return; }
    const path = []; for (let v = d; v !== undefined; v = prev[v]) path.unshift(v);
    path.forEach((v, i) => { nEls[v].classList.add('path'); if (i) eEls[path[i - 1] + v].classList.add('path'); });
    res.innerHTML = `<b>Shortest path ${s} → ${d}:</b> ${path.join(' → ')} · total cost <b class="ok">${dist[d]}</b>`;
  }
  $('#runBtn').addEventListener('click', run);
  src.addEventListener('change', run); dst.addEventListener('change', run);
})();

/* ===== F. Glossary with search ===== */
const GLOSS = [
  ['Autonomous system', 'Network under one administration.'],
  ['BGP', 'Path-vector routing between autonomous systems.'],
  ['Datagram', 'Individually routed packet.'],
  ['Hop count', 'Routers crossed; RIP’s metric.'],
  ['ICMP', 'Error and diagnostic messages for IP.'],
  ['LSA', 'Link-state advertisement of a router’s links.'],
  ['OSPF', 'Link-state protocol inside an AS.'],
  ['RIP', 'Distance-vector protocol using hop count.'],
  ['TTL', 'Hop limit preventing loops.'],
  ['Virtual circuit', 'Logical path with reserved resources.']
];
(function glossary() {
  const list = $('#glossList'), q = $('#glossSearch'), empty = $('#glossEmpty');
  GLOSS.sort((a, b) => a[0].localeCompare(b[0])).forEach(([t, d]) => {
    const det = document.createElement('details');
    det.innerHTML = `<summary>${esc(t)}</summary><p>${esc(d)}</p>`;
    det.dataset.text = (t + ' ' + d).toLowerCase(); list.appendChild(det);
  });
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase(); let n = 0;
    $$('details', list).forEach(d => { const m = !v || d.dataset.text.includes(v); d.hidden = !m; if (m) n++; if (v && m) d.open = true; else if (!v) d.open = false; });
    empty.hidden = n > 0;
  });
})();

/* =====================================================================
   VISUAL POLISH LAYER (additive)
   ===================================================================== */
(function polish() {
  /* Ambient fixed background: drifting grid + blurred glow orbs */
  const amb = document.createElement('div');
  amb.id = 'ambient'; amb.setAttribute('aria-hidden', 'true');
  amb.innerHTML = '<div class="grid"></div><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>';
  document.body.prepend(amb);
  const orbs = $$('.orb', amb);
  addEventListener('scroll', () => {
    const y = scrollY; orbs.forEach((o, i) => o.style.marginTop = (y * (.05 + i * .03)) % 300 + 'px');
  }, { passive: true });

  /* Hero extras: orbit rings, cursor glow, scroll cue */
  const hero = $('#hero');
  ['r1', 'r2'].forEach(c => { const d = document.createElement('div'); d.className = 'ring ' + c; hero.appendChild(d); });
  const glow = document.createElement('div'); glow.className = 'glow-follow'; hero.appendChild(glow);
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); glow.style.left = (e.clientX - r.left) + 'px'; glow.style.top = (e.clientY - r.top) + 'px'; });
  const cue = document.createElement('div'); cue.className = 'scroll-cue'; hero.appendChild(cue);

  /* Staggered reveal for headings, paragraphs and list points */
  const targets = $$('main h2, main h3, .article > p, .article li, .wrap > .lead, .toc-grid li, .gloss details')
    .filter(el => !el.closest('.card, .panel, table'));
  const io2 = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  targets.forEach(el => {
    if (!io2) return;
    const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.setProperty('--d', Math.min(sib, 8) * 0.06 + 's');
    el.classList.add('rv'); io2.observe(el);
  });

  /* Back-to-top button */
  const up = document.createElement('button');
  up.id = 'toTop'; up.type = 'button'; up.setAttribute('aria-label', 'Back to top'); up.textContent = '↑';
  up.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(up);
  addEventListener('scroll', () => up.classList.toggle('show', scrollY > 700), { passive: true });
})();

/* ===== Site-wide animated network background (fixed canvas behind all sections) ===== */
(function siteBg() {
  const c = document.createElement('canvas');
  c.id = 'netbg'; c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, pts = [], pk = [];
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.max(30, Math.min(75, Math.floor(w * h / 22000)));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: 1.5 + Math.random() * 1.8 }));
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    const D = 160;
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; });
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < D) { ctx.strokeStyle = `rgba(59,130,246,${(1 - d / D) * .4})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    pts.forEach(p => { ctx.fillStyle = 'rgba(34,211,238,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); });
    if (Math.random() < .07) {
      const a = pts[Math.floor(Math.random() * pts.length)];
      const nb = pts.filter(q => q !== a && Math.hypot(a.x - q.x, a.y - q.y) < D);
      if (nb.length) pk.push({ a, b: nb[Math.floor(Math.random() * nb.length)], t: 0 });
    }
    pk = pk.filter(p => p.t < 1);
    pk.forEach(p => { p.t += .02; ctx.fillStyle = '#a78bfa'; ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
    if (!reduce) requestAnimationFrame(frame);
  }
  size(); frame(); addEventListener('resize', size);
})();
