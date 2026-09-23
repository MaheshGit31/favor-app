(function(){
"use strict";

/* ---------- data ---------- */
var STREETS=["Maple Ct","Birch Loop","Cedar Way","Willow Bend","Clover Lane","Harvest Rd"];
var SUGGESTED=["Home repairs","Furniture assembly","Lawn care","Dog walking","Math tutoring","Bike repair","Cooking lessons","Lending tools","Photography","Painting","Truck & hauling","Sewing & alterations"];
/* ---------- state ---------- */
var S={view:"boot",step:0,tab:"needs",filter:"all",q:"",draft:"",pimg:null,pimgUrl:"",cfg:{},unread:0,
  me:{id:0,name:"",street:"",address:"",contact:"messages",phone:"",picture:"",banner:0,skills:[]},
  ob:{skills:[]},friends:{},people:[],threads:{},listings:[],posts:[]};

/* ---------- helpers ---------- */
var $=function(s){return document.querySelector(s)};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function person(id){var k=String(id),i;for(i=0;i<S.people.length;i++)if(String(S.people[i].id)===k)return S.people[i];return {id:id,name:"Neighbor",street:"",picture:"",done:0,skills:[]}}
function avCls(name){var n=0;for(var i=0;i<name.length;i++)n+=name.charCodeAt(i);return "av"+(n%5)}
function av(x,size){var o=typeof x==="string"?{name:x}:x,n=o.name||"?";
  if(o.picture)return '<div class="av '+(size||"")+' avimg" aria-hidden="true"><img src="'+esc(o.picture)+'" alt="" referrerpolicy="no-referrer"></div>';
  return '<div class="av '+(size||"")+' '+avCls(n)+'" aria-hidden="true">'+esc(n.charAt(0))+'</div>'}
function rateLabel(r,u){if(!r)return "Free";return "$"+r+(u==="hr"?" / hr":" flat")}
function rateChip(r,u,pre){if(!r)return '<span class="chip free">Free</span>';return '<span class="chip rate">'+(pre||"")+rateLabel(r,u)+'</span>'}
var ICON={
 search:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 x:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 msg:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
 plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 heart:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/></svg>'
};

ICON.pen='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-5L16 4l4 4L9 19z"/></svg>';
ICON.img='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>';
ICON.flag='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
function titleCase(k){return String(k||"").replace(/\b[a-z]/g,function(c){return c.toUpperCase()})}
function photoRow(){
  return '<div class="photorow">'+av(S.me,"big")+'<div class="grow"><b>Profile photo</b><p class="muted sm">'+(S.me.hasAvatar?"Looking good.":"Optional. Up to 20 MB.")+'</p>'+
   '<div class="row wrapf" style="margin-top:8px"><label class="btn sm sun" for="avfile" tabindex="0">'+(S.me.hasAvatar?"Change photo":"Upload photo")+'</label>'+(S.me.hasAvatar?'<button class="btn sm quiet" data-a="rm-photo">Remove</button>':"")+'</div>'+
   '<input type="file" id="avfile" accept="image/*" hidden></div></div>'}
function unlistedNote(action){
  return '<div class="notice warn"><b>We can\'t find that street on the approved Sutton Fields list yet.</b><p class="sm">If you live in Sutton Fields, request a review and an admin will check it. Or fix a typo and try again.</p><button class="btn sm need" data-a="'+action+'">Request a review</button></div>'}
function addrStatus(){
  var r=S.me.req;
  if(S.addr&&S.addr.state==="unlisted")return unlistedNote("req-street");
  if(r&&r.status==="pending")return '<div class="notice"><b>Your address is under review.</b><p class="sm">'+esc(r.address)+'. An admin will check it soon. Come back and tap Check again.</p><button class="btn sm sun" data-a="recheck">Check again</button></div>';
  if(r&&r.status==="approved")return '<div class="notice ok"><b>Good news, your street was approved.</b><p class="sm">Tap Next to keep going.</p></div>';
  if(r&&r.status==="rejected")return '<div class="notice warn"><b>That address wasn\'t approved.</b><p class="sm">Double-check it for typos, or try a different address.</p></div>';
  return ""}
function addrField(){
  return '<div class="field"><label for="ob-addr">Your street address in Sutton Fields</label><input class="in" id="ob-addr" data-in="me-address" value="'+esc(S.me.address)+'" placeholder="123 Maple Court" autocomplete="street-address"><span class="muted sm">Neighbors only see your street name, never your house number.</span></div>'+addrStatus()}
function checkAddr(a){return api("POST","/api/address/check",{address:a})}
function afterPhoto(){var pr=document.querySelector(".photorow");if(pr)pr.outerHTML=photoRow();if(S.view==="home")render(true)}
function resizePhoto(file){return new Promise(function(res,rej){
  var fr=new FileReader();fr.onerror=function(){rej(new Error("Couldn't read that photo."))};
  fr.onload=function(){var im=new Image();im.onerror=function(){rej(new Error("We couldn't open that photo. Try a JPG or PNG."))};
   im.onload=function(){var n=256,c=document.createElement("canvas");c.width=c.height=n;var x=c.getContext("2d");var m=Math.min(im.width,im.height),sx=(im.width-m)/2,sy=(im.height-m)/2;
    x.fillStyle="#fff";x.fillRect(0,0,n,n);x.drawImage(im,sx,sy,m,m,0,0,n,n);
    var q=.86,u=c.toDataURL("image/jpeg",q);while(u.length>190000&&q>.4){q-=.12;u=c.toDataURL("image/jpeg",q)}res(u)};
   im.src=fr.result};fr.readAsDataURL(file)})}
function reportModal(kind,id){
  modal.rk=kind;modal.rid=id;
  modal('<h2>Report this '+(kind==="post"?"post":"listing")+'</h2><p class="muted">Tell an admin what is wrong. They will take a look.</p><div class="field"><label for="rr">What is the problem?</label><textarea class="in" id="rr" maxlength="300" placeholder="Spam, rude, not from Sutton Fields..."></textarea></div><div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn need" data-a="send-report">Send report</button></div>')}
function confirmModal(title,msg,yesLabel,yesAttrs){
  modal('<h2>'+title+'</h2><p class="muted">'+msg+'</p><div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn need" '+yesAttrs+'>'+yesLabel+'</button></div>')}
function refreshAdmin(){
  if(!S.me.isAdmin)return;
  api("GET","/api/admin/overview").then(function(d){S.adminN=d.requests.length+d.reports.length;var b=$("#admbadge");if(b){b.textContent=S.adminN;b.hidden=!S.adminN}}).catch(function(){})}
function admView(){
  var d=S.adm.data,t=S.adm.tab;
  if(!d)return '<h2>Admin</h2><p class="muted">Loading...</p>';
  var tabs=[["requests","Addresses",d.requests.length],["reports","Reports",d.reports.length],["streets","Streets",0],["storage","Storage",0],["danger","Danger zone",0]];
  var h='<div class="row" style="justify-content:space-between"><h2>Admin</h2><button class="btn sm quiet" data-a="close">Close</button></div>'+
   '<p class="muted sm">'+d.counts.users+' neighbors &middot; '+d.counts.listings+' listings &middot; '+d.counts.posts+' posts &middot; '+d.counts.messages+' messages</p>'+
   '<div class="tabs">'+tabs.map(function(x){return '<button class="tab'+(t===x[0]?" on":"")+'" data-a="adm-tab" data-v="'+x[0]+'">'+x[1]+(x[2]?' <span class="badge">'+x[2]+'</span>':"")+'</button>'}).join("")+'</div>';
  if(t==="requests"){
    h+=d.requests.length?d.requests.map(function(r){return '<div class="sr admrow"><div class="grow"><b>'+esc(r.name)+'</b><span class="muted sm">'+esc(r.address)+'</span><label class="sm" style="display:block;margin-top:8px">Add to approved list as<input class="in" data-in="adm-name" data-id="'+r.id+'" value="'+esc(titleCase(r.key))+'"></label></div><div class="stack" style="gap:8px"><button class="btn sm" data-a="adm-approve" data-id="'+r.id+'">Approve</button><button class="btn sm quiet" data-a="adm-reject" data-id="'+r.id+'">Reject</button></div></div>'}).join(""):'<p class="hint">No address requests waiting.</p>';
  }else if(t==="reports"){
    h+=d.reports.length?d.reports.map(function(r){return '<div class="sr admrow"><div class="grow"><p class="eyebrow">'+esc(r.kind)+' by '+esc(r.author||"(already removed)")+'</p><b>'+esc(r.content||"(already removed)")+'</b><span class="muted sm">Reported by '+esc(r.reporter)+(r.reason?": "+esc(r.reason):"")+'</span></div><div class="stack" style="gap:8px">'+(r.content?'<button class="btn sm need" data-a="adm-remove" data-id="'+r.id+'">Remove '+esc(r.kind)+'</button>':"")+'<button class="btn sm quiet" data-a="adm-dismiss" data-id="'+r.id+'">Dismiss</button></div></div>'}).join(""):'<p class="hint">No open reports. Nice and quiet.</p>';
  }else if(t==="streets"){
    h+='<p class="muted sm">Neighbors can only join with an address on one of these streets.</p>'+
     (d.streets.length?d.streets.map(function(x){return '<div class="pers"><div class="grow"><b>'+esc(x.name)+'</b></div><button class="x btn sm quiet" data-a="adm-del-street" data-id="'+x.id+'" aria-label="Remove '+esc(x.name)+'">'+ICON.x+'</button></div>'}).join(""):'<p class="hint">No streets yet.</p>')+
     '<div class="row" style="margin-top:8px"><input class="in" id="adm-street" placeholder="Add a street, like Maple Court" maxlength="60"><button class="btn sm sun" data-a="adm-add-street">Add</button></div>';
  }else if(t==="storage"){
    var st=S.adm.storage;
    if(!st)h+='<p class="hint">Loading storage...</p>';
    else{h+='<div class="notice"><b>Database size: '+fmtBytes(st.totalBytes)+'</b><p class="sm">Everything the app stores (accounts, posts, photos, messages) lives in one database. Your Railway plan sets the limit.</p></div>'+
     st.items.map(function(x){var c=S.adm.confirm===x.key;return '<div class="sr admrow"><div class="grow"><b>'+esc(x.label)+'</b><span class="muted sm">'+x.count+' item'+(x.count===1?"":"s")+' &middot; '+fmtBytes(x.bytes)+'</span></div>'+(c?'<div class="stack" style="gap:8px"><button class="btn sm need" data-a="adm-clear-yes" data-v="'+x.key+'">Yes, delete all</button><button class="btn sm quiet" data-a="adm-clear-no">Keep</button></div>':'<button class="btn sm need" data-a="adm-clear" data-v="'+x.key+'"'+(x.count?"":" disabled")+'>Clear</button>')+'</div>'}).join("")+
     '<p class="muted sm">To remove a single post or listing, use Delete (admin) on the card in the feed.</p>'}
  }else{
    h+='<div class="notice warn"><b>These cannot be undone.</b><p class="sm">Type DELETE EVERYTHING to unlock the buttons.</p><input class="in" id="adm-confirm" data-in="adm-confirm" placeholder="DELETE EVERYTHING" autocomplete="off"></div>'+
     '<div class="sr admrow"><div class="grow"><b>Clear all content</b><span class="muted sm">Deletes every post, listing, message and report. Keeps accounts, friends, skills and approved streets.</span></div><button class="btn sm need" data-a="adm-wipe" data-v="content">Clear content</button></div>'+
     '<div class="sr admrow"><div class="grow"><b>Wipe everything</b><span class="muted sm">Deletes all accounts, photos, content and the approved street list. Admins can sign in again afterward.</span></div><button class="btn sm need" data-a="adm-wipe" data-v="all">Wipe everything</button></div>';
  }
  return h}
function admPaint(){var m=$("#modal .modal");if(m)m.innerHTML=admView()}
function admLoad(){return api("GET","/api/admin/overview").then(function(d){S.adm.data=d;S.adminN=d.requests.length+d.reports.length;admPaint();var b=$("#admbadge");if(b){b.textContent=S.adminN;b.hidden=!S.adminN}}).catch(fail)}
function admStorage(){return api("GET","/api/admin/storage").then(function(d){S.adm.storage=d;admPaint()}).catch(fail)}
function openAdmin(){S.adm={tab:"requests",data:null};modal(admView(),true);admLoad()}
function toast(msg){var t=$("#toast");t.innerHTML='<div class="toast">'+esc(msg)+'</div>';clearTimeout(toast.t);toast.t=setTimeout(function(){t.innerHTML=""},2800)}
function wm(cls){return '<button class="wm '+(cls||"")+'" data-a="home-logo" aria-label="Favor. for Sutton Fields, home"><span class="wm-t">Favor<i>.</i></span><span class="wm-sub">For Sutton Fields</span></button>'}
function fmtBytes(n){n=+n||0;if(n<1024)return n+" B";if(n<1048576)return (n/1024).toFixed(0)+" KB";if(n<1073741824)return (n/1048576).toFixed(1)+" MB";return (n/1073741824).toFixed(2)+" GB"}
function rateSlider(id,val,unit){
  return '<div class="row"><input type="range" min="0" max="500" step="5" value="'+val+'" data-in="rate" data-id="'+esc(id)+'" aria-label="Rate"><span class="rate-out">'+rateLabel(+val,unit)+'</span></div>'}

/* ---------- graphics: real SVG illustrations ---------- */
var G={};
function ol(shapes,fill){return '<g class="ol">'+shapes+'</g><g class="fl '+fill+'">'+shapes+'</g>'}
G.rays=function(cx,cy,r1,r2,n){var s="";for(var i=0;i<n;i++){var a=i*Math.PI*2/n;s+='<line x1="'+(cx+r1*Math.cos(a)).toFixed(1)+'" y1="'+(cy+r1*Math.sin(a)).toFixed(1)+'" x2="'+(cx+r2*Math.cos(a)).toFixed(1)+'" y2="'+(cy+r2*Math.sin(a)).toFixed(1)+'"/>'}return s};
G.cloud=function(x,y,s,cls){
  var sh='<rect x="0" y="16" width="96" height="28" rx="14"/><circle cx="30" cy="18" r="17"/><circle cx="56" cy="12" r="21"/><circle cx="78" cy="22" r="14"/>';
  return '<g transform="translate('+x+' '+y+') scale('+s+')"><g class="'+(cls||"drift")+'">'+ol(sh,"f-cream")+'</g></g>'};
G.heart=function(x,y,s,cls){return '<path class="o '+(cls||"f-clay")+'" transform="translate('+x+' '+y+') scale('+s+')" d="M0 10C-18 -4 -8 -20 0 -8C8 -20 18 -4 0 10Z"/>'};
G.arm=function(x1,y1,x2,y2,sc){return '<line class="a-o" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/><line class="a-f '+sc+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>'};
G.person=function(cx,base,head,body,arm,mode,delay){
  var top=base-100,hy=base-126,sy=base-86,s='<g class="bob" style="animation-delay:'+(delay||0)+'s">';
  s+='<rect class="o f-brand" x="'+(cx-16)+'" y="'+(base-42)+'" width="12" height="42" rx="6"/><rect class="o f-brand" x="'+(cx+4)+'" y="'+(base-42)+'" width="12" height="42" rx="6"/>';
  s+='<rect class="o '+body+'" x="'+(cx-26)+'" y="'+top+'" width="52" height="64" rx="24"/>';
  if(mode==="wave"){
    s+=G.arm(cx-22,sy,cx-40,base-52,arm)+'<circle class="o '+head+'" cx="'+(cx-40)+'" cy="'+(base-50)+'" r="7"/>';
    s+='<g class="warm" style="transform-origin:'+(cx+22)+'px '+sy+'px">'+G.arm(cx+22,sy,cx+50,base-138,arm)+'<circle class="o '+head+'" cx="'+(cx+50)+'" cy="'+(base-141)+'" r="8"/></g>';
  }else{
    s+='<g class="hop">'+G.arm(cx-22,sy,cx-16,base-62,arm)+G.arm(cx+22,sy,cx+16,base-62,arm)+
       '<rect class="o f-sun" x="'+(cx-19)+'" y="'+(base-78)+'" width="38" height="28" rx="5"/><rect class="o f-clay" x="'+(cx-4)+'" y="'+(base-78)+'" width="8" height="28"/><circle class="o '+head+'" cx="'+(cx-16)+'" cy="'+(base-58)+'" r="7"/><circle class="o '+head+'" cx="'+(cx+16)+'" cy="'+(base-58)+'" r="7"/></g>';
  }
  s+='<circle class="o '+head+'" cx="'+cx+'" cy="'+hy+'" r="27"/>';
  if(mode==="wave")s+='<path class="o f-ink" d="M'+(cx-27)+' '+(hy-3)+'A27 27 0 0 1 '+(cx+27)+' '+(hy-3)+'Q'+cx+' '+(hy-18)+' '+(cx-27)+' '+(hy-3)+'Z"/>';
  else s+='<path class="o f-sun" d="M'+(cx-27)+' '+(hy-4)+'A27 27 0 0 1 '+(cx+27)+' '+(hy-4)+'Z"/><rect class="o f-clay" x="'+(cx-2)+'" y="'+(hy-9)+'" width="36" height="9" rx="4"/>';
  s+='<circle class="f-ink" cx="'+(cx-9)+'" cy="'+(hy+3)+'" r="3.6"/><circle class="f-ink" cx="'+(cx+9)+'" cy="'+(hy+3)+'" r="3.6"/><path class="face" d="M'+(cx-9)+' '+(hy+13)+'Q'+cx+' '+(hy+22)+' '+(cx+9)+' '+(hy+13)+'"/><circle cx="'+(cx-17)+'" cy="'+(hy+11)+'" r="4" fill="var(--clay)" opacity=".45"/><circle cx="'+(cx+17)+'" cy="'+(hy+11)+'" r="4" fill="var(--clay)" opacity=".45"/>';
  return s+'</g>'};
G.sun=function(cx,cy,r){return '<g class="spin" style="transform-origin:'+cx+'px '+cy+'px"><g class="rays">'+G.rays(cx,cy,r+16,r+34,12)+'</g></g><circle class="o f-sun" cx="'+cx+'" cy="'+cy+'" r="'+r+'"/><circle class="f-ink" cx="'+(cx-r*.3)+'" cy="'+(cy-r*.1)+'" r="'+(r*.09)+'"/><circle class="f-ink" cx="'+(cx+r*.3)+'" cy="'+(cy-r*.1)+'" r="'+(r*.09)+'"/><path class="face" d="M'+(cx-r*.3)+' '+(cy+r*.28)+'Q'+cx+' '+(cy+r*.6)+' '+(cx+r*.3)+' '+(cy+r*.28)+'"/>'};
G.sunSvg=function(){return '<svg class="sunsvg" viewBox="0 0 200 200" aria-hidden="true">'+G.sun(100,100,52)+'</svg>'};
G.spark=function(){return '<svg class="sparkle" viewBox="-12 -12 24 24" aria-hidden="true"><path class="o f-clay tw" d="M0 -10L3 -3L10 0L3 3L0 10L-3 3L-10 0L-3 -3Z"/></svg>'};

G.hero=function(){
  var s='<svg class="scene" viewBox="0 0 560 560" role="img" aria-label="Illustration: two neighbors trading a potted plant beside a big shady tree, with a wheelbarrow of seedlings, a bike and butterflies"><defs><clipPath id="sc"><rect x="2" y="2" width="556" height="556" rx="40"/></clipPath></defs>';
  s+='<rect class="f-alt" x="2" y="2" width="556" height="556" rx="40"/><g clip-path="url(#sc)">';
  s+='<g class="px1">'+G.sun(452,104,42)+'</g>';
  s+='<g class="px2">'+G.cloud(60,60,1,"drift")+G.cloud(290,30,.7,"drift b")+'</g>';
  /* far hill + near hill */
  s+='<path class="o f-sage" d="M-10 372C110 322 220 340 300 366C390 394 480 344 570 352L570 570L-10 570Z"/>';
  s+='<path class="o f-sprout" d="M-10 430C120 386 250 404 340 430C440 458 510 416 570 410L570 570L-10 570Z"/>';
  /* big tree */
  s+='<g class="sway" style="transform-origin:280px 400px;animation-duration:7s"><path class="o f-clay" d="M262 410C266 350 268 320 262 278L298 278C292 320 294 350 300 410Z"/>';
  s+='<circle class="o f-brand" cx="210" cy="250" r="58"/><circle class="o f-brand" cx="350" cy="250" r="58"/><circle class="o f-moss" cx="280" cy="196" r="72"/><circle class="o f-moss" cx="232" cy="290" r="44"/><circle class="o f-moss" cx="330" cy="292" r="44"/>';
  [[250,180],[318,214],[214,262],[352,268],[282,286],[290,150]].forEach(function(p,i){s+='<circle class="o '+(i%2?"f-sun":"f-clay")+'" cx="'+p[0]+'" cy="'+p[1]+'" r="10"/>'});
  s+='</g>';
  /* fence */
  s+='<path class="o nf" d="M-10 452H570" style="stroke-width:4"/>';
  for(var i=0;i<12;i++){var x=-6+i*50;s+='<path class="o f-cream" d="M'+x+' 484V436L'+(x+15)+' 424L'+(x+30)+' 436V484Z"/>'}
  /* wheelbarrow */
  s+='<g class="hop" style="animation-duration:5s"><path class="o f-clay" d="M400 470L478 470L466 508L412 508Z"/><circle class="o f-cream" cx="434" cy="516" r="11"/><line class="t-o" x1="478" y1="470" x2="524" y2="446"/>';
  [[418,462],[440,456],[462,462]].forEach(function(p,i){s+='<g class="sway" style="transform-origin:'+p[0]+'px 470px;animation-delay:'+(i*.4)+'s"><path class="o nf" d="M'+p[0]+' 470V'+(p[1]-6)+'"/><ellipse class="o f-sprout" cx="'+(p[0]-7)+'" cy="'+(p[1]-8)+'" rx="9" ry="5"/><ellipse class="o f-sprout" cx="'+(p[0]+7)+'" cy="'+(p[1]-12)+'" rx="9" ry="5"/></g>'});
  s+='</g>';
  /* flowers */
  [[40,520],[130,540],[300,540],[360,528],[520,540]].forEach(function(p,i){s+='<g class="sway" style="transform-origin:'+p[0]+'px '+(p[1]+14)+'px;animation-delay:'+(i*.3)+'s"><path class="o nf" d="M'+p[0]+' '+(p[1]+14)+'V'+p[1]+'"/><circle class="o '+(i%2?"f-sun":"f-blush")+'" cx="'+p[0]+'" cy="'+p[1]+'" r="9"/><circle class="f-ink" cx="'+p[0]+'" cy="'+p[1]+'" r="3"/></g>'});
  /* neighbors trading a plant */
  s+=G.person(96,500,"f-blush","f-sun","s-sun","wave",0);
  s+=G.person(214,506,"f-blush","f-clay","s-clay","gift",.4);
  s+='<g class="hop" style="animation-duration:2.6s"><path class="o f-clay" d="M138 452h26l-4 20h-18z"/><ellipse class="o f-sprout" cx="144" cy="446" rx="10" ry="6" transform="rotate(-30 144 446)"/><ellipse class="o f-sprout" cx="158" cy="444" rx="10" ry="6" transform="rotate(30 158 444)"/></g>';
  /* butterflies */
  [[380,200,0],[500,250,.6],[110,190,1.1]].forEach(function(p){s+='<g class="bob" style="animation-delay:'+p[2]+'s"><g transform="translate('+p[0]+' '+p[1]+')"><ellipse class="o f-blush flap" style="transform-origin:0 0;animation-delay:'+p[2]+'s" cx="-8" cy="-2" rx="9" ry="6"/><ellipse class="o f-sun flap" style="transform-origin:0 0;animation-delay:'+p[2]+'s" cx="8" cy="-2" rx="9" ry="6"/><rect class="f-ink" x="-1.5" y="-7" width="3" height="14" rx="1.5"/></g></g>'});
  /* hearts */
  s+='<g class="rise" style="animation-delay:0s">'+G.heart(150,420,1.1)+'</g><g class="rise" style="animation-delay:1.3s">'+G.heart(360,300,.9,"f-sun")+'</g><g class="rise" style="animation-delay:2.1s">'+G.heart(500,420,.8)+'</g>';
  s+='</g><rect class="o nf" x="2" y="2" width="556" height="556" rx="40" style="stroke-width:3.5"/></svg>';
  return s};
G.mini=function(){return '<svg class="mini" viewBox="0 0 300 150" aria-hidden="true">'+G.sun(244,44,22)+
  '<path class="o f-sprout" d="M-5 112C50 72 120 82 180 107C220 124 260 98 305 90L305 155L-5 155Z"/>'+
  '<rect class="o f-blush" x="58" y="72" width="64" height="52"/><polygon class="o f-clay" points="50,74 90,40 130,74"/><rect class="o f-brand" x="82" y="94" width="16" height="30"/><rect class="o f-sun" x="102" y="84" width="12" height="12"/>'+
  '<path class="o f-brand" d="M-5 132C60 112 140 124 200 134C250 142 280 128 305 122L305 155L-5 155Z" style="stroke-width:3"/>'+
  '<g class="rise">'+G.heart(176,62,.9)+'</g></svg>'};
G.cover=function(n){
  n=+n||0;var v='<svg class="coversvg" viewBox="0 0 300 76" preserveAspectRatio="xMidYMax slice" aria-hidden="true">',e='</svg>';
  function bg(c){return '<rect x="0" y="0" width="300" height="76" style="fill:'+c+'"/>'}
  if(n===1)return v+bg("#e58a4a")+'<circle class="o f-sun" cx="150" cy="58" r="30"/><path class="o f-brand" d="M-5 60C60 46 110 56 160 62C210 68 260 52 305 56L305 80L-5 80Z"/><path class="o f-moss" d="M-5 70C70 62 140 70 210 72C250 74 280 68 305 66L305 80L-5 80Z"/>'+e;
  if(n===2)return v+bg("#1d2b3a")+'<circle class="o f-cream" cx="238" cy="24" r="13"/><circle style="fill:#1d2b3a" cx="244" cy="20" r="11"/>'+[[30,14],[70,30],[110,12],[160,26],[196,10],[276,40],[52,50]].map(function(p){return '<path class="o f-sun" transform="translate('+p[0]+' '+p[1]+') scale(.55)" d="M0 -10L3 -3L10 0L3 3L0 10L-3 3L-10 0L-3 -3Z"/>'}).join("")+'<path class="o f-moss" d="M-5 56C50 44 120 54 180 60C230 64 270 50 305 48L305 80L-5 80Z"/><path class="o f-brand" d="M-5 68C80 60 150 68 220 70C260 71 285 66 305 64L305 80L-5 80Z"/>'+e;
  if(n===3){var fl="";[[24,54,"f-blush"],[62,60,"f-sun"],[104,52,"f-clay"],[146,60,"f-blush"],[188,54,"f-sun"],[232,60,"f-clay"],[272,52,"f-blush"]].forEach(function(f,i){fl+='<path class="o nf" d="M'+f[0]+' '+(f[1]+16)+'V'+f[1]+'"/><circle class="o '+f[2]+'" cx="'+f[0]+'" cy="'+f[1]+'" r="6"/><circle class="f-ink" cx="'+f[0]+'" cy="'+f[1]+'" r="1.8"/>'});return v+bg("#c5d5b0")+'<path class="o f-sprout" d="M-5 40C50 28 110 34 170 44C220 52 262 36 305 32L305 80L-5 80Z"/>'+fl+e}
  if(n===4)return v+bg("#9fc9c2")+G.cloud(20,10,.55,"drift")+G.cloud(170,20,.7,"drift b")+G.cloud(120,4,.4,"drift")+'<path class="o f-sprout" d="M-5 58C60 46 120 56 190 62C240 66 280 54 305 52L305 80L-5 80Z"/>'+e;
  if(n===5)return v+bg("#f4b400")+'<path class="o f-clay" d="M-5 26C50 8 100 40 150 22C200 6 250 38 305 18L305 40C250 60 200 28 150 44C100 60 50 28 -5 46Z"/><path class="o f-blush" d="M-5 52C50 34 100 66 150 48C200 32 250 64 305 44L305 66C250 86 200 54 150 70C100 86 50 54 -5 72Z"/><path class="o f-brand" d="M-5 66C50 52 100 80 150 66C200 54 250 80 305 64L305 90L-5 90Z"/>'+e;
  if(n===6){var hs="";[[26,"f-blush","f-clay"],[112,"f-sage","f-brand"],[204,"f-blush","f-brand"]].forEach(function(h){var x=h[0],y=34;hs+='<rect class="o '+h[1]+'" x="'+x+'" y="'+y+'" width="44" height="34"/><polygon class="o '+h[2]+'" points="'+(x-6)+','+(y+1)+' '+(x+22)+','+(y-22)+' '+(x+50)+','+(y+1)+'"/><rect class="o f-sun" x="'+(x+26)+'" y="'+(y+8)+'" width="9" height="9"/><rect class="o f-brand" x="'+(x+8)+'" y="'+(y+18)+'" width="10" height="16"/>'});return v+bg("#f6d9a8")+G.sun(266,20,10)+'<path class="o f-sprout" d="M-5 62C60 54 130 62 190 66C240 69 280 60 305 58L305 80L-5 80Z"/>'+hs+'<path class="o f-brand" d="M-5 70C70 66 150 72 220 72C260 72 285 70 305 68L305 80L-5 80Z"/>'+e}
  if(n===7){var cf="";[[20,18,"f-sun",5],[58,52,"f-clay",4],[96,20,"f-blush",5],[140,50,"f-sun",6],[178,16,"f-clay",4],[214,48,"f-blush",5],[252,20,"f-sun",5],[280,54,"f-clay",4],[120,34,"f-blush",3],[236,34,"f-sun",3]].forEach(function(c,i){cf+=(i%3===0?'<rect class="o '+c[2]+'" x="'+(c[0]-c[3])+'" y="'+(c[1]-c[3])+'" width="'+c[3]*2+'" height="'+c[3]*2+'" rx="2" transform="rotate('+(i*23)+' '+c[0]+' '+c[1]+')"/>':'<circle class="o '+c[2]+'" cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[3]+'"/>')});return v+bg("#1f5130")+cf+e}
  return v+G.sun(250,22,12)+'<path class="o f-sprout" d="M-5 52C40 30 90 34 140 48C190 62 240 40 305 36L305 80L-5 80Z"/><path class="o f-moss" d="M-5 66C60 50 130 58 190 66C240 72 280 62 305 58L305 80L-5 80Z"/><circle class="o f-sun" cx="60" cy="44" r="4"/><circle class="o f-blush" cx="96" cy="52" r="4"/><circle class="o f-sun" cx="208" cy="56" r="4"/>'+e};
var BANNER_NAMES=["Sunny hills","Sunset","Night sky","Meadow","Blue sky","Waves","Little village","Confetti"];
G.strip=function(){
  var s='<svg class="strip" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path class="o f-sprout" d="M-10 110C150 70 300 90 450 120C600 150 760 80 900 100C1040 120 1120 90 1210 84L1210 210L-10 210Z"/>';
  [[120,110,"f-blush","f-clay"],[520,124,"f-sage","f-brand"],[930,102,"f-blush","f-brand"]].forEach(function(h){var x=h[0],y=h[1];s+='<rect class="o '+h[2]+'" x="'+x+'" y="'+y+'" width="70" height="56"/><polygon class="o '+h[3]+'" points="'+(x-8)+','+(y+2)+' '+(x+35)+','+(y-34)+' '+(x+78)+','+(y+2)+'"/><rect class="o f-sun" x="'+(x+40)+'" y="'+(y+14)+'" width="14" height="14"/>'});
  s+='<path class="o f-brand" d="M-10 160C200 130 420 170 640 156C860 142 1020 176 1210 150L1210 210L-10 210Z"/>';
  for(var i=0;i<14;i++){var x=40+i*86+(i%3)*10,y=182+(i%2)*8;s+='<g class="sway" style="transform-origin:'+x+'px '+(y+12)+'px;animation-delay:'+(i*.2)+'s"><path class="o nf" d="M'+x+' '+(y+12)+'V'+y+'"/><circle class="o '+(i%3===0?"f-sun":i%3===1?"f-blush":"f-cream")+'" cx="'+x+'" cy="'+y+'" r="6"/></g>'}
  return s+'</svg>'};
G.sprout=function(st){
  var h=[30,50,66][st],ty=80-h;
  function leaf(d,y){var x=60+d*14;return '<ellipse class="o f-sprout" cx="'+x+'" cy="'+y+'" rx="14" ry="7" transform="rotate('+(-d*28)+' '+x+' '+y+')"/>'}
  var s='<svg class="sproutsvg" viewBox="0 0 120 120" aria-hidden="true"><path class="o f-clay" d="M34 88h52l-6 28H40z"/><rect class="o f-clay" x="28" y="80" width="64" height="12" rx="5"/><g class="grow-s sway" style="transform-origin:60px 80px"><path class="o nf" style="stroke-width:5" d="M60 80V'+ty+'"/>';
  if(st>=1)s+=leaf(-1,80-h*.45)+leaf(1,80-h*.6);
  s+=leaf(-1,ty+4)+leaf(1,ty+4);
  if(st===2)s+='<g class="spin" style="transform-origin:60px '+(ty-6)+'px;animation-duration:14s">'+[0,1,2,3,4,5].map(function(i){var a=i*Math.PI/3;return '<circle class="o f-sun" cx="'+(60+13*Math.cos(a)).toFixed(1)+'" cy="'+(ty-6+13*Math.sin(a)).toFixed(1)+'" r="8"/>'}).join("")+'</g><circle class="o f-clay" cx="60" cy="'+(ty-6)+'" r="8"/>';
  return s+'</g></svg>'};
G.megaphone=function(){return '<svg class="spot" viewBox="0 0 120 100" aria-hidden="true"><g class="bob"><path class="o f-clay" d="M34 38L86 14V78L34 62Z"/><rect class="o f-sun" x="16" y="36" width="20" height="28" rx="6"/><rect class="o f-brand" x="38" y="62" width="14" height="24" rx="5" transform="rotate(-12 45 62)"/></g><path class="o nf sw" style="stroke-width:4.5" d="M98 34q8 16 0 32"/><path class="o nf sw" style="stroke-width:4.5;animation-delay:.3s" d="M108 26q13 24 0 48"/></svg>'};
G.toolbox=function(){return '<svg class="spot" viewBox="0 0 120 100" aria-hidden="true"><path class="o nf" style="stroke-width:5" d="M42 34V20H78V34"/><g class="bob" style="animation-delay:.3s"><g transform="rotate(28 98 30)"><rect class="o f-sage" x="93" y="6" width="9" height="34" rx="4.5"/></g></g><rect class="o f-sun" x="18" y="42" width="84" height="46" rx="8"/><g class="lid"><rect class="o f-clay" x="14" y="30" width="92" height="16" rx="6"/></g><rect class="o f-cream" x="52" y="50" width="16" height="16" rx="3"/></svg>'};
G.thanks=function(){var st=function(x,y,d){return '<g transform="translate('+x+' '+y+')"><path class="o f-sun tw" style="animation-delay:'+d+'s" d="M0 -9L3 -3L9 0L3 3L0 9L-3 3L-9 0L-3 -3Z"/></g>'};
  return '<svg class="spot" viewBox="0 0 120 100" aria-hidden="true"><g class="beat"><path class="o f-clay" d="M60 88C20 62 30 20 60 40C90 20 100 62 60 88Z"/><circle class="f-ink" cx="49" cy="52" r="3.6"/><circle class="f-ink" cx="71" cy="52" r="3.6"/><path class="face" d="M52 63Q60 71 68 63"/></g>'+st(16,26,0)+st(104,30,.6)+st(100,84,1.1)+st(20,80,1.5)+'</svg>'};
G.empty=function(){return G.sprout(1)};

var ICOS={
 speaker:'<rect class="o f-clay" x="12" y="5" width="24" height="38" rx="6"/><circle class="o f-cream" cx="24" cy="29" r="9"/><circle class="f-ink" cx="24" cy="29" r="3.5"/><circle class="o f-cream" cx="24" cy="14" r="3.6"/>',
 mic:'<rect class="o f-sage" x="16" y="4" width="16" height="24" rx="8"/><path class="o nf" d="M16 14h16M16 20h16M10 24a14 14 0 0 0 28 0M24 38v6M16 44h16"/>',
 paw:'<ellipse class="o f-brand" cx="24" cy="31" rx="11" ry="9"/><circle class="o f-brand" cx="10" cy="21" r="4.6"/><circle class="o f-brand" cx="19" cy="12" r="4.6"/><circle class="o f-brand" cx="29" cy="12" r="4.6"/><circle class="o f-brand" cx="38" cy="21" r="4.6"/>',
 cake:'<rect class="o f-blush" x="7" y="24" width="34" height="17" rx="4"/><path class="o f-cream" d="M7 28q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q2 3 2 0V24H7z"/><rect class="o f-brand" x="22" y="12" width="4" height="12"/><path class="o f-sun" d="M24 3q5 4 0 8q-5-4 0-8z"/>',
 bike:'<circle class="o nf" cx="11" cy="32" r="8"/><circle class="o nf" cx="37" cy="32" r="8"/><path class="o nf" d="M11 32l8-15h12l6 15M19 17l7 15H11M31 17l-2-6h5"/>',
 couch:'<rect class="o f-brand" x="9" y="10" width="30" height="16" rx="6"/><rect class="o f-clay" x="4" y="20" width="10" height="18" rx="5"/><rect class="o f-clay" x="34" y="20" width="10" height="18" rx="5"/><rect class="o f-clay" x="10" y="24" width="28" height="14" rx="4"/><path class="o nf" d="M12 38v5M36 38v5"/>',
 brush:'<rect class="o f-sun" x="6" y="6" width="30" height="13" rx="4"/><path class="o nf" d="M36 12h5v14H24v6"/><rect class="o f-brand" x="20" y="32" width="8" height="12" rx="3"/>',
 book:'<path class="o f-cream" d="M24 11C18 7 10 7 5 9v30c5-2 13-2 19 2z"/><path class="o f-sun" d="M24 11c6-4 14-4 19-2v30c-5-2-13-2-19 2z"/><path class="o nf" d="M11 16h8M11 22h8M29 16h8M29 22h8"/>',
 leaf:'<path class="o f-sprout" d="M8 40C5 20 20 6 42 6c0 22-12 36-34 34z"/><path class="o nf" d="M8 40L28 20"/>',
 camera:'<rect class="o f-sage" x="4" y="13" width="40" height="27" rx="6"/><rect class="o f-ink" x="16" y="7" width="16" height="8" rx="3"/><circle class="o f-cream" cx="24" cy="27" r="9"/><circle class="o f-brand" cx="24" cy="27" r="4"/>',
 ladder:'<line class="t-o" x1="14" y1="4" x2="10" y2="44"/><line class="t-o" x1="34" y1="4" x2="38" y2="44"/><line class="t-o" x1="12" y1="14" x2="36" y2="14"/><line class="t-o" x1="11" y1="24" x2="37" y2="24"/><line class="t-o" x1="10" y1="34" x2="38" y2="34"/><line class="t-f s-sun" x1="14" y1="4" x2="10" y2="44"/><line class="t-f s-sun" x1="34" y1="4" x2="38" y2="44"/><line class="t-f s-sun" x1="12" y1="14" x2="36" y2="14"/><line class="t-f s-sun" x1="11" y1="24" x2="37" y2="24"/><line class="t-f s-sun" x1="10" y1="34" x2="38" y2="34"/>',
 wrench:'<g transform="rotate(45 24 24)"><rect class="o f-sage" x="20" y="16" width="8" height="28" rx="4"/><path class="o f-sun" d="M14 4h6v8h8V4h6v10a10 10 0 0 1-20 0z"/></g>'
};
function iconName(t){t=t.toLowerCase();
  if(/microphone|\bmic\b/.test(t))return "mic";if(/sound|speaker|audio|music/.test(t))return "speaker";
  if(/dog|pet|biscuit|walk/.test(t))return "paw";if(/cake|bake|mixer|cook/.test(t))return "cake";
  if(/bike/.test(t))return "bike";if(/couch|move|haul|truck/.test(t))return "couch";
  if(/deck|paint|stain/.test(t))return "brush";if(/math|tutor|tax|book|lesson/.test(t))return "book";
  if(/lawn|leaf|garden/.test(t))return "leaf";if(/photo|camera/.test(t))return "camera";
  if(/ladder/.test(t))return "ladder";return "wrench"}
var ICON_KEYS=["speaker","mic","paw","cake","bike","couch","brush","book","leaf","camera","ladder","wrench"];
function ico(text,cls,forced){var n=(forced&&ICOS[forced])?forced:iconName(text),k=0;for(var i=0;i<n.length;i++)k+=n.charCodeAt(i);
  return '<div class="ib '+(cls||"")+' ib'+(k%4)+'"><svg viewBox="0 0 48 48" aria-hidden="true">'+ICOS[n]+'</svg></div>'}
function iconPicker(sel){
  return '<div class="field"><span class="lbl">Icon</span><div class="iconpick" role="group" aria-label="Choose an icon">'+
   '<button class="ipk'+(!sel?" on":"")+'" data-a="picon" data-v="" aria-pressed="'+!sel+'" aria-label="Auto">'+'<span class="ipk-auto">Auto</span></button>'+
   ICON_KEYS.map(function(k){return '<button class="ipk'+(sel===k?" on":"")+'" data-a="picon" data-v="'+k+'" aria-pressed="'+(sel===k)+'" aria-label="'+k+'"><svg viewBox="0 0 48 48" aria-hidden="true">'+ICOS[k]+'</svg></button>'}).join("")+
   '</div></div>'}

/* ---------- motion helpers ---------- */
var RM=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var COL=["--marigold","--clay","--sprout","--brand","--moss","--blush"];
var LASTPT={x:window.innerWidth/2,y:window.innerHeight/2};
function burst(x,y,n,mode){
  if(RM||!document.body.animate)return;
  for(var i=0;i<n;i++){
    var d=document.createElement("div"),c=COL[Math.floor(Math.random()*COL.length)],sz=8+Math.random()*9;
    if(mode==="heart"){d.style.cssText="position:fixed;left:"+x+"px;top:"+y+"px;width:22px;height:22px;z-index:90;pointer-events:none";d.innerHTML='<svg viewBox="-12 -12 24 24" width="22" height="22"><path d="M0 9C-16 -3-7 -17 0 -7C7 -17 16 -3 0 9Z" fill="var(--clay)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/></svg>'}
    else d.style.cssText="position:fixed;left:"+x+"px;top:"+y+"px;width:"+sz+"px;height:"+sz+"px;background:var("+c+");border:2px solid var(--ink);z-index:90;pointer-events:none;border-radius:"+(Math.random()<.5?"50%":"3px");
    document.body.appendChild(d);
    var ang=Math.random()*Math.PI*2,dist=(mode==="heart"?40:70)+Math.random()*(mode==="heart"?70:150),dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist-(mode==="heart"?70:60),rot=Math.random()*720-360;
    var a=d.animate([{transform:"translate(0,0) rotate(0deg) scale(.6)",opacity:1},{transform:"translate("+dx+"px,"+dy+"px) rotate("+rot/2+"deg) scale(1)",opacity:1,offset:.45},{transform:"translate("+dx*1.15+"px,"+(dy+(mode==="heart"?-40:230))+"px) rotate("+rot+"deg) scale(.7)",opacity:0}],{duration:1000+Math.random()*600,easing:"cubic-bezier(.2,.7,.3,1)"});
    a.onfinish=(function(el){return function(){el.remove()}})(d);
  }
}

/* ---------- landing ---------- */
function landing(){
  var tick=["Sound systems","Borrow a ladder","Dog walking","Math tutoring","Deck staining","Bike repair","Cake baking","Pro microphones","Lawn care","Moving help","Photography","Sewing"];
  var tk=tick.map(function(t){return "<span>"+t+"</span>"+G.spark()}).join("");
  var words=["Together,","anything","is","possible"];
  var h=words.map(function(w,i){return '<span class="w" style="--d:'+(i*120)+'ms">'+w+(i===3?"<i>.</i>":"")+'</span>'}).join(" ");
  return '<div class="wrap"><nav class="nav">'+wm()+
   '<div class="row"><button class="btn quiet sm" data-a="google" data-v="login">Log in</button><button class="btn sm" data-a="google" data-v="signup">Sign up</button></div></nav>'+
   '<section class="hero"><div><p class="eyebrow">Sutton Fields, help each other</p>'+
   '<h1 style="margin-top:12px">'+h+'</h1>'+
   '<div class="cta"><button class="btn lg gbtn" data-a="google" data-v="signup"><span class="gmark">G</span>Continue with Google</button><a class="btn lg sun" href="#how" data-a="scroll" data-v="how">See how it works</a></div>'+
   '</div>'+
   '<div class="art" id="art"><img class="heroPhoto" src="/images/hero-sutton-fields.jpg" alt="A street in Sutton Fields lined with neighboring homes and driveways" loading="eager" width="1200" height="1200">'+
   '<div class="a-sticker s1"><span class="chip need">Needs a hand</span><h3>Borrow a ladder this weekend</h3><div class="row wrapf">'+rateChip(0,"flat","Budget ")+'<span class="chip">Clover Lane</span></div></div>'+
   '<div class="a-sticker s2"><span class="chip skill">Skill</span><h3>Lawn care, weekends</h3><div class="row wrapf">'+rateChip(35,"hr")+'<span class="chip">Maple Ct</span></div></div></div></section></div>'+
   '<div class="ticker" aria-hidden="true"><div>'+tk+tk+'</div></div>'+
   '<div class="wrap"><section class="section place"><div class="place-fig rv"><img src="/images/sutton-fields-sign.jpg" alt="The Sutton Fields neighborhood entrance sign" loading="lazy"><div class="place-cap"><p class="eyebrow">Right here in Sutton Fields</p><h2 style="margin-top:6px">A real neighborhood, not an app full of strangers.</h2><p class="muted" style="font-size:17px">Favor. is just for the folks who live here &mdash; so the person borrowing your ladder is the same one who waves at you on trash day.</p></div></div></section>'+
   '<section class="section" id="how"><p class="eyebrow">How it works</p><h2 class="rv" style="margin-top:10px">Three moves. That is the whole app.</h2>'+
   '<div class="steps">'+
   '<div class="card step rv">'+G.megaphone()+'<p class="eyebrow">Step 1</p><h3>Post what you need</h3></div>'+
   '<div class="card step rv" style="transition-delay:.12s">'+G.toolbox()+'<p class="eyebrow">Step 2</p><h3>List what you can do</h3></div>'+
   '<div class="card step rv" style="transition-delay:.24s">'+G.thanks()+'<p class="eyebrow">Step 3</p><h3>Message and say thanks</h3></div></div></section>'+
   '<section class="section" style="padding-top:0"><div class="big-cta rv"><h2>Ready to lend a hand?</h2><p style="max-width:44ch;font-size:18px">Join in under a minute. Sign in with Google, tell us your street, pick a few skills.</p><button class="btn lg gbtn" data-a="google" data-v="signup"><span class="gmark">G</span>Continue with Google</button><div class="cta-sun" aria-hidden="true">'+G.sunSvg()+'</div></div></section>'+
   '<footer class="f">'+wm()+'<p class="muted sm">Together, anything is possible.</p></footer></div>'
}

/* ---------- onboarding ---------- */
function onboarding(){
  var s=S.step,prog='<div class="prog" aria-label="Step '+(s+1)+' of 3">'+[0,1,2].map(function(i){return '<i class="'+(i<=s?"on":"")+'"></i>'}).join("")+'</div>';
  var head=[["Step 1 of 3","Hi, neighbor. Tell us who you are."],["Step 2 of 3","What can you help with?"],["Step 3 of 3","Follow a few neighbors."]][s];
  var body="";
  if(s===0){
    body='<div class="field"><label for="ob-name">Your name</label><input class="in" id="ob-name" data-in="me-name" value="'+esc(S.me.name)+'" autocomplete="name"></div>'+
    photoRow()+addrField()+
    '<div class="field"><span class="lbl">How can neighbors reach you?</span><div class="opts">'+
    [["messages","Favor. messages only","Safest. Chat stays inside the app."],["phone","Messages and my phone number","Shown on your profile to neighbors."]].map(function(o){
      return '<label class="opt"><input type="radio" name="contact" data-in="me-contact" value="'+o[0]+'"'+(S.me.contact===o[0]?" checked":"")+'><span><b>'+o[1]+'</b><br><span class="muted sm">'+o[2]+'</span></span></label>'}).join("")+'</div></div>'+
    (S.me.contact==="phone"?'<div class="field"><label for="ob-phone">Phone number</label><input class="in" id="ob-phone" type="tel" data-in="me-phone" value="'+esc(S.me.phone)+'" autocomplete="tel"></div>':"")+'<div class="actions"><span class="demo-note">You can change this any time.</span><button class="btn" data-a="ob-next">Next: your skills</button></div>';
  }else if(s===1){
    var chosen=S.ob.skills;
    body='<p class="muted">Pick a few, then set a rate for each. Free is welcome. Rates go up to $500.</p>'+
    '<div class="chips">'+SUGGESTED.map(function(n){var on=chosen.some(function(c){return c.n===n});return '<button class="chip'+(on?" on":"")+'" data-a="ob-skill" data-v="'+esc(n)+'" aria-pressed="'+on+'">'+(on?"&#10003; ":"")+esc(n)+'</button>'}).join("")+'</div>'+
    '<div class="row"><input class="in" id="ob-custom" placeholder="Something else you can do" data-in="custom" aria-label="Add another skill"><button class="btn sm sun" data-a="ob-add-custom">Add</button></div>'+
    (chosen.length?'<div class="stack">'+chosen.map(function(c,i){return '<div class="sk-row"><div class="top2"><span class="nm" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">'+ico(c.n,"xs")+'<input class="in skname" data-in="ob-skname" data-id="'+i+'" value="'+esc(c.n)+'" maxlength="60" aria-label="Skill name"></span><span class="seg" role="group" aria-label="Rate type"><button class="'+(c.u==="hr"?"on":"")+'" data-a="ob-unit" data-id="'+i+'" data-v="hr">per hour</button><button class="'+(c.u==="flat"?"on":"")+'" data-a="ob-unit" data-id="'+i+'" data-v="flat">flat</button></span><button class="x btn sm quiet" data-a="ob-del" data-id="'+i+'" aria-label="Remove '+esc(c.n)+'">'+ICON.x+'</button></div>'+rateSlider("ob:"+i,c.r,c.u)+'</div>'}).join("")+'</div>':'<p class="hint">No skills yet. You can skip this and just ask for help.</p>')+
    '<div class="actions"><button class="btn quiet" data-a="ob-back">Back</button><button class="btn" data-a="ob-next">Next: your neighbors</button></div>';
  }else{
    body='<p class="muted">Friends show up in your sidebar so you can message them fast.</p><div class="friendpick">'+
    S.people.slice(0,8).map(function(p){var on=S.friends[p.id];return '<div class="fp">'+av(p)+'<div class="grow"><b>'+esc(p.name)+'</b><div class="muted sm">'+esc(p.street)+' &middot; '+p.done+' favors done</div></div><button class="btn sm '+(on?"":"sun")+'" data-a="friend" data-id="'+p.id+'">'+(on?"Added":"Add")+'</button></div>'}).join("")+(S.people.length?"":'<p class="hint">You are one of the first neighbors here. Anyone you add later shows up in your sidebar.</p>')+'</div>'+
    '<div class="actions"><button class="btn quiet" data-a="ob-back">Back</button><button class="btn need" data-a="ob-finish">Finish and see Favor.</button></div>';
  }
  var pan=S._pan?" pop":"";S._pan=false;
  return '<div class="ob"><div class="deco-sun" aria-hidden="true">'+G.sunSvg()+'</div><div class="deco-strip" aria-hidden="true">'+G.strip()+'</div><div class="top">'+wm()+'<button class="link" data-a="logout">Cancel</button></div>'+prog+
   '<div class="panel'+pan+'"><div class="ob-head">'+G.sprout(s)+'<div><p class="eyebrow">'+head[0]+'</p><h1>'+head[1]+'</h1></div></div>'+body+'</div></div>'
}

/* ---------- app ---------- */
function listingCard(l,demo){
  var p=person(l.by),mine=l.by==="me",who=mine?S.me:p,name=who.name,street=mine?S.me.street:p.street;
  var kindLabel={need:"Needs a hand",borrow:"Borrow",offer:"Offer"}[l.kind];
  var xtra=(mine||demo)?"":'<button class="btn sm quiet" data-a="report" data-kind="listing" data-id="'+l.id+'" aria-label="Report this listing" title="Report">'+ICON.flag+'</button>'+(S.me.isAdmin?'<button class="btn sm quiet" data-a="admin-del" data-kind="listing" data-id="'+l.id+'">Delete (admin)</button>':"");
  var chips=(l.kind==="need"?rateChip(l.r,l.u,"Budget "):rateChip(l.r,l.u));
  var cta=mine?'<button class="btn sm quiet" data-a="del-listing" data-id="'+l.id+'">Remove</button>':
    '<button class="btn sm '+(l.kind==="need"?"need":"sun")+'" data-a="msg" data-id="'+l.by+'" data-ref="'+esc(l.title)+'"'+(demo?' data-demo="1"':"")+'>'+ICON.msg+(l.kind==="need"?"I can help":l.kind==="borrow"?"I can lend":"Message "+esc(name.split(" ")[0]))+'</button>';
  return '<article class="card listing '+(l.kind==="need"?"need":"")+'"><div class="lh">'+ico(l.title+" "+l.body,"",l.icon)+'<div class="grow"><p class="eyebrow">'+kindLabel+' &middot; '+esc(street)+'</p><h3>'+esc(l.title)+'</h3></div></div><p class="muted">'+esc(l.body)+'</p><div class="row wrapf">'+(l.kind==="need"?'<span class="chip need">Needs a hand</span>':"")+chips+'</div>'+
   '<div class="foot"><div class="who">'+av(who,"s")+'<div><b>'+esc(name)+(mine?'<span class="tag-you">You</span>':"")+'</b><span class="muted sm">'+l.when+'</span></div></div><div class="row wrapf" style="gap:8px">'+cta+xtra+'</div></div></article>'
}
function postCard(p){
  var mine=p.by==="me",who=mine?S.me:person(p.by),name=who.name;
  var liked=p.liked,n=p.likes;
  return '<article class="card post"><div class="row">'+av(who)+'<div class="grow"><b>'+esc(name)+(mine?'<span class="tag-you">You</span>':"")+'</b><div class="muted sm">'+esc(mine?S.me.street:person(p.by).street)+' &middot; '+p.when+'</div></div></div><p class="ptext">'+esc(p.text)+'</p>'+(p.img?'<button class="pimgwrap" data-a="view-img" data-id="'+p.id+'" aria-label="View photo larger"><img class="pimg" loading="lazy" src="/api/posts/'+p.id+'/image" alt="Photo shared by '+esc(name)+'"></button>':"")+
  '<div class="acts"><button class="btn sm heart-btn '+(liked?"need on":"quiet")+'" data-a="like" data-id="'+p.id+'" aria-pressed="'+!!liked+'">'+ICON.heart+(liked?"Thanked":"Say thanks")+' &middot; '+n+'</button>'+(mine?'<button class="btn sm quiet" data-a="del-post" data-id="'+p.id+'">Delete</button>':'<button class="btn sm quiet" data-a="msg" data-id="'+p.by+'" data-ref="your post">'+ICON.msg+'Reply</button>')+(mine?"":'<button class="btn sm quiet" data-a="report" data-kind="post" data-id="'+p.id+'" aria-label="Report this post" title="Report">'+ICON.flag+'</button>')+(S.me.isAdmin&&!mine?'<button class="btn sm quiet" data-a="admin-del" data-kind="post" data-id="'+p.id+'">Delete (admin)</button>':"")+'</div></article>'
}
function shell(){
  return '<header class="topbar"><div class="wrap in-bar">'+wm()+
   '<div class="search">'+ICON.search+'<input id="q" type="search" placeholder="Search needs, skills, posts, neighbors" aria-label="Search Favor." value="'+esc(S.q)+'" autocomplete="off" data-in="q">'+
   '<button class="x" id="qx" data-a="clear-q" aria-label="Clear search" '+(S.q?"":"hidden")+'>'+ICON.x+'</button></div>'+
   '<div class="row">'+(S.me.isAdmin?'<button class="btn sm quiet" data-a="admin">Admin<span class="badge" id="admbadge"'+(S.adminN?"":" hidden")+'>'+(S.adminN||0)+'</span></button>':"")+'<button class="btn sm sun" data-a="inbox" aria-label="Messages">'+ICON.msg+'<span class="inbox-label">Messages</span><span class="badge" id="badge"'+(S.unread?"":" hidden")+'>'+S.unread+'</span></button>'+av(S.me,"s")+'<button class="btn sm quiet" data-a="logout">Log out</button></div></div></header>'+
   '<div class="wrap grid"><aside id="left" class="stack" style="align-content:start"></aside><main id="main" class="stack" style="align-content:start"></main><aside id="right" class="stack" style="align-content:start"></aside></div>'
}
function renderLeft(){
  var m=S.me,fc=Object.keys(S.friends).length;
  var sk=m.skills.length?m.skills.map(function(s,i){return '<div class="skrow"><span class="nm">'+ico(s.n,"xs")+'<span>'+esc(s.n)+'</span></span><span class="row" style="gap:6px">'+rateChip(s.r,s.u)+'<button class="x edit" data-a="edit-skill" data-id="'+s.id+'" aria-label="Edit '+esc(s.n)+'">'+ICON.pen+'</button><button class="x" data-a="del-skill" data-id="'+s.id+'" aria-label="Remove '+esc(s.n)+'">'+ICON.x+'</button></span></div>'}).join(""):'<p class="hint">Add a skill so neighbors can find you.</p>';
  $("#left").innerHTML='<section class="card profile"><div class="cover">'+G.cover(m.banner)+'<button class="bnbtn" data-a="pick-banner">Change banner</button></div><div class="body">'+av(m,"big")+
   '<div><h2>'+esc(m.name)+'</h2><p class="muted sm">Sutton Fields &middot; '+esc(m.street)+'</p></div>'+
   '<div class="stats"><div class="stat"><b>0</b><span>Favors done</span></div><div class="stat"><b>'+fc+'</b><span>Neighbors</span></div><div class="stat"><b>'+m.skills.length+'</b><span>Skills</span></div></div>'+
   '<p class="sm muted">'+(m.contact==="phone"?"Neighbors can message you or call.":"Neighbors reach you by Favor. message.")+'</p>'+
   '<button class="btn sm quiet" data-a="edit-profile">Edit profile</button></div></section>'+
   '<section class="card"><div class="hd"><h2>My skills</h2><button class="btn sm sun" data-a="add-skill">'+ICON.plus+'Add</button></div><div class="stack" style="gap:8px">'+sk+'</div></section>'
}
function renderRight(){
  var fr=S.people.filter(function(p){return S.friends[p.id]}),oth=S.people.filter(function(p){return !S.friends[p.id]}).slice(0,4);
  var mine=S.listings.filter(function(l){return l.by==="me"});
  $("#right").innerHTML=
   '<section class="card"><div class="hd"><h2>Friends</h2><span class="chip">'+fr.length+'</span></div>'+
   (fr.length?fr.map(function(p){return '<div class="pers">'+av(p,"s")+'<div class="grow"><b>'+esc(p.name)+'</b><span class="muted sm">'+esc(p.street)+'</span></div><button class="btn sm quiet" data-a="msg" data-id="'+p.id+'" data-ref="" aria-label="Message '+esc(p.name)+'">'+ICON.msg+'</button></div>'}).join(""):'<p class="hint">No friends yet. Add a few below.</p>')+'</section>'+
   '<section class="card"><div class="hd"><h2>Neighbors you may know</h2></div>'+oth.map(function(p){return '<div class="pers">'+av(p,"s")+'<div class="grow"><b>'+esc(p.name)+'</b><span class="muted sm">'+p.skills.length+' skills &middot; '+esc(p.street)+'</span></div><button class="btn sm sun" data-a="friend" data-id="'+p.id+'">Add</button></div>'}).join("")+(oth.length?"":'<p class="hint">You know everyone. Nice.</p>')+'</section>'+
   '<section class="card"><div class="hd"><h2>My listings</h2></div>'+(mine.length?mine.map(function(l){return '<div class="pers"><div class="grow"><b>'+esc(l.title)+'</b><span class="muted sm">'+(l.kind==="need"?"Needs a hand":"Borrow")+' &middot; '+l.when+'</span></div>'+rateChip(l.r,l.u)+'</div>'}).join(""):'<p class="hint">Nothing posted yet. Need a hand with something?</p><button class="btn sm need" style="margin-top:12px" data-a="post-need">Post a need</button>')+'</section>'
}
function matches(q,arr){var t=q.toLowerCase().split(/\s+/).filter(Boolean);var h=arr.join(" ").toLowerCase();return t.every(function(w){return h.indexOf(w)>-1})}
function popc(html,i){if(!S.pop)return html;return html.replace(/^<(\w+)/,'<$1 style="--d:'+Math.min(i,8)*70+'ms"').replace('class="','class="pop ')}
function emptyCard(title,msg,btn){return '<div class="card empty">'+G.empty()+'<h3>'+title+'</h3><p class="muted">'+msg+'</p>'+(btn||"")+'</div>'}
function renderMain(){
  var el=$("#main"),q=S.q.trim();$("#qx").hidden=!S.q;
  var pop=S.pop;
  if(q){
    var ls=S.listings.filter(function(l){var p=l.by==="me"?{name:S.me.name,street:S.me.street}:person(l.by);return matches(q,[l.title,l.body,l.kind==="need"?"needs a hand need":l.kind,p.name,p.street,l.r?"$"+l.r:"free"])});
    var sk=[];S.people.forEach(function(p){p.skills.forEach(function(s){if(matches(q,[s.n,p.name,p.street,s.r?"$"+s.r:"free"]))sk.push({p:p,s:s})})});
    var ps=S.posts.filter(function(p){var n=p.by==="me"?S.me.name:person(p.by).name;return matches(q,[p.text,n])});
    var pe=S.people.filter(function(p){return matches(q,[p.name,p.street])});
    var total=ls.length+sk.length+ps.length+pe.length;
    var out='<div><p class="eyebrow">Search</p><h1 class="sec-title" style="font-size:40px">'+total+' result'+(total===1?"":"s")+' for &ldquo;'+esc(q)+'&rdquo;</h1></div>';
    if(!total)out+=emptyCard("Nothing yet.","Nobody has posted that on Favor. Be the first to ask.",'<button class="btn need" data-a="post-need">Post a need</button>');
    if(sk.length)out+='<h2 class="sec-title">Skills</h2><div class="stack" style="gap:10px">'+sk.slice(0,8).map(function(x){return '<div class="sr">'+ico(x.s.n,"xs")+'<div class="grow"><b>'+esc(x.s.n)+'</b><span class="muted sm">'+esc(x.p.name)+' &middot; '+esc(x.p.street)+'</span></div>'+rateChip(x.s.r,x.s.u)+'<button class="btn sm sun" data-a="msg" data-id="'+x.p.id+'" data-ref="'+esc(x.s.n)+'">'+ICON.msg+'Message</button></div>'}).join("")+'</div>';
    if(ls.length)out+='<h2 class="sec-title">Needs and listings</h2>'+ls.map(function(l,i){return popc(listingCard(l),i)}).join("");
    if(ps.length)out+='<h2 class="sec-title">Posts</h2>'+ps.map(function(p,i){return popc(postCard(p),i)}).join("");
    if(pe.length)out+='<h2 class="sec-title">Neighbors</h2><div class="stack" style="gap:10px">'+pe.map(function(p){return '<div class="sr">'+av(p,"s")+'<div class="grow"><b>'+esc(p.name)+'</b><span class="muted sm">'+esc(p.street)+' &middot; '+p.done+' favors done</span></div><button class="btn sm '+(S.friends[p.id]?"quiet":"sun")+'" data-a="friend" data-id="'+p.id+'">'+(S.friends[p.id]?"Friends":"Add")+'</button></div>'}).join("")+'</div>';
    el.innerHTML=out;S.pop=false;return;
  }
  var welcome='<section class="card welcome'+(pop?" pop":"")+'"><p class="eyebrow" style="color:var(--on-brand);opacity:.85">Good to see you</p><h2 style="font:400 clamp(30px,5vw,44px)/1 var(--font-display);margin:6px 0 14px">Hi '+esc(S.me.name.split(" ")[0])+'. Who needs a hand today?</h2><div class="actionbar"><button class="btn need" data-a="post-need">Post a need</button><button class="btn sun" data-a="add-skill">Offer a skill</button></div>'+G.mini()+'</section>';
  var composer='<section class="card cmp stack" style="gap:12px"><label class="lbl" for="np">Share something with the street</label><textarea class="in" id="np" maxlength="300" placeholder="Thank a neighbor, announce a swap, ask for tips..." data-in="draft">'+esc(S.draft)+'</textarea>'+
   (S.pimgUrl?'<div class="pprev"><img src="'+S.pimgUrl+'" alt="Photo you are about to post"><button class="btn sm quiet" data-a="rm-pimg">Remove photo</button></div>':"")+
   '<div class="row" style="justify-content:space-between"><div class="row wrapf" style="gap:10px"><label class="btn sm sun" for="pimgfile" tabindex="0">'+ICON.img+(S.pimgUrl?"Change photo":"Add photo")+'</label><span class="muted sm">Photos up to 30 MB</span></div><div class="row" style="gap:12px"><span class="cnt'+(S.draft.length>=300?" over":"")+'" id="cnt">'+S.draft.length+'/300</span><button class="btn sm" data-a="post-text">Post</button></div></div><input type="file" id="pimgfile" accept="image/*" hidden></section>';
  var F=[["all","All"],["post","Posts"],["need","Needs a hand"],["offer","Offers"],["free","Free only"]];
  var items=[];
  S.listings.forEach(function(l){var pass=S.filter==="all"||(S.filter==="free"?!l.r:S.filter==="need"?(l.kind==="need"||l.kind==="borrow"):l.kind===S.filter);if(pass)items.push({ts:l.ts||0,h:function(){return listingCard(l)}})});
  if(S.filter==="all"||S.filter==="post")S.posts.forEach(function(p){items.push({ts:p.ts||0,h:function(){return postCard(p)}})});
  items.sort(function(a,b){return b.ts-a.ts});
  el.innerHTML=welcome+composer+'<div class="chips" role="group" aria-label="Filter the feed">'+F.map(function(f){return '<button class="chip'+(S.filter===f[0]?" on":"")+'" data-a="filter" data-v="'+f[0]+'" aria-pressed="'+(S.filter===f[0])+'">'+f[1]+'</button>'}).join("")+'</div>'+
   (items.length?items.map(function(x,i){return popc(x.h(),i)}).join(""):emptyCard("Nothing here yet.","Be the first to share something with the street.",'<button class="btn need" data-a="post-need">Post a need</button>'));
  S.pop=false;
}
function renderApp(){renderLeft();renderMain();renderRight()}

/* ---------- modals ---------- */
function modal(html,wide){$("#modal").innerHTML='<div class="scrim" data-a="scrim"><div class="modal'+(wide?" wide":"")+'" role="dialog" aria-modal="true">'+html+'</div></div>';var f=$("#modal input,#modal textarea,#modal button.btn");if(f)f.focus()}
function closeModal(){$("#modal").innerHTML=""}
function openMsg(id,ref){
  var p=person(id);openMsg.ref=ref||"";
  modal('<div class="row">'+av(p)+'<div class="grow"><h2 style="font-size:28px">'+esc(p.name)+'</h2><p class="muted sm">'+esc(p.street)+(p.phone?' &middot; '+esc(p.phone):"")+(ref?' &middot; Re: '+esc(ref):"")+'</p></div><button class="btn sm quiet" data-a="close" aria-label="Close">'+ICON.x+'</button></div>'+
   '<div class="thread" id="thread"><p class="hint">Loading...</p></div>'+
   '<div class="row"><input class="in" id="msgbox" data-id="'+id+'" placeholder="Write a message" aria-label="Message" maxlength="1000"><button class="btn sm" data-a="send" data-id="'+id+'">Send</button></div>');
  loadThread(id);
  clearInterval(openMsg.iv);openMsg.iv=setInterval(function(){if(!$("#thread")){clearInterval(openMsg.iv);return}loadThread(id)},5000);
}
function loadThread(id){return api("GET","/api/messages/"+id).then(function(r){S.threads[id]=r.messages.map(function(m){return {f:m.fromId===S.me.id?"me":"them",t:m.body}});refreshThread(id);refreshInbox()}).catch(function(){})}
function bub(m){return '<div class="bub '+m.f+'">'+esc(m.t)+'</div>'}
function refreshThread(id){var th=$("#thread");if(!th)return;var l=S.threads[id]||[];if(th.getAttribute("data-n")===String(l.length))return;th.setAttribute("data-n",l.length);th.innerHTML=l.length?l.map(bub).join(""):'<p class="hint">Say hi. Be specific about when and where.</p>';th.scrollTop=th.scrollHeight}
function openInbox(){
  modal('<div class="row"><h2 class="grow" style="font-size:32px">Messages</h2><button class="btn sm quiet" data-a="close" aria-label="Close">'+ICON.x+'</button></div><div class="stack" id="inbox" style="gap:10px"><p class="hint">Loading...</p></div>');
  api("GET","/api/conversations").then(function(r){var b=$("#inbox");if(!b)return;S.unread=r.unread;setBadge();
    b.innerHTML=r.conversations.length?r.conversations.map(function(c){var p=person(c.userId);return '<button class="sr" data-a="msg" data-id="'+c.userId+'" data-ref="">'+av(p,"s")+'<span class="grow"><b>'+esc(p.name)+'</b><span class="muted sm" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(c.last)+'</span></span>'+(c.unread?'<span class="badge">'+c.unread+'</span>':"")+'</button>'}).join(""):'<p class="hint">No messages yet. Find a neighbor and say hi.</p>'}).catch(fail)}
function setBadge(){var b=$("#badge");if(!b)return;b.textContent=S.unread;b.hidden=!S.unread}
function refreshInbox(){if(S.view!=="home")return;api("GET","/api/conversations").then(function(r){S.unread=r.unread;setBadge()}).catch(function(){})}
function needModal(){
  modal('<h2>New post</h2><div class="field"><span class="lbl">What do you want to do?</span><div class="seg" role="group"><button class="on" data-a="kind" data-v="need">I need help</button><button data-a="kind" data-v="offer">I can help</button></div></div>'+
   '<div class="field"><label for="nt">Title</label><input class="in" id="nt" maxlength="100" placeholder="e.g. Borrow a ladder for Saturday"></div>'+
   '<div class="field"><label for="nb">Details</label><textarea class="in" id="nb" maxlength="600" placeholder="When, where, and anything they should bring"></textarea></div>'+
   iconPicker(null)+
   '<div class="field"><span class="lbl" id="ratelbl">Budget (Free to $500)</span>'+rateSlider("need",0,"flat")+'<div id="unitrow" hidden><span class="seg" role="group" aria-label="Rate type"><button data-a="sunit" data-v="hr">per hour</button><button class="on" data-a="sunit" data-v="flat">flat</button></span></div></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn need" data-a="save-need">Post it</button></div>');
  modal.kind="need";modal.unit="flat";modal.icon=null;
}
function skillModal(sk){
  var u=sk?sk.u:"hr";modal.editId=sk?sk.id:null;
  modal('<h2>'+(sk?"Edit skill":"Offer a skill")+'</h2><div class="field"><label for="sn">What can you do?</label><input class="in" id="sn" maxlength="60" placeholder="e.g. Lawn care" value="'+esc(sk?sk.n:"")+'"></div>'+
   '<div class="field"><span class="lbl">Your rate</span>'+rateSlider("skill",sk?sk.r:0,u)+'<div><span class="seg" role="group" aria-label="Rate type"><button class="'+(u==="hr"?"on":"")+'" data-a="sunit" data-v="hr">per hour</button><button class="'+(u==="flat"?"on":"")+'" data-a="sunit" data-v="flat">flat</button></span></div></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-skill">'+(sk?"Save skill":"Add skill")+'</button></div>');
  modal.unit=u;
}
function bannerModal(){
  modal('<div class="row"><h2 class="grow" style="font-size:30px">Choose a banner</h2><button class="btn sm quiet" data-a="close" aria-label="Close">'+ICON.x+'</button></div><div class="bngrid">'+BANNER_NAMES.map(function(nm,i){return '<button class="bn'+((S.me.banner||0)===i?" on":"")+'" data-a="set-banner" data-id="'+i+'" aria-label="'+nm+'" aria-pressed="'+((S.me.banner||0)===i)+'"><span class="bnart">'+G.cover(i)+'</span><span class="bnname">'+nm+'</span></button>'}).join("")+'</div>');
}
function profileModal(){
  var m=S.me;
  modal('<h2>Edit profile</h2>'+photoRow()+'<div class="field"><label for="pn">Name</label><input class="in" id="pn" value="'+esc(m.name)+'"></div>'+
   '<div class="field"><label for="pa">Street address</label><input class="in" id="pa" value="'+esc(m.address)+'" placeholder="123 Maple Court" autocomplete="street-address"><span class="muted sm">Neighbors only see your street'+(m.street?" ("+esc(m.street)+")":"")+'.</span><div id="pa-note"></div></div>'+
   '<div class="field"><label for="pc">Contact</label><select class="in" id="pc" data-in="pc-toggle"><option value="messages"'+(m.contact==="messages"?" selected":"")+'>Favor. messages only</option><option value="phone"'+(m.contact==="phone"?" selected":"")+'>Messages and phone</option></select></div>'+
   '<div class="field" id="phrow"'+(m.contact==="phone"?"":" hidden")+'><label for="pp">Phone number</label><input class="in" id="pp" type="tel" value="'+esc(m.phone||"")+'" autocomplete="tel"></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-profile">Save</button></div>')
}
function googleModal(mode){
  modal('<h2>'+(mode==="login"?"Welcome back":"Join Favor.")+'</h2><p class="muted">Sign in with Google. We only use your name, email and photo to set up your neighbor profile.</p><div class="gwrap"><div id="gbtn"></div></div><p class="hint" id="gnote" hidden></p>'+
   (S.cfg.devLogin?'<div class="field"><label for="devname">Local dev login (never on the live site)</label><div class="row"><input class="in" id="devname" value="Dev Neighbor"><button class="btn sm sun" data-a="dev-login">Go</button></div></div>':"")+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button></div>');
  initGoogle();
}
function loadGsi(){return new Promise(function(res,rej){if(window.google&&window.google.accounts&&window.google.accounts.id)return res();var s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=function(){res()};s.onerror=rej;document.head.appendChild(s)})}
function initGoogle(){
  var box=$("#gbtn"),note=$("#gnote");
  function say(m){if(note){note.hidden=false;note.textContent=m}}
  if(!S.cfg.googleClientId){say("Google sign-in isn't set up on this site yet. The site owner needs to add the GOOGLE_CLIENT_ID setting.");return}
  loadGsi().then(function(){
    window.google.accounts.id.initialize({client_id:S.cfg.googleClientId,callback:onGoogle,ux_mode:"popup",use_fedcm_for_prompt:true});
    if(box)window.google.accounts.id.renderButton(box,{theme:"outline",size:"large",shape:"pill",text:"continue_with",width:300});
  }).catch(function(){say("Couldn't load Google sign-in. Check your connection and try again.")});
}
function onGoogle(resp){api("POST","/api/auth/google",{credential:resp.credential}).then(function(r){closeModal();return enter(r)}).catch(fail)}

/* ---------- api + session ---------- */
function api(m,u,b){
  var o={method:m,credentials:"same-origin",headers:{}};
  if(b!==undefined){o.headers["Content-Type"]="application/json";o.body=JSON.stringify(b)}
  return fetch(u,o).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){var e=new Error(j.error||"Something went wrong. Please try again.");e.status=r.status;e.code=j.code;throw e}return j})})}
function fail(e){
  if(e&&e.status===401&&S.view!=="landing"){resetSession();toast("Please sign in again");return}
  toast((e&&e.message)||"That didn't work. Try again.")}
function timeAgo(iso){var t=new Date(iso).getTime(),s=Math.max(0,(Date.now()-t)/1000);if(s<60)return "Just now";var m=Math.floor(s/60);if(m<60)return m+"m ago";var h=Math.floor(m/60);if(h<24)return h+"h ago";var d=Math.floor(h/24);if(d<7)return d+"d ago";return new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function mapSkill(x){return {id:x.id,n:x.name,r:x.rate,u:x.unit}}
function setMe(r){var u=r.user;S.me={id:u.id,name:u.name,email:u.email,picture:u.picture||"",banner:u.banner||0,hasAvatar:!!u.hasAvatar,isAdmin:!!u.isAdmin,req:u.request||null,address:u.address||(u.request&&u.request.address)||"",street:u.street||"",contact:u.contact||"messages",phone:u.phone||"",favorsDone:u.favorsDone||0,skills:u.skills.map(mapSkill)};
  S.friends={};u.friends.forEach(function(i){S.friends[i]=1});S.onboarded=u.onboarded;S.unread=r.unread||0}
function byUser(id){return id===S.me.id?"me":id}
function loadAll(){
  return Promise.all([api("GET","/api/people"),api("GET","/api/listings"),api("GET","/api/posts")]).then(function(r){
    S.people=r[0].people.map(function(p){return {id:p.id,name:p.name,picture:p.picture,street:p.street,done:p.favorsDone,contact:p.contact,phone:p.phone,skills:p.skills.map(mapSkill)}});
    S.listings=r[1].listings.map(function(l){return {id:l.id,kind:l.kind,by:byUser(l.userId),title:l.title,body:l.body,r:l.rate,u:l.unit,icon:l.icon||null,when:timeAgo(l.createdAt),ts:new Date(l.createdAt).getTime()}});
    S.posts=r[2].posts.map(function(p){return {id:p.id,by:byUser(p.userId),text:p.text,when:timeAgo(p.createdAt),ts:new Date(p.createdAt).getTime(),likes:p.likes,liked:p.liked,img:!!p.hasImage}})})}
function enter(r){
  setMe(r);
  if(S.onboarded)return loadAll().then(function(){S.view="home";S.tab="needs";S.q="";render();startPolling();refreshAdmin()});
  S.view="onboarding";S.step=0;S.ob={skills:[]};
  return api("GET","/api/people").then(function(p){S.people=p.people.map(function(x){return {id:x.id,name:x.name,picture:x.picture,street:x.street,done:x.favorsDone,contact:x.contact,phone:x.phone,skills:x.skills.map(mapSkill)}})}).catch(function(){}).then(function(){render()})}
function startPolling(){
  clearInterval(S.poll);var n=0;
  S.poll=setInterval(function(){
    if(S.view!=="home")return;refreshInbox();refreshAdmin();n++;
    var typing=/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"");
    if(n%3===0&&!$("#modal").innerHTML&&!typing&&!S.q){loadAll().then(function(){S.pop=false;renderApp()}).catch(function(){})}
  },20000)}
function resetSession(){
  clearInterval(S.poll);clearInterval(openMsg.iv);
  S.view="landing";S.me={id:0,name:"",street:"",contact:"messages",phone:"",picture:"",banner:0,skills:[]};S.friends={};S.people=[];S.listings=[];S.posts=[];S.threads={};S.ob={skills:[]};S.unread=0;S.q="";S.onboarded=false;
  try{if(window.google&&window.google.accounts)window.google.accounts.id.disableAutoSelect()}catch(e){}
  closeModal();render()}
function boot(){
  render();
  api("GET","/api/config").then(function(c){S.cfg=c;if(c.streets&&c.streets.length)STREETS=c.streets}).catch(function(){})
    .then(function(){return api("GET","/api/me")}).then(enter).catch(function(){S.view="landing";render()})}

/* ---------- render root ---------- */
function render(keep){
  var app=$("#app");var y=window.scrollY;
  if(S.view==="boot")app.innerHTML='<div class="bootscreen" aria-busy="true">'+G.sunSvg()+'<p class="eyebrow">Loading Favor.</p></div>';
  else if(S.view==="landing")app.innerHTML=landing();
  else if(S.view==="onboarding")app.innerHTML=onboarding();
  else{app.innerHTML=shell();S.pop=true;renderApp()}
  window.scrollTo(0,keep?y:0);afterRender();
}

function afterRender(){
  if(S.view!=="landing")return;
  var els=document.querySelectorAll(".rv");
  if(!("IntersectionObserver" in window)){els.forEach(function(e){e.classList.add("seen")});return}
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add("seen");io.unobserve(x.target)}})},{threshold:.12});
  els.forEach(function(e){io.observe(e)});
}
document.addEventListener("pointermove",function(e){
  var a=document.getElementById("art");if(!a||RM||e.pointerType==="touch")return;
  a.style.setProperty("--mx",((e.clientX/window.innerWidth-.5)*2).toFixed(3));
  a.style.setProperty("--my",((e.clientY/window.innerHeight-.5)*2).toFixed(3));
});
document.addEventListener("pointerdown",function(e){LASTPT.x=e.clientX;LASTPT.y=e.clientY});

/* ---------- post images ---------- */
function clearPimg(){if(S.pimgUrl){try{URL.revokeObjectURL(S.pimgUrl)}catch(e){}}S.pimg=null;S.pimgUrl=""}
function prepImage(file){return new Promise(function(res,rej){
  if(file.type==="image/gif"){res(file);return}
  var u=URL.createObjectURL(file),im=new Image();
  im.onerror=function(){URL.revokeObjectURL(u);rej(new Error("We couldn't open that image. Try a JPG or PNG."))};
  im.onload=function(){var m=1600,r=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*r));c.height=Math.max(1,Math.round(im.height*r));
    var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    c.toBlob(function(b){b?res(b):rej(new Error("We couldn't process that image."))},"image/jpeg",.86)};
  im.src=u})}
function uploadImage(id,blob){return fetch("/api/posts/"+id+"/image",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":blob.type||"image/jpeg"},body:blob}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j.error||"Posted, but the photo didn't upload.");return j})})}

/* ---------- events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-a]");if(!t)return;
  var a=t.getAttribute("data-a"),v=t.getAttribute("data-v"),id=t.getAttribute("data-id");
  if(a==="scrim"){if(e.target===t)closeModal();return}
  if(a==="close"){closeModal();return}
  if(a==="scroll"){e.preventDefault();var d=document.getElementById(v);if(d)d.scrollIntoView({behavior:"smooth"});return}
  if(a==="google"){googleModal(v);return}
  if(a==="dev-login"){api("POST","/api/auth/dev",{name:($("#devname")||{}).value||"Dev Neighbor"}).then(function(r){closeModal();return enter(r)}).catch(fail);return}
  if(a==="logout"){api("POST","/api/auth/logout").catch(function(){}).then(resetSession);return}
  if(a==="home-logo"){if(S.view==="home"){S.q="";S.tab="needs";loadAll().then(function(){render()}).catch(fail)}else if(S.view==="landing")window.scrollTo(0,0);return}
  if(a==="inbox"){openInbox();return}
  /* onboarding */
  if(a==="ob-next"){
    if(S.step===0){
      if(!S.me.name.trim()){toast("Add your name first");return}
      if(!S.me.address.trim()){toast("Enter your street address");var ia=$("#ob-addr");if(ia)ia.focus();return}
      t.disabled=true;
      checkAddr(S.me.address).then(function(r){t.disabled=false;
        if(r.ok){S.me.street=r.street;S.addr=null;S.step++;S._pan=true;render()}
        else{S.addr={state:"unlisted"};S.me.street="";render(true)}
      }).catch(function(e){t.disabled=false;S.addr=null;fail(e)});return}
    S.step++;S._pan=true;render();return}
  if(a==="req-street"){api("POST","/api/street-requests",{address:S.me.address}).then(function(r){
      if(r.matched){S.me.street=r.street;S.addr=null;toast("That street is already approved. Tap Next.");render(true);return}
      S.me.req={id:r.request.id,address:r.request.address,status:"pending"};S.addr=null;render(true);toast("Sent for review")}).catch(fail);return}
  if(a==="recheck"){var ra=S.me.req&&S.me.req.address;if(!ra)return;checkAddr(ra).then(function(r){
      if(r.ok){S.me.address=ra;S.me.street=r.street;S.me.req.status="approved";S.addr=null;render(true);toast("Approved!")}
      else toast("Still under review. Check back soon.")}).catch(fail);return}
  if(a==="ob-back"){S.step--;S._pan=true;render();return}
  if(a==="ob-skill"){var i=S.ob.skills.findIndex(function(c){return c.n===v});if(i>-1)S.ob.skills.splice(i,1);else S.ob.skills.push({n:v,r:0,u:"hr"});render(true);return}
  if(a==="ob-add-custom"){var c=$("#ob-custom"),n=c.value.trim().slice(0,60);if(n&&!S.ob.skills.some(function(x){return x.n===n})){S.ob.skills.push({n:n,r:0,u:"hr"});render(true)}return}
  if(a==="ob-unit"){var ou=S.ob.skills[+id];if(ou)ou.u=v;render(true);return}
  if(a==="ob-del"){S.ob.skills.splice(+id,1);render(true);return}
  if(a==="ob-finish"){t.disabled=true;
    api("POST","/api/me/onboard",{name:S.me.name,address:S.me.address,contact:S.me.contact,phone:S.me.phone,skills:S.ob.skills.filter(function(k){return k.n.trim()}).map(function(k){return {name:k.n.trim().slice(0,60),rate:k.r,unit:k.u}}),friends:Object.keys(S.friends).map(Number)})
      .then(function(r){setMe(r);return loadAll()}).then(function(){S.view="home";S.tab="needs";render();toast("Welcome to Favor., "+S.me.name.split(" ")[0]+"!");burst(window.innerWidth/2,window.innerHeight*.35,90);startPolling();refreshAdmin()})
      .catch(function(e){t.disabled=false;if(e&&e.code==="street_unverified"){S.step=0;S.addr={state:"unlisted"};render();return}fail(e)});return}
  /* app */
  if(a==="tab"){S.tab=v;S.pop=true;renderMain();return}
  if(a==="filter"){S.filter=v;S.pop=true;renderMain();return}
  if(a==="clear-q"){S.q="";$("#q").value="";S.pop=true;renderMain();$("#q").focus();return}
  if(a==="friend"){var had=S.friends[id];
    if(S.view==="onboarding"){if(had)delete S.friends[id];else{S.friends[id]=1;burst(LASTPT.x,LASTPT.y,14)}render(true);return}
    api(had?"DELETE":"POST","/api/friends/"+id).then(function(){if(had)delete S.friends[id];else{S.friends[id]=1;burst(LASTPT.x,LASTPT.y,14)}renderApp()}).catch(fail);return}
  if(a==="like"){api("POST","/api/posts/"+id+"/like").then(function(r){S.posts.forEach(function(p){if(String(p.id)===id){p.liked=r.liked;p.likes=r.likes}});renderMain();if(r.liked)burst(LASTPT.x,LASTPT.y,9,"heart")}).catch(fail);return}
  if(a==="msg"){if(t.getAttribute("data-demo")){googleModal("signup");return}openMsg(id,t.getAttribute("data-ref"));return}
  if(a==="send"){var box=$("#msgbox"),tx=box.value.trim();if(!tx)return;box.value="";
    api("POST","/api/messages/"+id,{body:tx,ref:openMsg.ref||""}).then(function(){return loadThread(id)}).catch(function(e){box.value=tx;fail(e)});return}
  if(a==="post-need"){needModal();return}
  if(a==="kind"){modal.kind=v;t.parentNode.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b===t)});
    $("#unitrow").hidden=v!=="offer";$("#ratelbl").textContent=v==="offer"?"Your rate (Free to $500)":"Budget (Free to $500)";return}
  if(a==="save-need"){var ti=$("#nt").value.trim();if(!ti){toast("Give your post a title");$("#nt").focus();return}
    var r=+$('#modal [data-in="rate"]').value,kind=modal.kind||"need",unit=kind==="offer"?(modal.unit||"flat"):"flat",body=$("#nb").value.trim();t.disabled=true;
    api("POST","/api/listings",{kind:kind,title:ti,body:body,rate:r,unit:unit,icon:modal.icon||null}).then(function(res){
      S.listings.unshift({id:res.listing.id,kind:kind,by:"me",title:ti,body:body,r:r,u:unit,icon:modal.icon||null,when:"Just now",ts:Date.now()});
      closeModal();S.tab="needs";S.filter="all";S.pop=true;renderApp();toast("Posted! Neighbors can see it now.");burst(LASTPT.x,LASTPT.y,50)}).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="picon"){modal.icon=v||null;t.parentNode.querySelectorAll(".ipk").forEach(function(b){b.classList.toggle("on",b===t)});return}
  if(a==="add-skill"){skillModal();return}
  if(a==="edit-skill"){var es=S.me.skills.filter(function(k){return String(k.id)===id})[0];if(es)skillModal(es);return}
  if(a==="pick-banner"){bannerModal();return}
  if(a==="set-banner"){api("PUT","/api/me/banner",{banner:+id}).then(function(r){setMe(r);closeModal();renderLeft();toast("Banner updated")}).catch(fail);return}
  if(a==="sunit"){modal.unit=v;t.parentNode.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b===t)});var rr=$('#modal [data-in="rate"]');rr.parentNode.querySelector(".rate-out").textContent=rateLabel(+rr.value,v);return}
  if(a==="save-skill"){var sn=$("#sn").value.trim();if(!sn){toast("Name your skill first");$("#sn").focus();return}
    var sr=+$('#modal [data-in="rate"]').value,su=modal.unit||"hr";t.disabled=true;
    if(modal.editId){api("PUT","/api/skills/"+modal.editId,{name:sn,rate:sr,unit:su}).then(function(res){var nk=mapSkill(res.skill);S.me.skills=S.me.skills.map(function(k){return k.id===nk.id?nk:k});closeModal();renderLeft();toast("Skill updated")}).catch(function(e){t.disabled=false;fail(e)});return}
    api("POST","/api/skills",{name:sn,rate:sr,unit:su}).then(function(res){S.me.skills.push(mapSkill(res.skill));closeModal();renderLeft();toast("Skill added to your profile");burst(LASTPT.x,LASTPT.y,40)}).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="del-skill"){api("DELETE","/api/skills/"+id).then(function(){S.me.skills=S.me.skills.filter(function(k){return String(k.id)!==id});renderLeft()}).catch(fail);return}
  if(a==="del-listing"){api("DELETE","/api/listings/"+id).then(function(){S.listings=S.listings.filter(function(l){return String(l.id)!==id});renderApp();toast("Listing removed")}).catch(fail);return}
  if(a==="del-post"){api("DELETE","/api/posts/"+id).then(function(){S.posts=S.posts.filter(function(p){return String(p.id)!==id});renderMain();toast("Post removed")}).catch(fail);return}
  if(a==="edit-profile"){profileModal();return}
  if(a==="save-profile"){var nm=$("#pn").value.trim();if(!nm){toast("Add your name");return}
    api("PUT","/api/me",{name:nm,address:$("#pa").value,contact:$("#pc").value,phone:($("#pp")||{}).value||""}).then(function(r){setMe(r);closeModal();render(true);toast("Profile saved")})
      .catch(function(e){if(e&&e.code==="street_unverified"){modal.addr=$("#pa").value;$("#pa-note").innerHTML=unlistedNote("req-street-p");return}fail(e)});return}
  if(a==="req-street-p"){api("POST","/api/street-requests",{address:modal.addr}).then(function(r){
      $("#pa-note").innerHTML='<div class="notice"><b>Sent for review.</b><p class="sm">Your current street stays until an admin approves the new one.</p></div>';
      if(r.matched)toast("That street is approved. Tap Save.")}).catch(fail);return}
  if(a==="rm-photo"){api("DELETE","/api/me/avatar").then(function(r){S.me.picture=r.user.picture||"";S.me.hasAvatar=false;afterPhoto();toast("Photo removed")}).catch(fail);return}
  if(a==="report"){reportModal(t.getAttribute("data-kind"),id);return}
  if(a==="send-report"){var why=$("#rr").value.trim();t.disabled=true;api("POST","/api/reports",{kind:modal.rk,id:modal.rid,reason:why}).then(function(){closeModal();toast("Thanks. An admin will take a look.")}).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="admin-del"){var k=t.getAttribute("data-kind");confirmModal("Delete this "+k+"?","This removes it for everyone. This cannot be undone.","Delete",'data-a="admin-del-yes" data-kind="'+k+'" data-id="'+id+'"');return}
  if(a==="admin-del-yes"){var k2=t.getAttribute("data-kind");api("DELETE","/api/admin/"+(k2==="post"?"posts":"listings")+"/"+id).then(function(){closeModal();return loadAll()}).then(function(){renderApp();refreshAdmin();toast("Removed")}).catch(fail);return}
  /* admin */
  if(a==="admin"){openAdmin();return}
  if(a==="adm-tab"){S.adm.tab=v;S.adm.confirm=null;admPaint();if(v==="storage")admStorage();return}
  if(a==="adm-clear"){S.adm.confirm=v;admPaint();return}
  if(a==="adm-clear-no"){S.adm.confirm=null;admPaint();return}
  if(a==="adm-clear-yes"){api("POST","/api/admin/clear",{what:v}).then(function(){S.adm.confirm=null;toast("Cleared");return Promise.all([admStorage(),admLoad(),loadAll()])}).then(function(){renderApp()}).catch(fail);return}
  if(a==="adm-approve"){var nin=document.querySelector('[data-in="adm-name"][data-id="'+id+'"]');api("POST","/api/admin/street-requests/"+id+"/approve",{name:nin?nin.value:""}).then(function(){toast("Approved. The street is on the list.");return admLoad()}).catch(fail);return}
  if(a==="adm-reject"){api("POST","/api/admin/street-requests/"+id+"/reject").then(function(){toast("Rejected");return admLoad()}).catch(fail);return}
  if(a==="adm-dismiss"){api("POST","/api/admin/reports/"+id+"/dismiss").then(function(){return admLoad()}).catch(fail);return}
  if(a==="adm-remove"){api("POST","/api/admin/reports/"+id+"/remove").then(function(){toast("Removed");return Promise.all([admLoad(),loadAll()])}).then(function(){renderApp()}).catch(fail);return}
  if(a==="adm-add-street"){var sn2=$("#adm-street");api("POST","/api/admin/streets",{name:sn2.value}).then(function(){toast("Street added");return admLoad()}).catch(fail);return}
  if(a==="adm-del-street"){api("DELETE","/api/admin/streets/"+id).then(function(){return admLoad()}).catch(fail);return}
  if(a==="adm-wipe"){var ci=$("#adm-confirm");if(!ci||ci.value!=="DELETE EVERYTHING"){toast("Type DELETE EVERYTHING first");if(ci)ci.focus();return}
    api("POST","/api/admin/wipe",{scope:v,confirm:ci.value}).then(function(){closeModal();if(v==="all"){resetSession();toast("Everything was cleared")}else{return loadAll().then(function(){renderApp();refreshAdmin();toast("All content cleared")})}}).catch(fail);return}
  if(a==="post-text"){var tx2=S.draft.trim();if(!tx2){toast("Write something first");return}t.disabled=true;
    api("POST","/api/posts",{text:tx2}).then(function(res){
      var np={id:res.post.id,by:"me",text:tx2,when:"Just now",ts:Date.now(),likes:0,liked:false,img:false},f=S.pimg;
      var done=function(){S.posts.unshift(np);S.draft="";clearPimg();S.pop=true;renderMain();toast("Shared with Sutton Fields");burst(LASTPT.x,LASTPT.y,36)};
      if(!f){done();return}
      return prepImage(f).then(function(b){return uploadImage(np.id,b)}).then(function(){np.img=true;done()}).catch(function(e){done();toast((e&&e.message)||"Posted, but the photo didn't upload.")})
    }).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="rm-pimg"){clearPimg();renderMain();return}
  if(a==="view-img"){modal('<img class="lightimg" src="/api/posts/'+id+'/image" alt="Shared photo"><div class="row end"><button class="btn quiet" data-a="close">Close</button></div>',true);return}
});
document.addEventListener("input",function(e){
  var t=e.target,k=t.getAttribute&&t.getAttribute("data-in");if(!k)return;
  if(k==="q"){var was=!!S.q.trim();S.q=t.value;S.pop=!was&&!!t.value.trim();renderMain();return}
  if(k==="me-name"){S.me.name=t.value;return}
  if(k==="ob-skname"){var sk0=S.ob.skills[+t.getAttribute("data-id")];if(sk0)sk0.n=t.value;return}
  if(k==="draft"){S.draft=t.value;var cn=$("#cnt");if(cn){cn.textContent=t.value.length+"/300";cn.classList.toggle("over",t.value.length>=300)}return}
  if(k==="me-street"){S.me.street=t.value;return}
  if(k==="me-address"){S.me.address=t.value;if(S.addr){S.addr=null;var wn=document.querySelector(".ob .notice.warn");if(wn)wn.remove()}return}
  if(k==="me-contact"){S.me.contact=t.value;render(true);return}
  if(k==="me-phone"){S.me.phone=t.value;return}
  if(k==="pc-toggle"){var pr=$("#phrow");if(pr)pr.hidden=t.value!=="phone";return}
  if(k==="rate"){var id=t.getAttribute("data-id"),v=+t.value,unit="flat";
    if(id.indexOf("ob:")===0){var oc=S.ob.skills[+id.slice(3)];if(oc){oc.r=v;unit=oc.u}}
    else if(id==="skill")unit=modal.unit||"hr";
    t.parentNode.querySelector(".rate-out").textContent=rateLabel(v,unit)}
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"&&$("#modal").innerHTML)closeModal();
  if(e.key==="Enter"){var t=e.target;
    if(t.id==="msgbox"){var b=$('[data-a="send"]');if(b)b.click()}
    if(t.id==="ob-custom"){$('[data-a="ob-add-custom"]').click()}}
  if(e.key==="/"&&S.view==="home"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();var q=$("#q");if(q)q.focus()}
});
document.addEventListener("change",function(e){
  var t0=e.target;
  if(t0&&t0.id==="pimgfile"&&t0.files&&t0.files[0]){var pf=t0.files[0];t0.value="";
    if(!/^image\//.test(pf.type)){toast("Please choose an image");return}
    if(pf.size>30*1024*1024){toast("Images can be up to 30 MB.");return}
    clearPimg();S.pimg=pf;S.pimgUrl=URL.createObjectURL(pf);renderMain();return}
  var t=e.target;if(!t||t.id!=="avfile"||!t.files||!t.files[0])return;
  var f=t.files[0];t.value="";
  if(!/^image\//.test(f.type)){toast("Please choose an image");return}
  if(f.size>20*1024*1024){toast("Photos can be up to 20 MB.");return}
  resizePhoto(f).then(function(u){return api("PUT","/api/me/avatar",{image:u})}).then(function(r){S.me.picture=r.user.picture||"";S.me.hasAvatar=!!r.user.hasAvatar;afterPhoto();toast("Photo updated")}).catch(fail)});
boot();
})();
