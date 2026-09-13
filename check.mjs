import fs from 'fs';
const html=fs.readFileSync(process.env.D+'/scheduler.html','utf8');
const shared=fs.readFileSync(process.env.D+'/shared.js','utf8'); const scripts=[shared,...[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(b=>!/document\.write/.test(b))];
function mk(tag){ return { tag, dataset:{}, querySelector(){return null;}, querySelectorAll(){return [];}, scrollTop:0, className:'', textContent:'', children:[], style:{}, value:'', hidden:false, parentNode:null, classList:{add(){},contains(){return false;}}, appendChild(c){c.parentNode=this;this.children.push(c);return c;}, removeChild(c){this.children=this.children.filter(x=>x!==c);}, setAttribute(){}, set innerHTML(v){this.children=[];}, get innerHTML(){return '';} }; }
const reg={}; const body=mk('body'); global.document={ body, createElement:mk, createTextNode:t=>({tag:'#text',textContent:String(t),children:[]}), querySelector:s=>s==='.veil'?null:(reg[s]||(reg[s]=mk('div'))) };
const lists=[{id:'l1',name:'Workshop Jobs - Not Started'},{id:'l2',name:'Removals / Recycling / Skips / Stock / Plastic'},{id:'l3',name:'Holidays / Leave'}];
const cards=[{id:'c1',name:'Skipton - C4B36B - Harrison Drury',idList:'l1',due:'2026-09-15T12:00:00.000Z',start:null,labels:[{name:'Delivery/Installation'}],members:[{fullName:'Bart H'}],desc:'x',customFieldItems:[]},
             {id:'c2',name:'Blackpool - 5FAEDC - James Knowles',idList:'l2',due:'2026-09-14T12:00:00.000Z',labels:[{name:'Removal Job'}],members:[],desc:'**Clearance Details**\n\n**Job**\nRef: **5FAEDC**\n\n**Site Contact**\nMichael Knowles \u2014 **07946508174**\n\n**Collection Address**\n**20 Dickson Road, Blackpool, FY1 2AE**\n\n**Items to Clear**\n{"metal\\_filing\\_cabinets":5}\n\n**Sign-off link:** [Open the sign-off form](https://x.y/z)'},
             {id:'c3',name:'Rob (Annual Leave)',idList:'l3',due:'2026-09-18T12:00:00.000Z',labels:[],members:[]}];
global.window={__TODAY:'2026-09-14T12:00',TrelloPowerUp:{iframe(){return { lists:()=>Promise.resolve(lists), cards:()=>Promise.resolve(cards), board:()=>Promise.resolve({name:'Jobs - Planning Board',members:[]}), get:(a,b,c,d)=>Promise.resolve(d), set:()=>Promise.resolve() };}}};
global.TrelloPowerUp=global.window.TrelloPowerUp;
try{ new Function(scripts.join('\n'))(); }catch(e){ console.log('SYNC THROW',e.stack.split('\n').slice(0,3).join('\n')); }
setTimeout(()=>{ console.log('src:',reg['#src'].textContent); console.log('title:',reg['#title'].textContent); },200);
process.on('unhandledRejection',e=>console.log('REJECT',e.stack.split('\n').slice(0,4).join('\n')));
setTimeout(()=>{ const walk=(n,o=[])=>{o.push(n);(n.children||[]).forEach(c=>walk(c,o));return o;}; const T=walk(reg['#board']).map(x=>x.textContent).filter(Boolean).join(' '); console.log('board has Skipton:',/Skipton/.test(T),'Knowles:',/Knowles/.test(T),'Rob leave:',/Rob on leave/.test(T)); },300);

setTimeout(()=>{ const c=[...(function walk(n,o=[]){o.push(n);(n.children||[]).forEach(x=>walk(x,o));return o;})(reg['#board'])].find(n=>n.className==='card'&&/Knowles/.test((function T(n){return (function walk(n,o=[]){o.push(n);(n.children||[]).forEach(x=>walk(x,o));return o;})(n).map(x=>x.textContent).join(' ');})(n))); c.onclick();
  const v=body.children.find(n=>n.className==='veil'); const T=(function walk(n,o=[]){o.push(n);(n.children||[]).forEach(x=>walk(x,o));return o;})(v).map(x=>x.textContent).filter(Boolean).join(' ');
  console.log('clean contact:',/Contact Michael Knowles,\s+07946508174/.test(T),'| items:',/Items \(1\) 5 x Metal filing cabinets/.test(T),'| no ** left:',!/\*\*|\\_|Sign-off/.test(T)); },400);
setTimeout(()=>{ const walk=(n,o=[])=>{o.push(n);(n.children||[]).forEach(c=>walk(c,o));return o;}; const T=walk(reg['#board']).map(x=>x.textContent).filter(Boolean).join(' '); console.log('production due shown:',/Skipton - Harrison Drury .*Production due Fri 11 Sep/.test(T)); },500);
