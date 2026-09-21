import re
d='public/'
s=open(d+'app.raw.js').read()
css=open(d+'styles.css').read()

def rep(a,b,count=1):
    global s
    assert a in s, "MISSING: "+a[:80]
    s=s.replace(a,b) if count==0 else s.replace(a,b,count)

# ---- data
rep('var PEOPLE=[','var DEMO=[')
rep('var LISTINGS=[','var SAMPLES=[')
s=re.sub(r'var POSTS=\[.*?\n\];\n','',s,count=1,flags=re.S)
rep('[LISTINGS[0],LISTINGS[1],LISTINGS[5]]','[SAMPLES[0],SAMPLES[1],SAMPLES[5]]')
rep('Free to join. Only Sutton Fields neighbors. Prototype: sign-in is simulated.','Free to join. Made for Sutton Fields neighbors.')

# ---- state
i=s.index('var S={view:"landing"');j=s.index('/* ---------- helpers ---------- */')
s=s[:i]+'''var S={view:"boot",step:0,tab:"needs",filter:"all",q:"",cfg:{},unread:0,
  me:{id:0,name:"",street:"",contact:"messages",phone:"",picture:"",skills:[]},
  ob:{skills:[]},friends:{},people:[],threads:{},listings:[],posts:[]};

'''+s[j:]

# ---- person / avatar
i=s.index('function person(id){');j=s.index('function rateLabel(')
s=s[:i]+'''function person(id){var k=String(id),i;for(i=0;i<S.people.length;i++)if(String(S.people[i].id)===k)return S.people[i];for(i=0;i<DEMO.length;i++)if(DEMO[i].id===k)return DEMO[i];return {id:id,name:"Neighbor",street:"",picture:"",done:0,skills:[]}}
function avCls(name){var n=0;for(var i=0;i<name.length;i++)n+=name.charCodeAt(i);return "av"+(n%5)}
function av(x,size){var o=typeof x==="string"?{name:x}:x,n=o.name||"?";
  if(o.picture)return '<div class="av '+(size||"")+' avimg" aria-hidden="true"><img src="'+esc(o.picture)+'" alt="" referrerpolicy="no-referrer"></div>';
  return '<div class="av '+(size||"")+' '+avCls(n)+'" aria-hidden="true">'+esc(n.charAt(0))+'</div>'}
'''+s[j:]
rep('av(p.name','av(p',0)
rep('av(x.p.name','av(x.p',0) if 'av(x.p.name' in s else None
rep('av(S.me.name,"s")','av(S.me,"s")')
rep('av(m.name,"big")','av(m,"big")')

# ---- cards
rep('var p=person(l.by),mine=l.by==="me",name=mine?S.me.name:p.name','var p=person(l.by),mine=l.by==="me",who=mine?S.me:p,name=who.name')
rep("'<div class=\"foot\"><div class=\"who\">'+av(name,\"s\")+","'<div class=\"foot\"><div class=\"who\">'+av(who,\"s\")+")
rep('var mine=p.by==="me",name=mine?S.me.name:person(p.by).name;\n  var liked=S.liked[p.id],n=p.likes+(liked?1:0);','var mine=p.by==="me",who=mine?S.me:person(p.by),name=who.name;\n  var liked=p.liked,n=p.likes;')
rep("'<article class=\"card post\"><div class=\"row\">'+av(name)+","'<article class=\"card post\"><div class=\"row\">'+av(who)+")
rep('(mine?"":\'<button class="btn sm quiet" data-a="msg" data-id="\'+p.by+\'" data-ref="your post">\'','(mine?\'<button class="btn sm quiet" data-a="del-post" data-id="\'+p.id+\'">Delete</button>\':\'<button class="btn sm quiet" data-a="msg" data-id="\'+p.by+\'" data-ref="your post">\'')

# ---- shell topbar
rep("""'<div class="row">'+av(S.me,"s")+'<button class="btn sm quiet" data-a="logout">Log out</button></div></div></header>'""","""'<div class="row"><button class="btn sm sun" data-a="inbox" aria-label="Messages">'+ICON.msg+'<span class="inbox-label">Messages</span><span class="badge" id="badge"'+(S.unread?"":" hidden")+'>'+S.unread+'</span></button>'+av(S.me,"s")+'<button class="btn sm quiet" data-a="logout">Log out</button></div></div></header>'""")
rep('data-a="del-skill" data-id="\'+i+\'"','data-a="del-skill" data-id="\'+s.id+\'"')
rep('PEOPLE.filter(','S.people.filter(',0)
rep('PEOPLE.forEach(','S.people.forEach(',0)
rep('emptyCard("Nothing here yet.","Try another filter, or post the first one.")','emptyCard("Nothing here yet.","Try another filter, or post the first one.",\'<button class="btn need" data-a="post-need">Post a need</button>\')')

# ---- onboarding: street placeholder, phone field, friends from server
rep("""'<option'+(x===S.me.street?" selected":"")+'>'+x+'</option>'}).join("")+'</select></div>'+
    '<div class="field"><span class="lbl">How can neighbors reach you?</span>""","""'<option'+(x===S.me.street?" selected":"")+'>'+x+'</option>'}).join("").replace('<option','<option',1)+'</select></div>'+
    '<div class="field"><span class="lbl">How can neighbors reach you?</span>""")
rep("""<select class="in" id="ob-street" data-in="me-street">'+STREETS.map(""","""<select class="in" id="ob-street" data-in="me-street">'+(S.me.street?"":'<option value="" disabled selected>Choose your street</option>')+STREETS.map(""")
rep("""'<div class="actions"><span class="demo-note">You can change this any time.</span>""","""(S.me.contact==="phone"?'<div class="field"><label for="ob-phone">Phone number</label><input class="in" id="ob-phone" type="tel" data-in="me-phone" value="'+esc(S.me.phone)+'" autocomplete="tel"></div>':"")+'<div class="actions"><span class="demo-note">You can change this any time.</span>""")
rep("PEOPLE.slice(0,6).map(","S.people.slice(0,8).map(") if "PEOPLE.slice(0,6).map(" in s else rep("S.people.slice(0,6).map(","S.people.slice(0,8).map(")
rep("""}).join("")+'</div>'+
    '<div class="actions"><button class="btn quiet" data-a="ob-back">Back</button><button class="btn need" data-a="ob-finish">""","""}).join("")+(S.people.length?"":'<p class="hint">You are one of the first neighbors here. Anyone you add later shows up in your sidebar.</p>')+'</div>'+
    '<div class="actions"><button class="btn quiet" data-a="ob-back">Back</button><button class="btn need" data-a="ob-finish">""")

# ---- messages, modals, google modal
i=s.index('function openMsg(id,ref){');j=s.index('function needModal(){')
s=s[:i]+r'''function openMsg(id,ref){
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
'''+s[j:]

rep("""function needModal(){
  modal('<h2>Post a need</h2><div class="field"><span class="lbl">What kind of post?</span><div class="seg" role="group"><button class="on" data-a="kind" data-v="need">Needs a hand</button><button data-a="kind" data-v="borrow">Borrow something</button></div></div>'+""","""function needModal(){
  modal('<h2>New post</h2><div class="field"><span class="lbl">What kind of post?</span><div class="seg" role="group"><button class="on" data-a="kind" data-v="need">Needs a hand</button><button data-a="kind" data-v="borrow">Borrow</button><button data-a="kind" data-v="offer">Offer help</button></div></div>'+""")
rep("""'<div class="field"><span class="lbl">Budget (Free to $500)</span>'+rateSlider("need",0,"flat")+'</div>'+""","""'<div class="field"><span class="lbl" id="ratelbl">Budget (Free to $500)</span>'+rateSlider("need",0,"flat")+'<div id="unitrow" hidden><span class="seg" role="group" aria-label="Rate type"><button data-a="sunit" data-v="hr">per hour</button><button class="on" data-a="sunit" data-v="flat">flat</button></span></div></div>'+""")
rep("""  modal.kind="need";
}""","""  modal.kind="need";modal.unit="flat";
}""")
rep("""<textarea class="in" id="nb" placeholder=""","""<textarea class="in" id="nb" maxlength="600" placeholder=""")
rep("""<input class="in" id="nt" placeholder""","""<input class="in" id="nt" maxlength="100" placeholder""")

# profile modal: phone
rep("""'<div class="field"><label for="pc">Contact</label><select class="in" id="pc">""","""'<div class="field"><label for="pc">Contact</label><select class="in" id="pc" data-in="pc-toggle">""")
rep("""'<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-profile">Save</button></div>')""","""'<div class="field" id="phrow"'+(m.contact==="phone"?"":" hidden")+'><label for="pp">Phone number</label><input class="in" id="pp" type="tel" value="'+esc(m.phone||"")+'" autocomplete="tel"></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-profile">Save</button></div>')""")
rep("""'<option'+(x===m.street?" selected":"")+'>'+x+'</option>'}).join("")+'</select></div>'+
   '<div class="field"><label for="pc">""","""'<option'+(x===m.street?" selected":"")+'>'+x+'</option>'}).join("")+'</select></div>'+
   '<div class="field"><label for="pc">""")

i=s.index('function googleModal(mode){');j=s.index('/* ---------- render root ---------- */')
s=s[:i]+r'''function googleModal(mode){
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
  return fetch(u,o).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){var e=new Error(j.error||"Something went wrong. Please try again.");e.status=r.status;throw e}return j})})}
function fail(e){
  if(e&&e.status===401&&S.view!=="landing"){resetSession();toast("Please sign in again");return}
  toast((e&&e.message)||"That didn't work. Try again.")}
function timeAgo(iso){var t=new Date(iso).getTime(),s=Math.max(0,(Date.now()-t)/1000);if(s<60)return "Just now";var m=Math.floor(s/60);if(m<60)return m+"m ago";var h=Math.floor(m/60);if(h<24)return h+"h ago";var d=Math.floor(h/24);if(d<7)return d+"d ago";return new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function mapSkill(x){return {id:x.id,n:x.name,r:x.rate,u:x.unit}}
function setMe(r){var u=r.user;S.me={id:u.id,name:u.name,email:u.email,picture:u.picture||"",street:u.street||"",contact:u.contact||"messages",phone:u.phone||"",favorsDone:u.favorsDone||0,skills:u.skills.map(mapSkill)};
  S.friends={};u.friends.forEach(function(i){S.friends[i]=1});S.onboarded=u.onboarded;S.unread=r.unread||0}
function byUser(id){return id===S.me.id?"me":id}
function loadAll(){
  return Promise.all([api("GET","/api/people"),api("GET","/api/listings"),api("GET","/api/posts")]).then(function(r){
    S.people=r[0].people.map(function(p){return {id:p.id,name:p.name,picture:p.picture,street:p.street,done:p.favorsDone,contact:p.contact,phone:p.phone,skills:p.skills.map(mapSkill)}});
    S.listings=r[1].listings.map(function(l){return {id:l.id,kind:l.kind,by:byUser(l.userId),title:l.title,body:l.body,r:l.rate,u:l.unit,when:timeAgo(l.createdAt)}});
    S.posts=r[2].posts.map(function(p){return {id:p.id,by:byUser(p.userId),text:p.text,when:timeAgo(p.createdAt),likes:p.likes,liked:p.liked}})})}
function enter(r){
  setMe(r);
  if(S.onboarded)return loadAll().then(function(){S.view="home";S.tab="needs";S.q="";render();startPolling()});
  S.view="onboarding";S.step=0;S.ob={skills:[]};
  return api("GET","/api/people").then(function(p){S.people=p.people.map(function(x){return {id:x.id,name:x.name,picture:x.picture,street:x.street,done:x.favorsDone,contact:x.contact,phone:x.phone,skills:x.skills.map(mapSkill)}})}).catch(function(){}).then(function(){render()})}
function startPolling(){
  clearInterval(S.poll);var n=0;
  S.poll=setInterval(function(){
    if(S.view!=="home")return;refreshInbox();n++;
    var typing=/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"");
    if(n%3===0&&!$("#modal").innerHTML&&!typing&&!S.q){loadAll().then(function(){S.pop=false;renderApp()}).catch(function(){})}
  },20000)}
function resetSession(){
  clearInterval(S.poll);clearInterval(openMsg.iv);
  S.view="landing";S.me={id:0,name:"",street:"",contact:"messages",phone:"",picture:"",skills:[]};S.friends={};S.people=[];S.listings=[];S.posts=[];S.threads={};S.ob={skills:[]};S.unread=0;S.q="";S.onboarded=false;
  try{if(window.google&&window.google.accounts)window.google.accounts.id.disableAutoSelect()}catch(e){}
  closeModal();render()}
function boot(){
  render();
  api("GET","/api/config").then(function(c){S.cfg=c;if(c.streets&&c.streets.length)STREETS=c.streets}).catch(function(){})
    .then(function(){return api("GET","/api/me")}).then(enter).catch(function(){S.view="landing";render()})}

'''+s[j:]

# ---- render(): boot view
rep('if(S.view==="landing")app.innerHTML=landing();','if(S.view==="boot")app.innerHTML=\'<div class="bootscreen" aria-busy="true">\'+G.sunSvg()+\'<p class="eyebrow">Loading Favor.</p></div>\';\n  else if(S.view==="landing")app.innerHTML=landing();')

# ---- events
i=s.index('document.addEventListener("click",function(e){');j=s.index('document.addEventListener("input",function(e){')
s=s[:i]+r'''document.addEventListener("click",function(e){
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
  if(a==="ob-next"){if(S.step===0){if(!S.me.name.trim()){toast("Add your name first");return}if(!S.me.street){toast("Choose your street first");return}}S.step++;S._pan=true;render();return}
  if(a==="ob-back"){S.step--;S._pan=true;render();return}
  if(a==="ob-skill"){var i=S.ob.skills.findIndex(function(c){return c.n===v});if(i>-1)S.ob.skills.splice(i,1);else S.ob.skills.push({n:v,r:0,u:"hr"});render(true);return}
  if(a==="ob-add-custom"){var c=$("#ob-custom"),n=c.value.trim().slice(0,60);if(n&&!S.ob.skills.some(function(x){return x.n===n})){S.ob.skills.push({n:n,r:0,u:"hr"});render(true)}return}
  if(a==="ob-unit"){S.ob.skills.forEach(function(c){if(c.n===id)c.u=v});render(true);return}
  if(a==="ob-finish"){t.disabled=true;
    api("POST","/api/me/onboard",{name:S.me.name,street:S.me.street,contact:S.me.contact,phone:S.me.phone,skills:S.ob.skills.map(function(k){return {name:k.n,rate:k.r,unit:k.u}}),friends:Object.keys(S.friends).map(Number)})
      .then(function(r){setMe(r);return loadAll()}).then(function(){S.view="home";S.tab="needs";render();toast("Welcome to Favor., "+S.me.name.split(" ")[0]+"!");burst(window.innerWidth/2,window.innerHeight*.35,90);startPolling()})
      .catch(function(e){t.disabled=false;fail(e)});return}
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
    api("POST","/api/listings",{kind:kind,title:ti,body:body,rate:r,unit:unit}).then(function(res){
      S.listings.unshift({id:res.listing.id,kind:kind,by:"me",title:ti,body:body,r:r,u:unit,when:"Just now"});
      closeModal();S.tab="needs";S.filter="all";S.pop=true;renderApp();toast("Posted! Neighbors can see it now.");burst(LASTPT.x,LASTPT.y,50)}).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="add-skill"){skillModal();return}
  if(a==="sunit"){modal.unit=v;t.parentNode.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",b===t)});var rr=$('#modal [data-in="rate"]');rr.parentNode.querySelector(".rate-out").textContent=rateLabel(+rr.value,v);return}
  if(a==="save-skill"){var sn=$("#sn").value.trim();if(!sn){toast("Name your skill first");$("#sn").focus();return}
    var sr=+$('#modal [data-in="rate"]').value,su=modal.unit||"hr";t.disabled=true;
    api("POST","/api/skills",{name:sn,rate:sr,unit:su}).then(function(res){S.me.skills.push(mapSkill(res.skill));closeModal();renderLeft();toast("Skill added to your profile");burst(LASTPT.x,LASTPT.y,40)}).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="del-skill"){api("DELETE","/api/skills/"+id).then(function(){S.me.skills=S.me.skills.filter(function(k){return String(k.id)!==id});renderLeft()}).catch(fail);return}
  if(a==="del-listing"){api("DELETE","/api/listings/"+id).then(function(){S.listings=S.listings.filter(function(l){return String(l.id)!==id});renderApp();toast("Listing removed")}).catch(fail);return}
  if(a==="del-post"){api("DELETE","/api/posts/"+id).then(function(){S.posts=S.posts.filter(function(p){return String(p.id)!==id});renderMain();toast("Post removed")}).catch(fail);return}
  if(a==="edit-profile"){profileModal();return}
  if(a==="save-profile"){var nm=$("#pn").value.trim();if(!nm){toast("Add your name");return}
    api("PUT","/api/me",{name:nm,street:$("#ps").value,contact:$("#pc").value,phone:($("#pp")||{}).value||""}).then(function(r){setMe(r);closeModal();renderApp();toast("Profile saved")}).catch(fail);return}
  if(a==="post-text"){var ta=$("#np"),tx2=ta.value.trim();if(!tx2){toast("Write something first");return}t.disabled=true;
    api("POST","/api/posts",{text:tx2}).then(function(res){S.posts.unshift({id:res.post.id,by:"me",text:tx2,when:"Just now",likes:0,liked:false});S.pop=true;renderMain();toast("Shared with Sutton Fields");burst(LASTPT.x,LASTPT.y,36)}).catch(function(e){t.disabled=false;fail(e)});return}
});
'''+s[j:]

# ---- input handler additions
rep('if(k==="me-contact"){S.me.contact=t.value;return}','if(k==="me-contact"){S.me.contact=t.value;render(true);return}\n  if(k==="me-phone"){S.me.phone=t.value;return}\n  if(k==="pc-toggle"){var pr=$("#phrow");if(pr)pr.hidden=t.value!=="phone";return}')

# ---- boot
rep('\nrender();\n})();','\nboot();\n})();')
open(d+'app.js','w').write(s)

css+='''
.avimg{padding:0;overflow:hidden;background:var(--surface-alt)}
.avimg img{width:100%;height:100%;object-fit:cover;display:block}
.badge{min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:var(--clay);color:var(--on-clay);border:2px solid var(--ink);font:700 12px/16px var(--font-mono);text-align:center}
button.sr{width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit}
.gwrap{display:flex;justify-content:center;min-height:44px}
.bootscreen{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:12px}
.bootscreen .sunsvg{width:140px;height:auto}
@media(max-width:480px){.inbox-label{display:none}}
'''
open(d+'styles.css','w').write(css)
print('built')
