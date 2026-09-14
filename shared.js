// shared by the connector, the card back section and the scheduler
var CREW=["Jack","Jordan","Bart","Rob","Bradley"];
// only these three drive the van. the others go along as a second pair of hands.
var DRIVERS=["Rob","Jack","Bart"];
var CONTRACTORS=["MAK Installations","Courier","Other contractor"];
// ── the van and what goes on it ──
// the vans: two Renault Master 3.5 tonne Lutons (DVLA: FX75 BKG 2025, FX73 CWF 2024, revenue weight 3,500 kg).
// Renault quotes the Master Luton box at 4,100 x 2,070 x 2,200 mm inside, 18.7 cubic metres, payload up to about 1,200 kg
// before a tail lift and the crew. planning figures: 18.7 m3 and 1,000 kg.
var VAN_M3=18.7, VAN_KG=1000;
var VEHICLES=[{reg:"FX75 BKG",name:"Renault Master Luton FX75 BKG (2025)"},{reg:"FX73 CWF",name:"Renault Master Luton FX73 CWF (2024)"}];
// loaded volume (item plus the space around it on the van) and weight per product type.
// figures: removals trade lists and a council reuse dataset; rows marked est are estimates until the warehouse corrects them.
// small parts (arm pads, castors, gas lifts, spares) ride in the cab: 0.01 m3 and 1 kg each, one minute to hand over
// chairs are DOUBLE STACKED figures: 0.40 per swivel chair is Sam's "40 in a Luton", which only works stacked two high;
// loose meeting chairs (tub, cantilever) at 0.40 (about 45 a van, Sam corrected 0.20) and stacking chairs at 0.10 (stacks of five or six) assume the same.
var LOAD=[
  {t:"Swivel chair", prod:30, clean:10, min:3,     re:/swivel|task chair|operator|mesh chair|office chair|executive chair|ergonomic/i, m3:0.40, kg:12},
  {t:"Meeting chair, stacking", prod:10, min:1, re:/stack/i, m3:0.10, kg:8},
  {t:"Meeting chair", prod:10, clean:10, min:2,    re:/meeting chair|tub chair|cantilever|visitor chair|conference chair|dining chair|breakout chair/i, m3:0.40, kg:10},
  {t:"Stool", prod:10, min:2,            re:/stool/i, m3:0.15, kg:6},
  {t:"Sit-stand desk", prod:60, two:true, min:20,   re:/sit.?stand|height adjust|electric desk|rise/i, m3:0.30, kg:60, built:1.10, est:true},
  {t:"Bench desk position", prod:45, two:true, min:20, re:/bench/i, m3:0.30, kg:30, est:true},
  {t:"Desk", prod:45, two:true, min:15,             re:/desk(?!\s*(screen|divider|mounted|pedestal|drawer))|workstation/i, m3:0.25, kg:35, built:0.90, w:1600},
  {t:"Meeting table", prod:20, two:true, min:15,    re:/meeting table|boardroom|conference table|table \d{4}/i, m3:1.20, kg:50, w:1800},
  {t:"Folding table", prod:10, min:4,    re:/folding|flip.?top/i, m3:0.15, kg:20},
  {t:"Coffee table", prod:15, min:4,     re:/coffee table|side table|occasional/i, m3:0.30, kg:15},
  {t:"Pedestal", prod:15, min:3,         re:/pedestal|desk drawer|drawer unit|mobile drawer/i, m3:0.25, kg:20},
  {t:"Filing cabinet", prod:15, two:true, min:5,   re:/filing cab|filer/i, m3:0.50, kg:35},
  {t:"Cupboard or tambour", prod:15, two:true, min:8, re:/cupboard|tambour|wardrobe|storage unit|bookcase|shelving/i, m3:0.80, kg:60},
  {t:"Locker", prod:15, two:true, min:5,           re:/locker/i, m3:0.60, kg:40, est:true},
  {t:"Screen divider", prod:10, min:4,   re:/screen|divider|partition/i, m3:0.05, kg:5},
  {t:"Armchair", prod:30, clean:15, min:4,         re:/armchair|arm chair|lounge chair|easy chair/i, m3:0.60, kg:20, est:true},
  {t:"Sofa", prod:60, clean:30, two:true, min:8,             re:/sofa|settee|couch|modular/i, m3:1.80, kg:45, est:true},
  {t:"Booth", prod:60, two:true, min:30,            re:/booth|high.?back/i, m3:3.00, kg:90, est:true},
  {t:"Pod", prod:240, two:true, min:240,              re:/\bpod\b/i, m3:17, kg:400, est:true},
  {t:"Small part", prod:0,        min:1, re:/arm ?pads?|armrest|castors?|gas ?lift|seat pad|back pad|lumbar|headrest|spare|component|bracket|fixing|cable|key|lock|spanner|screws?|bolts?|monitor arm|cpu holder|small part|parcel|box of/i, m3:0.01, kg:1}
];
// prod = production minutes per item start to finish (pick, strip, clean, prep, upholster, assemble); clean = deep clean only, original fabric
// two = needs two operatives to carry safely
// min = handling minutes per item on site for a two person crew (carry in, place, assemble a flat desk); built desks carry in only
// "4 x Desk 1600 (built)" -> {n:4, type, m3, kg}
function matchLoad(line){
  var m=/^(\d+)\s*x\s*(.+)$/i.exec(line.trim()); if(!m) return null;
  var n=parseInt(m[1],10), name=m[2].trim(), row=null;
  for(var i=0;i<LOAD.length;i++){ if(LOAD[i].re.test(name)){ row=LOAD[i]; break; } }
  if(!row) return {n:n,name:name,type:null};
  var built=/\bbuilt\b|assembled|made up/i.test(name), each=row.built&&built?row.built:row.m3;
  if(row.w){ var wm=/\b(\d{3,4})\s*(?:x|mm|\b)/i.exec(name); if(wm){ var w=parseInt(wm[1],10); if(w>=600&&w<=4000) each=each*w/row.w; } }
  var hm=row.min||0; if(row.t==="Desk"&&built) hm=6; if(row.t==="Sit-stand desk"&&built) hm=8;
  var cleanOnly=row.clean!=null&&/original fabric|clean only|deep clean|as is|wipe/i.test(name), refurb=/refurb|re-?upholster|new fabric|recover/i.test(name);
  var pm=cleanOnly&&!refurb?row.clean:(row.prod||0);
  return {n:n,name:name,type:row.t,two:!!row.two,built:built,prod:pm*n,cleanOnly:cleanOnly&&!refurb,m3:Math.round(each*n*100)/100,kg:row.kg*n,min:hm*n,est:!!row.est};
}
function loadOf(items){
  var out={m3:0,kg:0,rows:[],unmatched:[]};
  out.min=0; out.prod=0; out.chairM3=0;
  (items||[]).forEach(function(l){ var r=matchLoad(l); if(!r) return; if(!r.type){ out.unmatched.push(l); return; } out.rows.push(r); out.m3+=r.m3; out.kg+=r.kg; out.min+=r.min||0; out.prod+=r.prod||0; if(/chair|stool/i.test(r.type)) out.chairM3+=r.m3; });
  out.m3=Math.round(out.m3*10)/10; out.any=out.rows.length>0||out.unmatched.length>0;
  // guardrail: if any line could not be matched there is no estimate at all. a partial total would mislead.
  out.complete=out.rows.length>0&&out.unmatched.length===0; return out;
}
// plural item names: "6 x Meeting chairs", never "6 x Meeting chair"
var PLURAL_SAME=/^(furniture|equipment|stock|shelving|seating|storage|glass|misc|sundries|waste|scrap|metal|plastic|cardboard|timber)$/i;
function pluralWord(w){ if(!w||PLURAL_SAME.test(w)||/s$/i.test(w)&&!/(ss|us)$/i.test(w)) return w; if(/(s|x|z|ch|sh)$/i.test(w)) return w+"es"; if(/[^aeiou]y$/i.test(w)) return w.slice(0,-1)+"ies"; if(/f$/i.test(w)&&!/(roof|proof|chief|belief)$/i.test(w)) return w.slice(0,-1)+"ves"; if(/fe$/i.test(w)) return w.slice(0,-2)+"ves"; return w+"s"; }
function pluralName(name){ var m=/^(.*?)(\s*\(.*\))?$/.exec(name), core=m[1], tail=m[2]||""; var parts=core.split(/\s+(or|and|\/|with)\s+/i); if(parts.length>1){ return parts.map(function(p,i){ return i%2?p:pluralName(p); }).join(" ")+tail; } var ws=core.split(/\s+/); var last=ws.length-1; if(/^\d+(mm|cm|m)?$/i.test(ws[last])&&last>0) last--; ws[last]=pluralWord(ws[last]); return ws.join(" ")+tail; }
function qty(n,name){ return n+" x "+(n>1?pluralName(name):name); }
function pluralLine(line){ var m=/^(\d+)\s*x\s+(.+)$/i.exec(String(line).trim()); if(!m) return line; var n=parseInt(m[1],10); return n>1?n+" x "+pluralName(m[2]):line; }
function fmtM3(v){ return v==null?"not set":(Math.round(v*10)/10)+" m\u00b3"; }
function fmtLoad(m3,kg){ if(m3==null) return "not set"; var s=fmtM3(m3)+" of "+VAN_M3; if(kg) s+=", "+Math.round(kg)+" kg of "+VAN_KG; return s; }

// ── reading the card description ──
var HEAD=[
  [/^(site contact|contact details|supplier details|seller contact|contact)$/i,"contact"],
  [/address|their site/i,"where"],
  [/^(items.*|load details|warranty\/job issue|deliver\/collect|additional items.*)$/i,"what"],
  [/^(access.*|logistics|safety.*)$/i,"access"],
  [/^subcontract work and materials$/i,"support"],
  [/^parts$/i,"parts"],
  [/^(job|ref|service|delivery details|clearance details|refurb collection details|buyback drop-off details|delivery info|other items|additional info)$/i,"skip"]
];
function cleanDesc(txt){
  txt=(txt||"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/\*\*/g,"").replace(/\\_/g,"_").replace(/[\u200c\u200b]/g,"").replace(/\s*\u2014\s*/g,", ").replace(/\s*\u00b7\s*/g,", ").replace(/\u00d7/g,"x").replace(/^\s*_+\s*$/gm,"");
  // the clearance form writes items as {"metal_filing_cabinets":5}: turn that into "5 x Metal filing cabinets"
  txt=txt.replace(/\{[^{}]*:\s*\d+[^{}]*\}/g,function(m){ try{ var o=JSON.parse(m); return Object.keys(o).map(function(k){ var n=k.replace(/_/g," "); return o[k]+" x "+n.charAt(0).toUpperCase()+n.slice(1); }).join("\n"); }catch(e){ return m; } });
  return txt.replace(/\n{3,}/g,"\n\n");
}
function parseDesc(txt){
  txt=cleanDesc(txt);
  var groups={contact:[],where:[],what:[],access:[],notes:[],support:[],parts:[]}, cur="notes";
  txt.split("\n").forEach(function(raw){
    var l=raw.replace(/^\s*[-*_]+\s*/,"").replace(/_+$/,"").trim(); if(!l) return;
    var bare=l.replace(/:$/,"").trim(), hit=null;
    if(bare.length<40 && !/\d/.test(bare)) HEAD.forEach(function(h){ if(!hit && h[0].test(bare)) hit=h[1]; });
    if(hit){ cur=hit==="skip"?(/^(other items|additional info|delivery info)$/i.test(bare)?"notes":cur):hit; if(/:$/.test(l)||hit==="skip"||bare===l) return; }
    if(/:$/.test(l)) return;                                              // a sub-heading with nothing on it
    if(/^(service|mode|method|collection date|ref):/i.test(l)) return;
    if(/sign-off|click here|attach photos|photo evidence|link this order|remove when created|^delivered|^collected|^tracking/i.test(l)) return;
    if(/^([^:]*:)?\s*(n\/a|none|-)\s*$/i.test(l)) return;
    var line=/^(name|phone|mobile number|site contact name|email|number):/i.test(l)?"contact":/^(address|postcode|delivery\/collection address|collection address|delivery address):/i.test(l)?"where":/^(access|floor|parking|stairs|lift|loading|distance|working hours|known hazards|security|rams|ppe|time restrictions|vehicle size|parking permits):/i.test(l)?"access":null;
    groups[line||cur].push(l.replace(/^(address|postcode|collection address|delivery address|delivery\/collection address|site contact name|name|mobile number|phone|number):\s*/i,""));
  });
  return groups;
}

// the items on a card: "N x thing" lines from the description and the product checklist
function itemsOf(desc,checks){
  var g=parseDesc(desc||""), items=g.what.filter(function(l){return /^\d+\s*x\s*/i.test(l);});
  (checks||[]).forEach(function(c){ var n=(c.n||"").replace(/\s*-\s*(above showroom|unit \d+|pending).*$/i,"").trim(); if(/^\d+\s*x\s*/i.test(n) && !/photo|label|sign-off/i.test(n) && items.indexOf(n)<0) items.push(n); });
  return items;
}

// the working week is 38 hours 45 minutes Monday to Friday: 7 hours 45 minutes a day
// (8am to 4:30pm with 30 minutes for lunch and a 15 minute break)
var WEEK_MINS=38*60+45, DAY_MINS=WEEK_MINS/5, DAY_H=DAY_MINS/60;
var QUICK=[[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"],[240,"Half day"],[DAY_MINS,"Full day"]];
var WORKSHOP_LISTS=/Workshop Jobs - (Not Started|In-progress)/;
var READY_LIST=/Workshop Jobs - Ready/;
// QC evidence is the card checklist (photos, labels): all items ticked
function qcDone(badges){ return !!(badges&&badges.checkItems>0&&badges.checkItemsChecked>=badges.checkItems); }
// ── one label that says both things (Sam, 14 Sep 2026: "Donation - Delivery... Resale - Courier and Resale - Sub-contractor") ──
// The CRM puts one label on every card, "Work - Movement", spelled exactly as the board spells it. The Scheduler
// reads WORK (what the job is) and MOVEMENT (which way the furniture travels) back out of that name. Courier and
// Sub-contractor say who carries it, so the movement for those follows the work: a resale goes out, a clearance
// comes in, a refurb goes both ways. The older names (two labels, and the board's original single labels) are
// still understood so nothing breaks on a card made before the switch.
var WORK_LABELS=["Resale","Refurb","Clearance","Recycling","Buyback","Donation","Warranty","Job Issue"];
var MOVEMENT_LABELS=["Delivery","Collection","Collect and Return","Customer Delivers","Customer Collects","Customer Delivers and Collects","Site Visit","Warehouse"];
var OLD_MOVEMENT={"delivery/installation":"Delivery","removal job":"Collection","collect & return":"Collect and Return","customer collecting":"Customer Collects","courier collecting":"Customer Collects","courier collects":"Customer Collects","recycling delivery":"Customer Delivers","new stock delivery":"Customer Delivers","stock delivery":"Customer Delivers","plastic delivery":"Customer Delivers","plastic collection":"Collection","skip exchange":"Warehouse","warehouse":"Warehouse","yard":"Warehouse","warranty/job issue":"Site Visit","donations":"Delivery","charity donation":"Delivery"};
var OLD_WORK={"delivery/installation":"Resale","removal job":"Clearance","collect & return":"Refurb","recycling delivery":"Recycling","new stock delivery":"Buyback","stock delivery":"Buyback","plastic delivery":"Recycling","plastic collection":"Recycling","skip exchange":"Recycling","warranty/job issue":"Warranty","donations":"Donation","charity donation":"Donation"};
// the movement half of a combined label, by the words after the dash
var COMBINED_MOVE={"delivery/installation":"Delivery","delivery":"Delivery","redelivery":"Delivery","customer collects":"Customer Collects","collect & return":"Collect and Return","customer drops off":"Customer Delivers and Collects","on site":"Site Visit","site visit":"Site Visit","we collect":"Collection","collection":"Collection","customer delivers":"Customer Delivers","seller delivers":"Customer Delivers"};
// who carries it: for those the movement follows the work
var CARRIER_MOVE={"Resale":"Delivery","Refurb":"Collect and Return","Clearance":"Collection","Recycling":"Customer Delivers","Buyback":"Collection","Donation":"Delivery","Warranty":"Site Visit","Job Issue":"Site Visit"};
function splitLabel(name){ var i=String(name||"").indexOf(" - "); if(i<0) return null; var w=name.slice(0,i).trim(), m=name.slice(i+3).trim(); if(WORK_LABELS.indexOf(w)<0) return null; return {work:w,move:m}; }
function combinedMovement(name){ var p=splitLabel(name); if(!p) return ""; var k=p.move.toLowerCase(); if(k==="courier"||k==="sub-contractor") return CARRIER_MOVE[p.work]||""; return COMBINED_MOVE[k]||""; }
function combinedWork(name){ var p=splitLabel(name); return p?p.work:""; }
// Courier or Sub-contractor on the label: who the card says is carrying it, "" when it is our crew
function carrierOf(labels){ var n=labelNames(labels); for(var i=0;i<n.length;i++){ var p=splitLabel(n[i]); if(p&&/^(courier|sub-contractor)$/i.test(p.move)) return p.move; } return ""; }
function labelNames(labels){ return (labels||[]).map(function(l){return typeof l==="string"?l:(l&&l.name)||"";}).filter(Boolean); }
function movementOf(labels){ var n=labelNames(labels); for(var c=0;c<n.length;c++){ var cm=combinedMovement(n[c]); if(cm) return cm; } for(var i=0;i<n.length;i++){ if(MOVEMENT_LABELS.indexOf(n[i])>=0) return n[i]; } for(var k=0;k<n.length;k++){ var m=OLD_MOVEMENT[n[k].toLowerCase()]; if(m) return m; } return ""; }
function workOf(labels){ var n=labelNames(labels); for(var c=0;c<n.length;c++){ var cw=combinedWork(n[c]); if(cw) return cw; } for(var i=0;i<n.length;i++){ if(WORK_LABELS.indexOf(n[i])>=0) return n[i]; } for(var k=0;k<n.length;k++){ var w=OLD_WORK[n[k].toLowerCase()]; if(w) return w; } return ""; }
// our van goes out: the transport movements
function isSiteMove(mv){ return mv==="Delivery"||mv==="Collection"||mv==="Collect and Return"||mv==="Site Visit"; }
// they come to Forton: loading only, no van of ours
function isCollectMove(mv){ return mv==="Customer Collects"||mv==="Customer Delivers and Collects"; }
function isSiteLabels(labels){ return isSiteMove(movementOf(labels)); }
function isCollectLabels(labels){ return isCollectMove(movementOf(labels)); }
// kept for the old callers
var SITE_LABELS={ test:function(name){ return isSiteMove(movementOf([name])); } };
// OPERATIVES BECOME MEMBERS OF THE CARD (Sam, 14 Sep 2026: the crew use the Trello app, where only what is
// native to the card shows, and they want the headshot of whoever is on the job). Whenever a plan is saved the
// CRM's Trello connection is asked to set the card's crew members to the assigned operatives, transport and
// production together. Anyone on the card who is not crew is left alone. Needs the CRM key from the Manager view.
var CRM_MEMBERS_URL="https://coggin-sos-os.base44.app/api/apps/69c930a6240fba922f369aa2/functions/trelloSyncMembers";
var _memberSync={};
// The members follow the stage (Sam, 14 Sep 2026: "why is Bart's headshot showing when he is just for transport
// and it is still in progress?"): in a workshop list the card shows the production operatives, anywhere else the
// transport operatives. The Scheduler re-sends every open, so a card moved to Ready swaps faces on its own.
function syncCardMembers(cardId,plan,crmKey,inWorkshop){
  if(!cardId||!crmKey) return;
  var pick=inWorkshop?((plan&&plan.prep&&plan.prep.who)||[]):((plan&&plan.who)||[]);
  var names=pick.filter(function(n,i,a){return CREW.indexOf(n)>=0&&a.indexOf(n)===i;});
  var key=names.slice().sort().join(",");
  if(_memberSync[cardId]===key) return; _memberSync[cardId]=key;
  try{ fetch(CRM_MEMBERS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:crmKey,card_id:cardId,names:names,crew:CREW})}).catch(function(){}); }catch(e){}
}
function fmt(m){ if(m==null) return ""; if(m<60) return m+" min"; var h=Math.floor(m/60), r=m%60; return h+"h"+(r?" "+r+"m":""); }
// what the front of the card says, from the saved plan
function badgeText(d,site){
  d=d||{};
  var who=d.who||[];
  if(d.contractor&&!who.length) return {text:(/courier/i.test(d.contractor)?"Courier: ":"Subcontractor: ")+d.contractor,color:"purple"};
  if(!who.length) return {text:(site?"Transport: ":"")+"Unassigned",color:"yellow"};
  var missing=[];
  if(site&&d.drive==null) missing.push("no travel time");
  if(d.mins==null) missing.push(site?"no site time":"no time");
  if(missing.length) return {text:(site?"Transport: ":"")+who.join(", ")+": "+missing.join(", "),color:"yellow"};
  return {text:(site?"Transport: ":"")+who.join(", ")+": "+(site&&d.drive?fmt(d.drive)+" travel + ":"")+fmt(d.mins)+(who.length>1?" each":""),color:"green"};
}

// badge for the production (workshop) part of a workshop-stage card
function prodBadgeText(d,long){
  var p=d&&d.prep; if(!p||!p.date) return {text:"Production: not scheduled",color:"yellow"};
  var who=p.who||[]; var days=p.start&&p.start!==p.date?niceShort(p.start)+" to "+niceShort(p.date):niceShort(p.date);
  var lead=long?"Production "+days+": ":"Production: ";
  if(!who.length) return {text:lead+"unassigned",color:"yellow"};
  if(p.mins==null) return {text:lead+who.join(", ")+", no time",color:"yellow"};
  return {text:lead+who.join(", ")+", "+fmt(p.mins)+(who.length>1?" each":""),color:"blue"};
}
// short badges for the card front: Trello clips badge text at about 30 characters
function frontBadges(d,site){
  var who=(d&&d.who)||[], out=[];
  if(d&&d.contractor&&!who.length) return [badgeText(d,site)];
  if(!who.length) return [{text:(site?"Transport: ":"")+"Unassigned",color:"yellow"}];
  var tag=site?"Transport: ":"";
  out.push({text:tag+who.join(", ")+(d.mins==null?", no time":", "+fmt(d.mins)+(who.length>1?" each":"")),color:d.mins==null?"yellow":"green"});
  if(site) out.push(d.drive==null?{text:"No travel time",color:"yellow"}:{text:"Travel "+fmt(d.drive)+" return",color:"green"});
  return out;
}

// production is due this many working days before the delivery date unless
// the card's Production Due Date field says otherwise
var PRODUCTION_BUFFER_DAYS=2;
function workingDaysBefore(iso,n){ var d=new Date(iso+"T12:00"); var left=n; while(left>0){ d.setDate(d.getDate()-1); if(d.getDay()!==0&&d.getDay()!==6) left--; } return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function productionDue(readyBy,due){ if(readyBy) return readyBy; if(!due) return null; return workingDaysBefore(due,PRODUCTION_BUFFER_DAYS); }

var MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DAY_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function niceShort(iso){ var d=new Date(iso+"T12:00"); return DAY_SHORT[d.getDay()]+" "+d.getDate()+" "+MON_SHORT[d.getMonth()]; }
function todayIso(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

// ── standards: how many operatives a job type needs and how long it should take ──
// crew is the standard crew. base is minutes on site before the items (park, meet the contact, sign off).
// site time per operative = (base + handling minutes for the items) / crew. fixed jobs have mins instead.
var STANDARD=[
  {re:/skip exchange/i,            crew:1, mins:20},
  {re:/^(warehouse|yard) (load|unload)$/i, crew:2, base:15},
  {re:/^(warehouse|yard)$/i,        crew:2, mins:60},
  {re:/customer delivers$/i,       crew:2, mins:60},
  {re:/site visit/i,               crew:1, mins:45},
  {re:/customer collects|customer delivers and collects/i, crew:1, base:10},
  {re:/^delivery$/i,               crew:2, base:20},
  {re:/collect and return/i,       crew:2, base:20},
  {re:/^collection$/i,             crew:2, base:30}
];
// label + the job's load -> {crew, mins per operative, why}. null when there is no standard for that label
function standardFor(label,load){
  // label may be a movement, an old board label, or a list of labels
  var mv=Array.isArray(label)?movementOf(label):(MOVEMENT_LABELS.indexOf(label)>=0?label:(movementOf([label])||label));
  if(/skip exchange/i.test(String(label))) mv="Skip Exchange";
  var st=null; for(var i=0;i<STANDARD.length;i++){ if(STANDARD[i].re.test(mv||"")){ st=STANDARD[i]; break; } }
  if(!st) return null;
  if(st.mins!=null) return {crew:st.crew,mins:st.mins,why:"A "+String(mv).toLowerCase()+" is a set "+fmt(st.mins)+" for "+st.crew+(st.crew===1?" operative":" operatives")+", whatever is on the card"};
  if(!load||!load.complete) return {crew:st.crew,mins:null,why:"The time comes from the items on the card, so add them first"};
  var crew=st.crew, big=load.m3>12||load.rows.some(function(r){return r.type==="Booth"||r.type==="Pod";});
  var twoHanded=load.rows.some(function(r){return r.two;}), small=load.m3<3&&!twoHanded;
  if(small) crew=1; if(big) crew+=1;
  var total=st.base+load.min, each=Math.ceil(total/crew/5)*5;
  var what=load.rows.map(function(r){return r.n+" "+r.type.toLowerCase()+(r.n>1?"s":"");}).join(", ");
  var warehouse=/^warehouse/i.test(String(mv)), unload=/unload/i.test(String(mv));
  var why=warehouse?(st.base+" minutes to set out and clear away, plus "+load.min+" minutes to "+(unload?"unload and put away ":"bring out and load ")+what+"."):(st.base+" minutes for parking, the contact and the sign off, plus "+load.min+" minutes to carry in and place "+what+".");
  why+=crew===1?" One operative can manage that alone, so "+Math.max(15,each)+" minutes.":" Shared between "+crew+" operatives that is "+Math.max(15,each)+" minutes each"+(big?". One extra operative because the load is big":(twoHanded?". Two because some items need two to carry":""))+".";
  return {crew:crew,mins:Math.max(15,each),why:why};
}
// allocated against standard: an amber flag when the crew or the time is well over
function aboveStandard(std,who,mins){
  if(!std) return null; var out=[];
  if(who&&who.length>std.crew) out.push((who.length)+" operatives, standard is "+std.crew);
  if(std.mins!=null&&mins!=null&&mins>std.mins*1.5) out.push(fmt(mins)+(who.length>1?" each":"")+", standard is "+fmt(std.mins));
  return out.length?out.join("; "):null;
}

// ── production standard: how long the workshop should take on the items ──
var PICK_BASE=15, PICK_EACH=2;   // minutes: pull the picking sheet and set up, then per item to find it and bring it to the bench
// the work is the total of the items. more operatives divide it, plus 10 percent handover when they share.
// crew: one operative up to 2 hours of work, two up to 12 hours, three beyond (refurb never needs more than three).
// daysAvail: working days there are to do it in (to the production due date). the crew is the fewest that finish in time, never more than three.
function prodStandardFor(load,crewNow,daysAvail){
  if(!load||!load.complete) return null;
  if(!load.prod) return null;
  // picking: pull the picking sheet and set up, then find and bring each item to the bench
  var items=load.rows.filter(function(r){return r.type!=="Small part";}).reduce(function(t,r){return t+r.n;},0);
  var pick=PICK_BASE+PICK_EACH*items, work=load.prod+pick;
  var eachFor=function(n){ return Math.ceil(work/n*(n>1?1.1:1)/5)*5; };
  var crew, rule;
  if(crewNow&&crewNow>0){ crew=crewNow; rule="the "+crew+" you chose"; }
  else { var avail=daysAvail&&daysAvail>0?daysAvail:1; crew=3; for(var n=1;n<=3;n++){ if(eachFor(n)<=avail*DAY_MINS){ crew=n; break; } } rule=avail+(avail===1?" working day":" working days")+" to do it in, so the fewest that finish in time is "+crew; }
  var each=eachFor(crew), days=Math.max(1,Math.ceil(each/DAY_MINS));
  var what=load.rows.filter(function(r){return r.prod;}).map(function(r){return r.n+" "+r.type.toLowerCase()+(r.n>1?"s":"")+(r.cleanOnly?" (clean only)":"")+" at "+(r.prod/r.n)+" min";}).join(", ");
  var why=fmt(work)+" of work in total. Picking "+fmt(pick)+" ("+PICK_BASE+" min for the picking sheet and set up, "+PICK_EACH+" min an item for "+items+" items). Then "+what+". "+rule.charAt(0).toUpperCase()+rule.slice(1)+"."+(crew>1?" Split with 10 percent for handover, that is "+fmt(each)+" each":" "+fmt(each))+(days>1?", so "+days+" days.":".");
  return {work:work,pick:pick,crew:crew,mins:each,days:days,why:why};
}
function aboveProdStandard(std,who,mins,start,end){
  if(!std||!who||!who.length||mins==null) return null; var out=[];
  var allocated=mins*who.length, allowed=std.work*(who.length>1?1.1:1);
  if(allocated>allowed*1.5) out.push((who.length>1?fmt(mins)+" each for "+who.length+" is "+fmt(allocated)+" of work":fmt(mins)+" of work")+", standard is "+fmt(std.work));
  if(who.length>3) out.push(who.length+" operatives, never more than three on one job");
  if(start&&end){ var days=0; for(var x=new Date(start+"T12:00"); x.toISOString().slice(0,10)<=end; x.setDate(x.getDate()+1)){ if(x.getDay()!==0&&x.getDay()!==6) days++; } var need=Math.max(1,Math.ceil(mins/DAY_MINS)); if(days>need+1) out.push(days+" days scheduled, "+need+(need===1?" day":" days")+" of work"); }
  return out.length?out.join("; "):null;
}

// working days from a to b inclusive, Monday to Friday
function workDaysBetween(a,b){ if(!a||!b||b<a) return 0; var n=0; for(var x=new Date(a+"T12:00"); x.toISOString().slice(0,10)<=b; x.setDate(x.getDate()+1)){ if(x.getDay()!==0&&x.getDay()!==6) n++; } return n; }
// choose n operatives from who is free: most hours available first, a driver first when the job needs one
function pickCrew(n,loadByName,needDriver,exclude){
  var names=CREW.filter(function(w){ var l=loadByName[w]; return l && l.c!=="off" && (exclude||[]).indexOf(w)<0; });
  names.sort(function(a,b){ return (loadByName[b].avail||0)-(loadByName[a].avail||0); });
  var out=[];
  if(needDriver){ var drv=names.filter(function(w){return DRIVERS.indexOf(w)>=0;})[0]; if(drv) out.push(drv); }
  names.forEach(function(w){ if(out.length<n && out.indexOf(w)<0) out.push(w); });
  return out;
}

// ── vehicle classes, for advising what a load needs. box volume and typical payload, UK hire trade figures ──
// licence: B = car licence (up to 3.5t), C1 = 7.5t (only drivers who passed before 1997 have it), C = rigid HGV, CE = artic
var VEHICLE_CLASSES=[
  {t:"SWB panel van",    m3:8,  kg:1000,  licence:"B",  note:"small drop, no tail lift"},
  {t:"LWB panel van",    m3:13, kg:1000,  licence:"B",  note:"no tail lift"},
  {t:"3.5 tonne Luton",  m3:VAN_M3, kg:VAN_KG, licence:"B", note:"our vans"},
  {t:"7.5 tonne box",    m3:32, kg:2600,  licence:"C1", note:"tail lift; hire with a driver unless someone holds C1"},
  {t:"12 tonne box",     m3:40, kg:6000,  licence:"C",  note:"haulier with driver; check site access and parking"},
  {t:"18 tonne box",     m3:55, kg:9500,  licence:"C", tall:true,  note:"haulier with driver; needs a proper loading bay or wide access"},
  {t:"26 tonne box",     m3:65, kg:15000, licence:"C", tall:true,  note:"haulier with driver; large site access only"},
  {t:"Artic, 13.6 m",    m3:85, kg:26000, licence:"CE", tall:true, note:"haulier; dock or warehouse access, not for most offices"}
];
// the smallest vehicle that takes a load, for telling a contractor or courier what to send (any licence: it is their driver)
function contractorVehicle(m3,kg,postcode){
  if(m3==null) return null; kg=kg||0; var city=CITY_CENTRE.test(districtOf(postcode||""));
  var ok=VEHICLE_CLASSES.filter(function(v){ return v.licence!=="CE"&&(!city||v.kg<=9500)&&v.m3>=m3&&v.kg>=kg; })[0];
  if(!ok) return {text:"Nothing on one vehicle takes this. Split it over two trips or two vehicles."+(city?" City centre, so nothing over 18 tonne.":"")};
  return {v:ok,text:"Send a "+ok.t+" or bigger: "+ok.m3+" m\u00b3, "+ok.kg.toLocaleString("en-GB")+" kg payload."+(city?" City centre: book the bay and nothing over 18 tonne.":"")};
}
// city centre postcode districts where nothing bigger than an 18 tonne gets to the door and bays must be booked
var CITY_CENTRE=/^(EC\d|WC\d|E1|N1|NW1|SE1|SW1|W1|M[1-4]|B[1-5]|BA1|LS[12]|L[1-3]|BS1|EH[1-3]|G[1-3]|S1|NE1|NG1|CF10|BN1|OX1|CB[12]|YO1)$/i;
function districtOf(pc){ var m=/^\s*([A-Z]{1,2}\d[A-Z\d]?)/i.exec(pc||""); return m?m[1].toUpperCase():""; }
// what a load needs: our Lutons first, then the smallest single wagon, then the smallest pair of common wagons.
// an artic never goes to a site. city centres cap at an 18 tonne and need a parking suspension.
function vehicleAdvice(m3,kg,lutonsOnRoad,opts){
  if(m3==null) return null; kg=kg||0; opts=opts||{};
  var on=lutonsOnRoad==null?2:lutonsOnRoad, city=CITY_CENTRE.test(districtOf(opts.postcode));
  var lutons=Math.max(Math.ceil(m3/VAN_M3),Math.ceil(kg/VAN_KG),1);
  var wagons=VEHICLE_CLASSES.filter(function(v){return v.licence!=="B"&&v.licence!=="CE"&&(!city||v.kg<=9500);});
  var common=wagons.filter(function(v){return /7\.5|18|26/.test(v.t);});
  var chairM3=opts.chairM3||0, need=function(v){return v.tall?m3-chairM3*0.25:m3;};
  var single=wagons.filter(function(v){return v.m3>=need(v)&&v.kg>=kg;})[0]||null, pair=null;
  common.forEach(function(a){ common.forEach(function(b){ var needP=(a.tall&&b.tall)?m3-chairM3*0.25:(a.tall||b.tall)?m3-chairM3*0.125:m3; if(a.m3+b.m3>=needP&&a.kg+b.kg>=kg){ if(!pair||a.m3+b.m3<pair.m3) pair=a.m3>=b.m3?{a:a,b:b,m3:a.m3+b.m3}:{a:b,b:a,m3:a.m3+b.m3}; } }); });
  var out={lutons:lutons,fitsOurs:lutons<=on,city:city,hire:single,pair:pair};
  var cityNote=city?" City centre: nothing bigger than an 18 tonne, and book a parking suspension for the bays.":"";
  // fewest vehicles first (Sam, 13 Sep 2026: running several vehicles is expensive)
  if(lutons===1) out.text="One Luton."+cityNote;
  else if(single) out.text="One "+single.t+" ("+single.note+")."+(lutons<=on?" Or our "+lutons+" Lutons in one trip each.":"")+cityNote;
  else if(lutons<=on) out.text="Our "+lutons+" Lutons, one trip each."+cityNote;
  else if(pair) out.text=(pair.a.t===pair.b.t?"Two "+pair.a.t.replace(/box$/,"boxes"):"One "+pair.a.t+" and one "+pair.b.t)+" (haulier with drivers; check site access)."+cityNote;
  else out.text="Nothing takes this in two vehicles: split the collection over days, or tranship from a depot."+cityNote;
  return out;
}

// ── subcontract legs written on the card by the CRM (13 Sep 2026) ──
// "10 seat pads: Deliver to Russkell Upholstery (PR1 2AB) on 2026-09-15"
// "10 seat pads: Collect from Russkell Upholstery (PR1 2AB) on 2026-09-22"
// THE PARTS OF A JOB (Sam, 14 Sep 2026: a sub-contractor collects, the customer loads, the truck comes back to
// Forton and our operatives unload it). The CRM writes a Parts block on the card; this reads it back:
//   {production:true/false, site:"clear and load"|"", transport:"G&T Express, customer loads"|"our van"|..., ours:true/false, warehouse:"unload at Forton"|""}
function partsOf(desc){
  var g=parseDesc(desc||""), P={production:false,site:"",transport:"",ours:false,warehouse:"",known:false};
  (g.parts||[]).forEach(function(l){
    var m=/^(production|site|transport|warehouse|yard):\s*(.*)$/i.exec(l.trim()); if(!m) return; P.known=true;
    var k=m[1].toLowerCase(), v=m[2].trim(), none=/^(no|none)$/i.test(v);
    if(k==="production") P.production=!none;
    else if(k==="site") P.site=none?"":v;
    else if(k==="transport"){ P.transport=none?"":v; P.ours=/^our van/i.test(v); }
    else if(k==="warehouse"||k==="yard") P.warehouse=none?"":v;
  });
  return P;
}
// the firm named on a transport line: "G&T Express, customer loads" -> "G&T Express"; "our van" and "customer ..." -> ""
function partsCarrier(P){ if(!P||!P.transport||P.ours) return ""; if(/^(customer|seller)\b/i.test(P.transport)) return ""; return P.transport.split(",")[0].trim(); }
// No Parts block on the card (made before 14 Sep 2026, or by hand): what the label alone implies for the warehouse.
function impliedParts(labels){
  var wk=workOf(labels), mv=movementOf(labels), carrier=carrierOf(labels), P={production:false,site:"",transport:"",ours:false,warehouse:"",known:false};
  if(wk==="Clearance"||wk==="Recycling"||wk==="Buyback"){ P.warehouse="unload at Forton"; if(carrier) P.transport=carrier; }
  else if(mv==="Customer Collects"||mv==="Customer Delivers and Collects") P.warehouse="load at the collection slot";
  else if(carrier==="Courier") P.warehouse="load the courier";
  else if(carrier==="Sub-contractor"&&wk==="Resale") P.warehouse="load the sub-contractor";
  return P;
}
function supportLegs(desc){
  var g=parseDesc(desc||""), out=[];
  (g.support||[]).forEach(function(l){
    var m=/^(?:(.*?):\s*)?(Deliver to|Collect from)\s+(.+?)(?:\s+on\s+(\d{4}-\d{2}-\d{2}))?(?:\s+by\s+(\w+))?(?:,\s*back with us)?\s*$/i.exec(l.trim());
    if(!m) return;
    out.push({type:/deliver/i.test(m[2])?"to_sub":"from_sub",what:(m[1]||"").trim(),where:m[3].trim(),date:m[4]||null,by:(m[5]||"us").toLowerCase()});
  });
  return out;
}
