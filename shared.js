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
// figures: removals trade lists and a council reuse dataset; rows marked est are estimates until the yard corrects them.
// chairs are DOUBLE STACKED figures: 0.40 per swivel chair is Sam's "40 in a Luton", which only works stacked two high;
// loose meeting chairs (tub, cantilever) at 0.40 (about 45 a van, Sam corrected 0.20) and stacking chairs at 0.10 (stacks of five or six) assume the same.
var LOAD=[
  {t:"Swivel chair",     re:/swivel|task chair|operator|mesh chair|office chair|executive chair|ergonomic/i, m3:0.40, kg:12},
  {t:"Meeting chair, stacking", re:/stack/i, m3:0.10, kg:8},
  {t:"Meeting chair",    re:/meeting chair|tub chair|cantilever|visitor chair|conference chair|dining chair|breakout chair/i, m3:0.40, kg:10},
  {t:"Stool",            re:/stool/i, m3:0.15, kg:6},
  {t:"Sit-stand desk",   re:/sit.?stand|height adjust|electric desk|rise/i, m3:0.30, kg:60, built:1.10, est:true},
  {t:"Bench desk position", re:/bench/i, m3:0.30, kg:30, est:true},
  {t:"Desk",             re:/desk(?!\s*(screen|divider|mounted|pedestal|drawer))|workstation/i, m3:0.25, kg:35, built:0.90, w:1600},
  {t:"Meeting table",    re:/meeting table|boardroom|conference table|table \d{4}/i, m3:1.20, kg:50, w:1800},
  {t:"Folding table",    re:/folding|flip.?top/i, m3:0.15, kg:20},
  {t:"Coffee table",     re:/coffee table|side table|occasional/i, m3:0.30, kg:15},
  {t:"Pedestal",         re:/pedestal|desk drawer|drawer unit|mobile drawer/i, m3:0.25, kg:20},
  {t:"Filing cabinet",   re:/filing cab|filer/i, m3:0.50, kg:35},
  {t:"Cupboard or tambour", re:/cupboard|tambour|wardrobe|storage unit|bookcase|shelving/i, m3:0.80, kg:60},
  {t:"Locker",           re:/locker/i, m3:0.60, kg:40, est:true},
  {t:"Screen divider",   re:/screen|divider|partition/i, m3:0.05, kg:5},
  {t:"Armchair",         re:/armchair|arm chair|lounge chair|easy chair/i, m3:0.60, kg:20, est:true},
  {t:"Sofa",             re:/sofa|settee|couch|modular/i, m3:1.80, kg:45, est:true},
  {t:"Booth",            re:/booth|high.?back/i, m3:3.00, kg:90, est:true},
  {t:"Pod",              re:/\bpod\b/i, m3:17, kg:400, est:true}
];
// "4 x Desk 1600 (built)" -> {n:4, type, m3, kg}
function matchLoad(line){
  var m=/^(\d+)\s*x\s*(.+)$/i.exec(line.trim()); if(!m) return null;
  var n=parseInt(m[1],10), name=m[2].trim(), row=null;
  for(var i=0;i<LOAD.length;i++){ if(LOAD[i].re.test(name)){ row=LOAD[i]; break; } }
  if(!row) return {n:n,name:name,type:null};
  var built=/\bbuilt\b|assembled|made up/i.test(name), each=row.built&&built?row.built:row.m3;
  if(row.w){ var wm=/\b(\d{3,4})\s*(?:x|mm|\b)/i.exec(name); if(wm){ var w=parseInt(wm[1],10); if(w>=600&&w<=4000) each=each*w/row.w; } }
  return {n:n,name:name,type:row.t,built:built,m3:Math.round(each*n*100)/100,kg:row.kg*n,est:!!row.est};
}
function loadOf(items){
  var out={m3:0,kg:0,rows:[],unmatched:[]};
  (items||[]).forEach(function(l){ var r=matchLoad(l); if(!r) return; if(!r.type){ out.unmatched.push(l); return; } out.rows.push(r); out.m3+=r.m3; out.kg+=r.kg; });
  out.m3=Math.round(out.m3*10)/10; out.any=out.rows.length>0||out.unmatched.length>0;
  // guardrail: if any line could not be matched there is no estimate at all. a partial total would mislead.
  out.complete=out.rows.length>0&&out.unmatched.length===0; return out;
}
function fmtM3(v){ return v==null?"not set":(Math.round(v*10)/10)+" m\u00b3"; }
function fmtLoad(m3,kg){ if(m3==null) return "not set"; var s=fmtM3(m3)+" of "+VAN_M3; if(kg) s+=", "+Math.round(kg)+" kg of "+VAN_KG; return s; }

// ── reading the card description ──
var HEAD=[
  [/^(site contact|contact details|supplier details|seller contact|contact)$/i,"contact"],
  [/address|their site/i,"where"],
  [/^(items.*|load details|warranty\/job issue|deliver\/collect|additional items.*)$/i,"what"],
  [/^(access.*|logistics|safety.*)$/i,"access"],
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
  var groups={contact:[],where:[],what:[],access:[],notes:[]}, cur="notes";
  txt.split("\n").forEach(function(raw){
    var l=raw.replace(/^\s*[-*_]+\s*/,"").replace(/_+$/,"").trim(); if(!l) return;
    var bare=l.replace(/:$/,"").trim(), hit=null;
    if(bare.length<40 && !/\d/.test(bare)) HEAD.forEach(function(h){ if(!hit && h[0].test(bare)) hit=h[1]; });
    if(hit){ cur=hit==="skip"?(/^(other items|additional info|delivery info)$/i.test(bare)?"notes":cur):hit; if(/:$/.test(l)||hit==="skip"||bare===l) return; }
    if(/:$/.test(l)) return;                                              // a sub-heading with nothing on it
    if(/^(service|mode|method|collection date|ref):/i.test(l)) return;
    if(/sign-off|click here|attach photos|photo evidence|link this order|remove when created|^delivered|^collected|^tracking/i.test(l)) return;
    if(/^[^:]*:\s*(n\/a|none|-)\s*$/i.test(l)) return;
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
var SITE_LABELS=/delivery\/installation|collect & return|warranty|removal|donation/i;
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
