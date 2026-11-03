// OFFLINE RENDER (3 Nov 2026). check.mjs's DOM stubs, the real jsPDF from the CRM's node_modules, a stubbed CRM lines
// feed with a mixed production job (seating and furniture) and a seating-only one. Verify any sheet change here, never
// from the code alone (production-sheet-attach memory).
//   node render.mjs            -> both jobs' production pages into render-out.pdf
//   node render.mjs pm1        -> the mixed job only
//   node render.mjs editor     -> opens the mixed job's editor and prints the Which workshop box state
import fs from 'fs';
import { createRequire } from 'module';
const D = process.env.D || new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const OUT = process.env.OUT || D + '/render-out.pdf';   // git-ignored
const require = createRequire(D + '/../coggin-sos-crm/package.json');   // the real jsPDF lives in the CRM's node_modules
const { jsPDF } = require('jspdf/dist/jspdf.node.js');

const html = fs.readFileSync(D + '/scheduler.html', 'utf8');
const shared = fs.readFileSync(D + '/shared.js', 'utf8');
const scripts = [shared, ...[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((b) => !/document\.write/.test(b))];
const check = fs.readFileSync(D + '/check.mjs', 'utf8');
const domSnippet = check.slice(check.indexOf('function mk(tag)'), check.indexOf('const lists='));
const { reg, body, mk } = new Function('global', domSnippet + '\nreturn {reg,body,mk};')(global);
// the prep grid is a <table>: give the stub insertRow / insertCell
const mk2 = (t) => { const n = mk(t); n.insertRow = () => { const r = mk2('tr'); n.appendChild(r); return r; }; n.insertCell = () => { const c = mk2('td'); n.appendChild(c); return c; }; return n; };
global.document.createElement = mk2;

const lists = [{ id: 'l1', name: 'Workshop Jobs - Not Started' }, { id: 'l2', name: 'Removals / Recycling / Skips / Stock / Plastic' }, { id: 'l3', name: 'Holidays / Leave' }, { id: 'l5', name: 'Workshop Jobs - Ready for Delivery / Collection' }];
const cards = [
  { id: 'm1', name: 'Manchester - AB12CM - Example Property Ltd - 111385', idList: 'l1', due: '2026-11-04T12:00:00.000Z', start: null, labels: [{ name: 'Resale - Delivery/Installation' }], members: [], desc: '**Parts**\nProduction: yes\nSite: yes\nTransport: our van\nLabour: no', customFieldItems: [] },
  { id: 'm2', name: 'Leeds - AB12CN - Example Ltd - 11053590', idList: 'l1', due: '2026-11-04T12:00:00.000Z', start: null, labels: [{ name: 'Resale - Delivery/Installation' }], members: [], desc: '**Parts**\nProduction: yes\nSite: yes\nTransport: our van\nLabour: no', customFieldItems: [] },
];
const plans = {
  m1: { who: [], prep: { who: ['Jack C', 'Jordan I', 'Bart H'], mins: 465, start: '2026-11-03', date: '2026-11-03', shop: { 'Jack C': 'seating', 'Jordan I': 'furniture' }, grid: { 'Jack C': { '2026-11-03': 465 }, 'Jordan I': { '2026-11-03': 465 }, 'Bart H': { '2026-11-03': 465 } } } },
  m2: { who: [], prep: { who: ['Jordan I'], mins: 90, start: '2026-11-03', date: '2026-11-03', grid: { 'Jordan I': { '2026-11-03': 90 } } } },
};
const L = (section, name, qty, sku, loc, extra) => Object.assign({ section, name, qty, headerCustomer: String(qty), sku, stock_location: loc, product_photo: '', storage_photo: '', tick_labels: [] }, extra || {});
const lines = {
  m1: { picks: false, ref: '111385', lines: [
    L('desks', 'Cantilever Desk | 1400x780mm | Off-White', 10, 'DSK00027', 'Unit 5', { attr_colour: 'Top: Off-White · Edge: Off-White · Legs: Grey', attr_dims: 'W1400 × D780mm' }),
    L('seating', 'Triumph Mesh-back Task Chair | Black', 10, 'MSH00062', 'Unit 8', { attr_colour: 'Seat: Black · Back: Black', attr_features: 'Mesh back · Adjustable arms', attr_other: 'Bases need changing to black' }),
    L('seating', 'Breakout Chair | Light Grey', 2, 'SFT00039', 'Above Showroom', { attr_colour: 'Seat: Light Grey · Back: Light Grey' }),
    L('other', 'Cable tray kit', 1, 'SPR00112', 'Stores', { label: 'Made to order, not from stock' }),
  ] },
  m2: { picks: false, ref: '11053590', lines: [L('seating', 'Senator Evolve Mesh Task Chair | Black', 23, 'MSH00063', 'Unit 8', { attr_colour: 'Seat: Inloom Bondai (Black)', attr_other: 'Back: Keep original' })] },
};
global.fetch = (url, opts) => {
  if (/pickingSheets/.test(String(url))) { const b = JSON.parse(opts.body); const out = b.action === 'lines' ? { ok: true, lines } : b.action === 'photos' ? { ok: true, items: {} } : { ok: false }; return Promise.resolve({ ok: true, json: () => Promise.resolve(out), text: () => Promise.resolve('') }); }
  return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null), text: () => Promise.resolve('') });
};
global.window = { __TODAY: '2026-11-03T08:00', jspdf: { jsPDF }, TrelloPowerUp: { iframe() { return {
  lists: () => Promise.resolve(lists), cards: () => Promise.resolve(cards), board: () => Promise.resolve({ name: 'Jobs - Planning Board', members: [] }),
  get: (a, b, c, d) => Promise.resolve(a === 'board' && c === 'sched' ? { crmKey: 'test-key' } : (plans[a] && c === 'sched') ? JSON.parse(JSON.stringify(plans[a])) : d),
  set: () => Promise.resolve(), closeModal() {} }; } } };
global.TrelloPowerUp = global.window.TrelloPowerUp;
global.alert = (m) => console.log('ALERT', m);
global.location = { reload() {}, href: '' };
global.URL = { createObjectURL: () => 'blob:', revokeObjectURL() {} };
global.Image = function () {};
let code = scripts.join('\n');
try { new Function(code)(); } catch (e) { console.log('SYNC THROW', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }
process.on('unhandledRejection', (e) => console.log('REJECT', e.stack.split('\n').slice(0, 4).join('\n')));
setTimeout(async () => {
  if (process.argv[2] === 'editor') {
    const walk = (n, o = []) => { o.push(n); (n.children || []).forEach((c) => walk(c, o)); return o; };
    const txt = (n) => walk(n).map((x) => x.textContent).filter(Boolean).join(' ');
    const card = walk(reg['#board']).find((n) => /^card\b/.test(n.className || '') && /AB12CM/.test(txt(n)));
    if (!card) { const cs = walk(reg['#board']).filter((n) => /card/.test(n.className || '')); console.log('card not on the board; board title:', reg['#title'] && reg['#title'].textContent, '| card-ish nodes:', cs.length, cs.slice(0, 6).map((n) => n.className + ' :: ' + txt(n).slice(0, 70)).join(' || ')); process.exit(1); }
    card.onclick();
    await new Promise((r) => setTimeout(r, 2500)); console.log("has Which workshop:", txt(body.children.filter((n) => n.className === "veil").pop()).includes("Which workshop"), "| veils:", body.children.filter((n) => n.className === "veil").length);
    const veil = body.children.filter((n) => n.className === 'veil').pop();
    const T = txt(veil);
    const i = T.indexOf('Operatives'); console.log('has Operatives:', i >= 0, '| has Jack row:', /Jack C/.test(T), '| text from Operatives:', T.slice(i, i + 700));
    const segs = walk(veil).filter((n) => n.className === 'seg two' && n.children.length === 2 && /Seating/.test(n.children[0].textContent));
    console.log('workshop rows:', segs.length, '| on states:', segs.map((s) => s.children.map((b) => b.className).join('/')).join(' , '));
    console.log('pill:', walk(veil).filter((n) => /rpill/.test(n.className)).map((n) => n.className + ' = ' + n.textContent).join(' ; '));
    if (segs[2]) { segs[2].children[1].onclick(); await new Promise((r) => setTimeout(r, 200)); const v2 = body.children.filter((n) => n.className === 'veil').pop(); console.log('after placing Bart on furniture:', walk(v2).filter((n) => /rpill/.test(n.className)).map((n) => n.textContent).join(' ; ')); }
    process.exit(0);
  }
  try {
    const only = process.argv[2] ? process.argv[2].split(',') : ['pm1', 'pm2'];
    const r = await global.window.__daySheetBuild('2026-11-03', only);
    if (!r || !r.jobOnly) { console.log('no job pages', r && Object.keys(r)); return; }
    fs.writeFileSync(OUT, Buffer.from(r.doc.output('arraybuffer')));
    console.log('pages', r.doc.getNumberOfPages(), 'written', OUT);
  } catch (e) { console.log('BUILD THROW', e.stack.split('\n').slice(0, 6).join('\n')); }
  process.exit(0);
}, 600);
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 60000);
