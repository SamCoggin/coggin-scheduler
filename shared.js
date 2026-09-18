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
// figures: removals trade lists and a council reuse dataset; rows marked est are estimates until the crew correct them.
// small parts (arm pads, castors, gas lifts, spares) ride in the cab: 0.01 m3 and 1 kg each, one minute to hand over
// chairs are DOUBLE STACKED figures: 0.40 per swivel chair is Sam's "40 in a Luton", which only works stacked two high;
// loose meeting chairs (tub, cantilever) at 0.40 (about 45 a van, Sam corrected 0.20) and stacking chairs at 0.10 (stacks of five or six) assume the same.
var LOAD=[
  {t:"Swivel chair", prod:30, clean:10, min:3,     re:/swivel|task chair|operator|mesh chair|office chair|executive chair|ergonomic/i, m3:0.40, kg:12},
  {t:"Meeting chair, stacking", prod:10, min:1, re:/stack/i, m3:0.10, kg:8},
  {t:"Meeting chair", prod:10, clean:10, min:2,    re:/meeting chair|tub chair|cantilever(?!\s*(desk|table|bench|legs?|frames?|base))|visitor chair|conference chair|dining chair|breakout chair/i, m3:0.40, kg:10},
  {t:"Stool", prod:10, min:2,            re:/stool/i, m3:0.15, kg:6},
  {t:"Sit-stand desk", prod:60, two:true, min:20,   re:/sit.?stand|height adjust|electric desk|rise/i, m3:0.30, kg:60, built:1.10, w:1600, d:800, est:true},
  {t:"Bench desk position", prod:45, two:true, min:20, re:/bench/i, m3:0.30, kg:30, est:true},
  {t:"Desk", prod:45, two:true, min:15,             re:/desk(?!\s*(screen|divider|mounted|pedestal|drawer))|workstation/i, m3:0.25, kg:35, built:0.90, w:1600, d:800},
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
  // SIT-STAND DESKS ARE ALWAYS ASSEMBLED (Sam, 16 Sep 2026). They count at their built size whatever the line says.
  var built=/\bbuilt\b|assembled|made up/i.test(name)||row.t==="Sit-stand desk", each=row.built&&built?row.built:row.m3;
  // THE SIZE ON THE LINE (Sam, 16 Sep 2026: "what about the different sizes?"): the table's figure is for a
  // 1600x800; "1400x800" or "1800 x 900" scales it by width and depth, a bare "1400" by width alone.
  if(row.w){ var wd=/(?<!\d)(\d{3,4})\s*(?:x|\u00d7)\s*(\d{3,4})(?!\d)/i.exec(name), wm=wd||/(?<!\d)(\d{3,4})(?!\d)/i.exec(name);
    if(wm){ var w=parseInt(wm[1],10); if(w>=600&&w<=4000) each=each*w/row.w; if(wd&&row.d){ var dd=parseInt(wd[2],10); if(dd>=400&&dd<=1600) each=each*dd/row.d; } } }
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
  [/^loan chairs$/i,"loan"],
  [/^(job|ref|service|delivery details|clearance details|refurb collection details|buyback drop-off details|delivery info|other items|additional info|standard time)$/i,"skip"]
];
function cleanDesc(txt){
  txt=(txt||"").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/\*\*/g,"").replace(/\\_/g,"_").replace(/[\u200c\u200b]/g,"").replace(/\s*\u2014\s*/g,", ").replace(/[ \t]*\u00b7[ \t]*/g,", ").replace(/\u00d7/g,"x").replace(/^\s*_+\s*$/gm,"");
  // the clearance form writes items as {"metal_filing_cabinets":5}: turn that into "5 x Metal filing cabinets"
  txt=txt.replace(/\{[^{}]*:\s*\d+[^{}]*\}/g,function(m){ try{ var o=JSON.parse(m); return Object.keys(o).map(function(k){ var n=k.replace(/_/g," "); return o[k]+" x "+n.charAt(0).toUpperCase()+n.slice(1); }).join("\n"); }catch(e){ return m; } });
  return txt.replace(/\n{3,}/g,"\n\n");
}
function parseDesc(txt){
  txt=cleanDesc(txt);
  var groups={contact:[],where:[],what:[],access:[],notes:[],support:[],parts:[],loan:[]}, cur="notes";
  txt.split("\n").forEach(function(raw){
    var l=raw.replace(/^\s*[-*_,]+\s*/,"").replace(/_+$/,"").trim(); if(!l) return;
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

// LOAN CHAIRS RIDE IN THE VAN BUT ARE NOT THE JOB (16 Sep 2026). The CRM writes a "Loan chairs" block on a
// refurb card, one "N x product" line each. They go out with the collection and come back on the return, so
// they belong in the van load on both legs; they never belong in the items, or the workshop would count them.
function loanItemsOf(desc){
  var g=parseDesc(desc||"");
  return (g.loan||[]).map(function(l){return l.replace(/^[,\s]+/,"");}).filter(function(l){return /^\d+\s*x\s*/i.test(l);});
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
// THE RECYCLING TARGET (Sam, 14 Sep 2026): "one operative should be processing 100 units a day on average subject
// to how much time they have been on the job". A unit is one item of any kind; some go faster, 100 is the average.
// The target follows the time: 100 for a full day, pro rata for the minutes actually on recycling.
var REC_TARGET_DAY=100;
// PLASTIC SHREDDING (Sam, 14 Sep 2026: "total amount and type of material processed and cages processed"). The
// streams are never mixed: PA6, PA66 and PP with their fillers shred separately, anything else is Other.
var SHRED_MATERIALS=["PA6","PA66","PP","Other"];
function recTarget(mins){ return Math.max(0,Math.round((mins||0)/DAY_MINS*REC_TARGET_DAY)); }
var QUICK=[[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"],[240,"Half day"],[DAY_MINS,"Full day"]];
var WORKSHOP_LISTS=/Workshop Jobs - (Not Started|In-progress)/;
// NEW JOBS COUNT AS WORKSHOP WHEN THE JOB HAS PRODUCTION (Sam, 17 Sep 2026: the 533E11 card in New Jobs on
// Operations - Planning showed no Production block). A card waiting in New Jobs or Transfer to Job Board has
// not been made yet, so its Production block and badge show there too when its Parts say Production: yes.
var NEW_JOB_LISTS=/^(New Jobs|Transfer to Job Board)$/i;
function isWorkshopList(listName,desc){ var n=String(listName||"").trim(); if(WORKSHOP_LISTS.test(n)) return true; return NEW_JOB_LISTS.test(n)&&partsOf(desc||"").production; }
var READY_LIST=/Workshop Jobs - Ready/;
// QC evidence is the card checklist (photos, labels): all items ticked
function qcDone(badges){ return !!(badges&&badges.checkItems>0&&badges.checkItemsChecked>=badges.checkItems); }
// ── one label that says both things (Sam, 14 Sep 2026: "Donation - Delivery... Resale - Courier and Resale - Sub-contractor") ──
// The CRM puts one label on every card, "Work - Movement", spelled exactly as the board spells it. The Scheduler
// reads WORK (what the job is) and MOVEMENT (which way the furniture travels) back out of that name. Courier and
// Sub-contractor say who carries it, so the movement for those follows the work: a resale goes out, a clearance
// comes in, a refurb goes both ways. The older names (two labels, and the board's original single labels) are
// still understood so nothing breaks on a card made before the switch.
var WORK_LABELS=["Resale","Refurb","Clearance","Recycling","Buyback","Donation","Warranty","Job Issue","Stock"];
// A VIEWING ORDER (17 Sep 2026): stock got ready at Forton for a viewing. Production only: no van, no site, no labour,
// and the card's due date IS the production due date, not delivery minus the buffer.
function isViewingLabels(labels){ return labelNames(labels).some(function(n){ return /^stock\s*-\s*viewing$/i.test(n.trim()); }); }
// A SAMPLE CARD (17 Sep 2026): "Resale - Sample", sent from the CRM's Sample to arrange. The label says it is a
// sample, not how it moves, so the movement comes from the card's Parts transport line: "customer collects" is
// Customer Collects; our van, or a courier or contractor firm, is a Delivery (a firm on that line becomes the
// carrier through partsCarrier, exactly as on an ops card). The card is due on the day it must arrive, like an ops
// delivery card, and the CRM prints the ready-by as the working day before: production is due then.
var SAMPLE_READY_DAYS=3; // 3 from 17 Sep 2026 (Sam): samples follow the production buffer
function isSampleLabels(labels){ return labelNames(labels).some(function(n){ return /^resale\s*-\s*sample$/i.test(n.trim()); }); }
function sampleMovement(desc){ var P=partsOf(desc||""); return /^customer\b/i.test(P.transport)?"Customer Collects":"Delivery"; }
// when production is due for a card: a viewing on its date, a sample the working day before, anything else the buffer
function productionDueFor(labels,due){ if(!due) return null; if(isViewingLabels(labels)) return due; if(isSampleLabels(labels)) return workingDaysBefore(due,SAMPLE_READY_DAYS); return productionDue("",due); }
var MOVEMENT_LABELS=["Delivery","Collection","Collect and Return","Customer Delivers","Customer Collects","Customer Delivers and Collects","Site Visit","Labour"];
var OLD_MOVEMENT={"delivery/installation":"Delivery","removal job":"Collection","collect & return":"Collect and Return","customer collecting":"Customer Collects","courier collecting":"Customer Collects","courier collects":"Customer Collects","recycling delivery":"Customer Delivers","new stock delivery":"Customer Delivers","stock delivery":"Customer Delivers","plastic delivery":"Customer Delivers","plastic collection":"Collection","skip exchange":"Labour","labour":"Labour","warehouse":"Labour","yard":"Labour","warranty/job issue":"Site Visit","donations":"Delivery","charity donation":"Delivery"};
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
function movementOf(labels,desc){ if(isSampleLabels(labels)) return sampleMovement(desc); var n=labelNames(labels); for(var c=0;c<n.length;c++){ var cm=combinedMovement(n[c]); if(cm) return cm; } for(var i=0;i<n.length;i++){ if(MOVEMENT_LABELS.indexOf(n[i])>=0) return n[i]; } for(var k=0;k<n.length;k++){ var m=OLD_MOVEMENT[n[k].toLowerCase()]; if(m) return m; } return ""; }
function workOf(labels){ var n=labelNames(labels); for(var c=0;c<n.length;c++){ var cw=combinedWork(n[c]); if(cw) return cw; } for(var i=0;i<n.length;i++){ if(WORK_LABELS.indexOf(n[i])>=0) return n[i]; } for(var k=0;k<n.length;k++){ var w=OLD_WORK[n[k].toLowerCase()]; if(w) return w; } return ""; }
// our van goes out: the transport movements
function isSiteMove(mv){ return mv==="Delivery"||mv==="Collection"||mv==="Collect and Return"||mv==="Site Visit"; }
// they come to Forton: loading only, no van of ours
function isCollectMove(mv){ return mv==="Customer Collects"||mv==="Customer Delivers and Collects"; }
function isSiteLabels(labels,desc){ return isSiteMove(movementOf(labels,desc)); }
function isCollectLabels(labels,desc){ return isCollectMove(movementOf(labels,desc)); }
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
  // the day and the part go with it, so the comment that tags a new member says something useful
  var due=inWorkshop?((plan&&plan.prep&&plan.prep.date)||(plan&&plan.date)||""):((plan&&plan.date)||""), mins=inWorkshop?((plan&&plan.prep&&plan.prep.mins)||0):((plan&&plan.mins)||0);
  try{ fetch(CRM_MEMBERS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:crmKey,card_id:cardId,names:names,crew:CREW,part:inWorkshop?"production":"transport",mins:mins,due:due})}).catch(function(){}); }catch(e){}
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
var PRODUCTION_BUFFER_DAYS=3; // 3 from 17 Sep 2026 (Sam): production finished, then two full working days in dispatch before delivery
function workingDaysBefore(iso,n){ var d=new Date(iso+"T12:00"); var left=n; while(left>0){ d.setDate(d.getDate()-1); if(d.getDay()!==0&&d.getDay()!==6) left--; } return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function productionDue(readyBy,due){ if(readyBy) return readyBy; if(!due) return null; return workingDaysBefore(due,PRODUCTION_BUFFER_DAYS); }

var MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DAY_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function niceShort(iso){ var d=new Date(iso+"T12:00"); return DAY_SHORT[d.getDay()]+" "+d.getDate()+" "+MON_SHORT[d.getMonth()]; }
function todayIso(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

// ── standards: how many operatives a job type needs and how long it should take ──
// crew is the standard crew. base is minutes on site before the items (park, meet the contact, sign off).
// site time per operative = (base + handling minutes for the items) / crew. fixed jobs have mins instead.
var STANDARD=[
  {re:/skip exchange/i,            crew:1, mins:15},   // 15 minutes, one operative (Sam, 18 Sep 2026)
  {re:/^(labour|warehouse|yard) (load|unload)$/i, crew:2, base:15},
  {re:/^(labour|warehouse|yard)$/i, crew:2, mins:60},
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
  // A SKIP EXCHANGE IS A SKIP EXCHANGE, whatever part of the card asks (Sam, 18 Sep 2026: "if a card is labeled
  // skip exchange it should only estimate 1 operative and 15 mins... now 2 operatives and 1 hour"). The labour
  // part used to fall through to the general labour figure.
  if(/skip exchange/i.test(String(label))||(Array.isArray(label)&&labelNames(label).some(function(n){return /skip exchange/i.test(n);}))) mv="Skip Exchange";
  var st=null; for(var i=0;i<STANDARD.length;i++){ if(STANDARD[i].re.test(mv||"")){ st=STANDARD[i]; break; } }
  if(!st) return null;
  if(st.mins!=null) return {crew:st.crew,mins:st.mins,why:"A "+String(mv).toLowerCase()+" is a set "+fmt(st.mins)+" for "+st.crew+(st.crew===1?" operative":" operatives")+", whatever is on the card"};
  if(!load||!load.complete) return {crew:st.crew,mins:null,why:"The time comes from the items on the card, so add them first"};
  var crew=st.crew, big=load.m3>12||load.rows.some(function(r){return r.type==="Booth"||r.type==="Pod";});
  var twoHanded=load.rows.some(function(r){return r.two;}), small=load.m3<3&&!twoHanded;
  if(small) crew=1; if(big) crew+=1;
  // BULK LOADING IS FASTER (Sam, 18 Sep 2026: "1 min per chair for bulk loading"). Handling one item at a time
  // into an office is the table's own minutes; loading or unloading a wagon of the same thing, stacked and
  // moved several at a time, is a minute an item from 20 items up. Only the labour parts, never a delivery
  // where every item is carried in and placed.
  var BULK_FROM=20, BULK_EACH=1;
  var items=load.rows.reduce(function(t,r){return t+r.n;},0);
  var labour=/^labour/i.test(String(mv)), bulk=labour&&items>=BULK_FROM;
  var handling=bulk?items*BULK_EACH:load.min;
  var total=st.base+handling, each=Math.ceil(total/crew/5)*5;
  var what=load.rows.map(function(r){return r.n+" "+r.type.toLowerCase()+(r.n>1?"s":"");}).join(", ");
  var unload=/unload/i.test(String(mv));
  var why=labour?(st.base+" minutes to set out and clear away, plus "+handling+" minutes to "+(unload?"unload and put away ":"bring out and load ")+what+(bulk?", at a minute an item in bulk":"")+"."):(st.base+" minutes for parking, the contact and the sign off, plus "+load.min+" minutes to carry in and place "+what+".");
  why+=crew===1?" One operative can manage that alone, so "+Math.max(15,each)+" minutes.":" Shared between "+crew+" operatives that is "+Math.max(15,each)+" minutes each"+(big?". One extra operative because the load is big":(twoHanded?". Two because some items need two to carry":""))+".";
  return {crew:crew,mins:Math.max(15,each),why:why};
}
// allocated against standard: an amber flag when the crew or the time is well over
function aboveStandard(std,who,mins){
  if(!std) return null; var out=[];
  if(who&&who.length>std.crew) out.push((who.length)+" operatives, standard is "+std.crew);
  if(std.mins!=null&&mins!=null&&mins>std.mins*1.5) out.push(fmt(mins)+(who.length>1?" each":"")+", estimated "+fmt(std.mins));
  return out.length?out.join("; "):null;
}

// ── production standard: how long the workshop should take on the items ──
// minutes: pull the picking sheet and set up, then per item to bring it from storage to the prep area.
// 3 minutes an item and two on the picking from 17 Sep 2026 (Sam: "Picking is just a case of bringing the chairs
// from storage to the workshop/prep area circa 2/5 mins per item... 3 mins for both, and picking split between two").
var PICK_BASE=15, PICK_EACH=3, PICK_CREW=2;
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
  else { var avail=daysAvail&&daysAvail>0?daysAvail:1; crew=3; for(var n=PICK_CREW;n<=3;n++){ if(eachFor(n)<=avail*DAY_MINS){ crew=n; break; } } rule=avail+(avail===1?" working day":" working days")+" to do it in, so the fewest that finish in time is "+crew; }
  var each=eachFor(crew), days=Math.max(1,Math.ceil(each/DAY_MINS));
  var what=load.rows.filter(function(r){return r.prod;}).map(function(r){return r.n+" "+r.type.toLowerCase()+(r.n>1?"s":"")+(r.cleanOnly?" (clean only)":"")+" at "+(r.prod/r.n)+" min";}).join(", ");
  var why=fmt(work)+" of work in total. Picking "+fmt(pick)+" ("+PICK_BASE+" min for the picking sheet and set up, "+PICK_EACH+" min an item for "+items+" items, "+PICK_CREW+" on it). Then "+what+". "+rule.charAt(0).toUpperCase()+rule.slice(1)+"."+(crew>1?" Split with 10 percent for handover, that is "+fmt(each)+" each":" "+fmt(each))+(days>1?", so "+days+" days.":".");
  return {work:work,pick:pick,crew:crew,mins:each,days:days,why:why};
}
// SOMEONE BREAKING OFF (Sam, 18 Sep 2026: "an operative might have to break off a job onto something else").
// A part carries one time for everybody; when that is not true, part.each holds the minutes for the people who
// differ, and everything reads the time through here.
function minsFor(part,w){ if(!part) return null; var e=part.each&&part.each[w]; return (e===0||e)?e:(part.mins!=null?part.mins:null); }
// what the crew are actually giving a production job, in crew minutes
function plannedProdMins(part){ return ((part&&part.who)||[]).reduce(function(t,w){ var m=minsFor(part,w); return t+(m||0); },0); }
function aboveProdStandard(std,who,mins,start,end){
  if(!std||!who||!who.length||mins==null) return null; var out=[];
  var allocated=mins*who.length, allowed=std.work*(who.length>1?1.1:1);
  if(allocated>allowed*1.5) out.push((who.length>1?fmt(mins)+" each for "+who.length+" is "+fmt(allocated)+" of work":fmt(mins)+" of work")+", estimated "+fmt(std.work));
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
  {t:"Artic, 13.6 m",    m3:85, kg:26000, licence:"CE", tall:true, note:"haulier; dock or labour access, not for most offices"}
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
  // three high in a tall box is a RECYCLING or CLEARANCE rule only (Sam, 17 Sep 2026: "we don't stack resale
  // three high"). Resale chairs travel as they are sold, so a tall box buys no extra room unless stackTall is set.
  var chairM3=opts.stackTall?(opts.chairM3||0):0, need=function(v){return v.tall?m3-chairM3*0.25:m3;};
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
//   {production:true/false, site:"clear and load"|"", transport:"G&T Express, customer loads"|"our van"|..., ours:true/false, labour:"unload at Forton"|""}
function partsOf(desc){
  var g=parseDesc(desc||""), P={production:false,site:"",transport:"",ours:false,labour:"",known:false};
  (g.parts||[]).forEach(function(l){
    var m=/^(production|site|transport|labour|warehouse|yard):\s*(.*)$/i.exec(l.trim()); if(!m) return; P.known=true;
    var k=m[1].toLowerCase(), v=m[2].trim(), none=/^(no|none)$/i.test(v);
    if(k==="production") P.production=!none;
    else if(k==="site") P.site=none?"":v;
    else if(k==="transport"){ P.transport=none?"":v; P.ours=/^our van/i.test(v); }
    else if(k==="labour"||k==="warehouse"||k==="yard") P.labour=none?"":v;
  });
  // "unload in on 2026-09-16; load out on 2026-09-23" is two legs on two days (a contractor refurb)
  P.labourLegs=P.labour?P.labour.split(";").map(function(x){ var m=/^(.*?)(?:\s+on\s+(\d{4}-\d{2}-\d{2}))?\s*$/.exec(x.trim()); return m&&m[1]?{where:m[1].trim(),date:m[2]||null}:null; }).filter(Boolean):[];
  return P;
}
// the firm named on a transport line: "G&T Express, customer loads" -> "G&T Express"; "our van" and "customer ..." -> ""
function partsCarrier(P){ if(!P||!P.transport||P.ours) return ""; if(/^(customer|seller)\b/i.test(P.transport)) return ""; return P.transport.split(",")[0].trim(); }
// No Parts block on the card (made before 14 Sep 2026, or by hand): what the label alone implies for the labour part.
// Labour only when somebody else's vehicle is involved (Sam, 15 Sep 2026): our crew load and unload their own van
// as part of the trip, and a customer collection or delivery is itself the labour.
function impliedParts(labels){
  var wk=workOf(labels), carrier=carrierOf(labels), P={production:false,site:"",transport:"",ours:false,labour:"",labourLegs:[],known:false};
  if(carrier){ P.transport=carrier; if(wk==="Clearance"||wk==="Recycling"||wk==="Buyback") P.labour="unload at Forton"; else if(wk==="Resale"||wk==="Donation") P.labour=carrier==="Courier"?"load the courier":"load the sub-contractor"; else if(wk==="Refurb") P.labour="unload in; load out"; }
  P.labourLegs=P.labour?P.labour.split(";").map(function(x){return {where:x.trim(),date:null};}):[];
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

// ── travel: return drive minutes from Forton by postcode area, with a traffic allowance ──
// Moved here from scheduler.html on 17 Sep 2026 so the card fills travel the same way (Sam: "make the card fill
// travel from the postcode"). The postcode in the description wins; the town at the front of the title is the fallback.
var DRIVE={"AB":{"area":"Aberdeen","h":7.17},"AL":{"area":"St Albans","h":5.5},"B":{"area":"Birmingham","h":3.15},"BA":{"area":"Bath","h":5.37},"BB":{"area":"Blackburn","h":0.38},"BD":{"area":"Bradford","h":1.23},"BH":{"area":"Bournemouth","h":6.85},"BL":{"area":"Bolton","h":0.7},"BN":{"area":"Brighton","h":7.38},"BR":{"area":"Bromley","h":6.38},"BS":{"area":"Bristol","h":5.18},"BT":{"area":"Belfast","h":4.35},"CA":{"area":"Carlisle","h":2.27},"CB":{"area":"Cambridge","h":5.13},"CF":{"area":"Cardiff","h":5.15},"CH":{"area":"Chester","h":1.43},"CM":{"area":"Chelmsford","h":6.18},"CO":{"area":"Colchester","h":6.35},"CR":{"area":"Croydon","h":6.37},"CT":{"area":"Canterbury","h":7.47},"CV":{"area":"Coventry","h":3.33},"CW":{"area":"Crewe","h":1.67},"DA":{"area":"Dartford","h":6.47},"DD":{"area":"Dundee","h":5.63},"DE":{"area":"Derby","h":2.57},"DG":{"area":"Dumfries","h":2.85},"DH":{"area":"Durham","h":2.45},"DL":{"area":"Darlington","h":2.07},"DN":{"area":"Doncaster","h":2.17},"DT":{"area":"Dorchester","h":6.8},"DY":{"area":"Dudley","h":3.02},"E":{"area":"East London","h":6.13},"EC":{"area":"London (EC)","h":6.12},"EH":{"area":"Edinburgh","h":4.57},"EN":{"area":"Enfield","h":5.87},"EX":{"area":"Exeter","h":6.85},"FK":{"area":"Falkirk","h":4.82},"FY":{"area":"Blackpool","h":0.42},"G":{"area":"Glasgow","h":4.73},"GL":{"area":"Gloucester","h":4.33},"GU":{"area":"Guildford","h":6.32},"GY":{"area":"Guernsey","h":9.5},"HA":{"area":"Harrow","h":5.82},"HD":{"area":"Huddersfield","h":1.28},"HG":{"area":"Harrogate","h":1.53},"HP":{"area":"Hemel Hempstead","h":5.4},"HR":{"area":"Hereford","h":3.88},"HS":{"area":"Outer Hebrides","h":10.38},"HU":{"area":"Hull","h":3.07},"HX":{"area":"Halifax","h":1.13},"IG":{"area":"Ilford","h":6.15},"IM":{"area":"Isle of Man","h":2.33},"IP":{"area":"Ipswich","h":6.35},"IV":{"area":"Inverness","h":8.03},"JE":{"area":"Jersey","h":10.1},"KA":{"area":"Kilmarnock","h":4.4},"KT":{"area":"Kingston upon Thames","h":6.15},"KW":{"area":"Kirkwall (Orkney)","h":11.08},"KY":{"area":"Kirkcaldy","h":4.92},"L":{"area":"Liverpool","h":1.02},"LA":{"area":"Lancaster","h":0.43},"LD":{"area":"Llandrindod Wells","h":3.58},"LE":{"area":"Leicester","h":3.33},"LL":{"area":"Llandudno","h":1.82},"LN":{"area":"Lincoln","h":3.1},"LS":{"area":"Leeds","h":1.5},"LU":{"area":"Luton","h":5.22},"M":{"area":"Manchester","h":1.02},"ME":{"area":"Medway","h":6.83},"MK":{"area":"Milton Keynes","h":4.67},"ML":{"area":"Motherwell","h":4.47},"N":{"area":"North London","h":5.98},"NE":{"area":"Newcastle upon Tyne","h":2.8},"NG":{"area":"Nottingham","h":2.8},"NN":{"area":"Northampton","h":4.22},"NP":{"area":"Newport","h":4.92},"NR":{"area":"Norwich","h":5.83},"NW":{"area":"North West London","h":6.0},"OL":{"area":"Oldham","h":1.03},"OX":{"area":"Oxford","h":4.92},"PA":{"area":"Paisley","h":4.8},"PE":{"area":"Peterborough","h":4.23},"PH":{"area":"Perth","h":5.55},"PL":{"area":"Plymouth","h":7.73},"PO":{"area":"Portsmouth","h":6.92},"PR":{"area":"Preston","h":0.2},"RG":{"area":"Reading","h":5.67},"RH":{"area":"Redhill","h":6.57},"RM":{"area":"Romford","h":6.22},"S":{"area":"Sheffield","h":1.9},"SA":{"area":"Swansea","h":5.07},"SE":{"area":"South East London","h":6.15},"SG":{"area":"Stevenage","h":5.35},"SK":{"area":"Stockport","h":1.2},"SL":{"area":"Slough","h":5.78},"SM":{"area":"Sutton","h":6.32},"SN":{"area":"Swindon","h":5.12},"SO":{"area":"Southampton","h":6.58},"SP":{"area":"Salisbury","h":6.13},"SR":{"area":"Sunderland","h":2.83},"SS":{"area":"Southend-on-Sea","h":6.7},"ST":{"area":"Stoke-on-Trent","h":1.97},"SW":{"area":"South West London","h":6.08},"SY":{"area":"Shrewsbury","h":2.47},"TA":{"area":"Taunton","h":6.15},"TD":{"area":"Galashiels","h":3.8},"TF":{"area":"Telford","h":2.57},"TN":{"area":"Tonbridge","h":6.97},"TQ":{"area":"Torquay","h":7.4},"TR":{"area":"Truro","h":8.35},"TS":{"area":"Middlesbrough","h":2.45},"TW":{"area":"Twickenham","h":6.07},"UB":{"area":"Uxbridge","h":5.78},"W":{"area":"West London","h":6.03},"WA":{"area":"Warrington","h":1.02},"WC":{"area":"London (WC)","h":6.08},"WD":{"area":"Watford","h":5.63},"WF":{"area":"Wakefield","h":1.62},"WN":{"area":"Wigan","h":0.68},"WR":{"area":"Worcester","h":3.33},"WS":{"area":"Walsall","h":3.03},"WV":{"area":"Wolverhampton","h":2.98},"YO":{"area":"York","h":2.18},"ZE":{"area":"Shetland","h":13.75}};
var TOWN={"Blackpool":"FY","Preston":"PR","Skipton":"BD","Sedbergh":"LA","Nottingham":"NG","West Midlands":"B","Lymm":"WA","Sheffield":"S","Nelson":"BB","London":"EC","Garstang":"PR","Barton":"PR","Lancaster":"LA","Manchester":"M","Liverpool":"L","Leeds":"LS","York":"YO"};
var TRAFFIC=1.2;
function postcodeArea(desc){ var m=/\b([A-Z]{1,2})\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.exec(String(desc||"").replace(/\*\*/g,"")); return m?m[1].toUpperCase():""; }
function driveFor(title,desc){ var area=postcodeArea(desc); if(!area||!DRIVE[area]){ var town=String(title||"").split(" - ")[0].trim(); area=TOWN[town]||""; } return area&&DRIVE[area] ? Math.round(DRIVE[area].h*2*60*TRAFFIC/5)*5 : null; }
