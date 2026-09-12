import fs from 'fs';
const html=fs.readFileSync(process.env.D+'/scheduler.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function mk(tag){ return { tag, className:'', textContent:'', children:[], style:{}, value:'', hidden:false, parentNode:null, classList:{add(){},contains(){return false;}}, appendChild(c){c.parentNode=this;this.children.push(c);return c;}, removeChild(c){this.children=this.children.filter(x=>x!==c);}, setAttribute(){}, set innerHTML(v){this.children=[];}, get innerHTML(){return '';} }; }
const reg={}; const body=mk('body'); global.document={ body, createElement:mk, createTextNode:t=>({tag:'#text',textContent:String(t),children:[]}), querySelector:s=>s==='.veil'?null:(reg[s]||(reg[s]=mk('div'))) };
const lists=[{id:'l1',name:'Workshop Jobs - Not Started'},{id:'l2',name:'Removals / Recycling / Skips / Stock / Plastic'},{id:'l3',name:'Holidays / Leave'}];
const cards=[{id:'c1',name:'Skipton - C4B36B - Harrison Drury',idList:'l1',due:'2026-09-15T12:00:00.000Z',start:null,labels:[{name:'Delivery/Installation'}],members:[{fullName:'Bart H'}],desc:'x',customFieldItems:[]},
             {id:'c2',name:'Blackpool - 5FAEDC - James Knowles',idList:'l2',due:'2026-09-14T12:00:00.000Z',labels:[{name:'Removal Job'}],members:[],desc:''},
             {id:'c3',name:'Rob (Annual Leave)',idList:'l3',due:'2026-09-18T12:00:00.000Z',labels:[],members:[]}];
global.window={TrelloPowerUp:{iframe(){return { lists:()=>Promise.resolve(lists), cards:()=>Promise.resolve(cards), board:()=>Promise.resolve({name:'Jobs - Planning Board',members:[]}), get:(a,b,c,d)=>Promise.resolve(d), set:()=>Promise.resolve() };}}};
global.TrelloPowerUp=global.window.TrelloPowerUp;
try{ new Function(scripts.join('\n'))(); }catch(e){ console.log('SYNC THROW',e.stack.split('\n').slice(0,3).join('\n')); }
setTimeout(()=>{ console.log('src:',reg['#src'].textContent); console.log('title:',reg['#title'].textContent); },200);
process.on('unhandledRejection',e=>console.log('REJECT',e.stack.split('\n').slice(0,4).join('\n')));
setTimeout(()=>{ const walk=(n,o=[])=>{o.push(n);(n.children||[]).forEach(c=>walk(c,o));return o;}; const T=walk(reg['#board']).map(x=>x.textContent).filter(Boolean).join(' '); console.log('board has Skipton:',/Skipton/.test(T),'Knowles:',/Knowles/.test(T),'Rob leave:',/Rob on leave/.test(T)); },300);
