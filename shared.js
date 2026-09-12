// shared by the connector, the card back section and the scheduler
var CREW=["Jack","Jordan","Bart","Rob","Bradley"];
var CONTRACTORS=["MAK Installations","Courier","Other contractor"];
var QUICK=[[15,"15 min"],[30,"30 min"],[60,"1 hour"],[120,"2 hours"],[240,"Half day"],[450,"Full day"]];
var WORKSHOP_LISTS=/Workshop Jobs - (Not Started|In-progress|Pending Quality Control)/;
var SITE_LABELS=/delivery\/installation|collect & return|warranty|removal/i;
function fmt(m){ if(m==null) return ""; if(m<60) return m+" min"; var h=Math.floor(m/60), r=m%60; return h+"h"+(r?" "+r+"m":""); }
// what the front of the card says, from the saved plan
function badgeText(d,site){
  d=d||{};
  var who=d.who||[];
  if(d.contractor&&!who.length) return {text:d.contractor,color:null};
  if(!who.length) return {text:"Unassigned",color:"yellow"};
  var missing=[];
  if(site&&d.drive==null) missing.push("no travel time");
  if(d.mins==null) missing.push(site?"no site time":"no time");
  if(missing.length) return {text:who.join(", ")+": "+missing.join(", "),color:"yellow"};
  return {text:who.join(", ")+": "+(site&&d.drive?fmt(d.drive)+" travel + ":"")+fmt(d.mins)+(who.length>1?" each":""),color:"green"};
}
