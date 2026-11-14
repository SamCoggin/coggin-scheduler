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

// THE SAVE RULES (14 Nov 2026). node check-save.mjs
//   1. loading the board, or saving with nothing changed, writes no card
//   2. a save writes only the job this screen changed
//   3. a job changed on another screen since this one read it is not overwritten
//   4. this screen's own second save of the same job goes through
//   5. an out-of-date screen writes nothing and says so
const store = JSON.parse(JSON.stringify(plans)); const log = []; const alerts = [];
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
global.window = { __TODAY: '2026-11-03T08:00', jspdf: { jsPDF }, TrelloPowerUp: { iframe() { return {
  lists: () => Promise.resolve(lists), cards: () => Promise.resolve(cards), board: () => Promise.resolve({ name: 'Jobs - Planning Board', members: [] }),
  member: () => Promise.resolve({ fullName: 'Sam Example' }),
  get: (a, b, c, d) => Promise.resolve(a === 'board' && c === 'sched' ? { crmKey: '' } : (store[a] && c === 'sched') ? clone(store[a]) : d),
  set: (a, b, c, v) => { if (c === 'sched' && a !== 'board') { store[a] = clone(v); log.push(a); } return Promise.resolve(); }, closeModal() {} }; } } };
global.TrelloPowerUp = global.window.TrelloPowerUp;
global.alert = (m) => alerts.push(String(m));
global.document.visibilityState = 'visible';   // the refresh after a conflict runs as an automatic one, which only runs on a visible tab
global.location = { reload() {}, href: '', search: '' };
global.URL = { createObjectURL: () => 'blob:', revokeObjectURL() {} };
global.Image = function () {};
try { new Function(scripts.join('\n'))(); } catch (e) { console.log('SYNC THROW', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }
process.on('unhandledRejection', (e) => console.log('REJECT', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const ok = (name, cond, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : ' :: ' + (extra || ''))); if (!cond) fails++; };
(async () => {
  await wait(1200);
  const w = global.window.__saveApi; const api = { persist: w.persist, jobs: w.jobs, setOut: w.setOutdated }; const job = (id) => api.jobs().filter((j) => j.id === id)[0];
  ok('the board loaded both jobs', !!job('m1') && !!job('m2'));
  ok('1a. loading the board wrote no card', log.length === 0, log.join(','));
  api.persist(); await wait(300);
  ok('1b. a save with nothing changed wrote no card', log.length === 0, log.join(','));
  log.length = 0; job('m1').mins = 90; api.persist(); await wait(300);
  ok('2. only the changed job was written', log.join(',') === 'm1' && store.m1.mins === 90, log.join(',') + ' mins=' + (store.m1 && store.m1.mins));
  // another screen changes m2 after this one read it
  store.m2 = Object.assign(clone(store.m2), { qc: 'ok', savedBy: 'Someone Else', savedAt: '2026-11-03T09:00:00.000Z' });
  log.length = 0; job('m2').mins = 30; api.persist(); await wait(900);
  ok('3. the job changed elsewhere was not overwritten', log.indexOf('m2') < 0 && store.m2.qc === 'ok' && store.m2.savedBy === 'Someone Else', log.join(',') + ' ' + JSON.stringify(store.m2).slice(0, 160));
  ok('3b. their version was taken in', job('m2') && job('m2').mins !== 30, 'mins=' + (job('m2') && job('m2').mins));
  log.length = 0; job('m1').mins = 120; api.persist(); await wait(300);
  ok('4. this screen\'s own second save went through', log.join(',') === 'm1' && store.m1.mins === 120, log.join(',') + ' mins=' + store.m1.mins);
  api.setOut(true); log.length = 0; job('m1').mins = 150; api.persist(); await wait(300);
  ok('5. an out-of-date screen wrote nothing', log.length === 0 && store.m1.mins === 120, log.join(','));
  ok('5b. and said so once', alerts.filter((a) => /new version/i.test(a)).length === 1, alerts.join(' | '));
  api.persist(); await wait(100);
  ok('5c. only once', alerts.filter((a) => /new version/i.test(a)).length === 1);
  console.log(fails ? fails + ' FAILED' : 'check-save: all passed'); process.exit(fails ? 1 : 0);
})();
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 30000);
