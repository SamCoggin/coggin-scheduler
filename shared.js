// shared by the connector, the card back section and the scheduler
var CREW=["Jack","Jordan","Bart","Rob","Bradley"];
var CONTRACTORS=["MAK Installations","Courier","Other contractor"];
var QUICK=[[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"],[240,"Half day"],[450,"Full day"]];
var WORKSHOP_LISTS=/Workshop Jobs - (Not Started|In-progress)/;
var READY_LIST=/Workshop Jobs - Ready/;
// QC evidence is the card checklist (photos, labels): all items ticked
function qcDone(badges){ return !!(badges&&badges.checkItems>0&&badges.checkItemsChecked>=badges.checkItems); }
var SITE_LABELS=/delivery\/installation|collect & return|warranty|removal/i;
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
function prodBadgeText(d){
  var p=d&&d.prep; if(!p||!p.date) return {text:"Production: not scheduled",color:"yellow"};
  var who=p.who||[]; var days=p.start&&p.start!==p.date?niceShort(p.start)+" to "+niceShort(p.date):niceShort(p.date);
  if(!who.length) return {text:"Production "+days+": unassigned",color:"yellow"};
  if(p.mins==null) return {text:"Production "+days+": "+who.join(", ")+", no time",color:"yellow"};
  return {text:"Production "+days+": "+who.join(", ")+", "+fmt(p.mins)+(who.length>1?" each":""),color:"blue"};
}

// production is due this many working days before the delivery date unless
// the card's Production Due Date field says otherwise
var PRODUCTION_BUFFER_DAYS=2;
function workingDaysBefore(iso,n){ var d=new Date(iso+"T12:00"); var left=n; while(left>0){ d.setDate(d.getDate()-1); if(d.getDay()!==0&&d.getDay()!==6) left--; } return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function productionDue(readyBy,due){ if(readyBy) return readyBy; if(!due) return null; return workingDaysBefore(due,PRODUCTION_BUFFER_DAYS); }

var MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DAY_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function niceShort(iso){ var d=new Date(iso+"T12:00"); return DAY_SHORT[d.getDay()]+" "+d.getDate()+" "+MON_SHORT[d.getMonth()]; }
function todayIso(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
