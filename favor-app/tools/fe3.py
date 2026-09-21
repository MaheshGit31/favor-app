import re
p='public/app.js'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert a in s, "MISSING: "+a[:70]
    s=s.replace(a,b,cnt)
def cut(start,end,new=""):
    global s
    a=s.index(start); b=s.index(end,a)
    s=s[:a]+new+s[b:]

# ---- remove demo data ----
cut('var DEMO=[','/* ---------- state ---------- */')
rep('"Sound system install","Furniture assembly"','"Home repairs","Furniture assembly"')
rep('for(i=0;i<DEMO.length;i++)if(DEMO[i].id===k)return DEMO[i];','')
rep('S={view:"boot",step:0,tab:"needs",filter:"all",q:"",cfg:{},unread:0,','S={view:"boot",step:0,tab:"needs",filter:"all",q:"",draft:"",pimg:null,pimgUrl:"",cfg:{},unread:0,')
rep('me:{id:0,name:"",street:"",address:"",contact:"messages",phone:"",picture:"",skills:[]},','me:{id:0,name:"",street:"",address:"",contact:"messages",phone:"",picture:"",banner:0,skills:[]},')

# ---- wordmark ----
rep('''function wm(cls){return '<button class="wm '+(cls||"")+'" data-a="home-logo" aria-label="Favor. home">Favor<i>.</i></button>'}''',
'''function wm(cls){return '<button class="wm '+(cls||"")+'" data-a="home-logo" aria-label="Favor. for Sutton Fields, home"><span class="wm-t">Favor<i>.</i></span><span class="wm-sub">For Sutton Fields</span></button>'}
function fmtBytes(n){n=+n||0;if(n<1024)return n+" B";if(n<1048576)return (n/1024).toFixed(0)+" KB";if(n<1073741824)return (n/1048576).toFixed(1)+" MB";return (n/1073741824).toFixed(2)+" GB"}''')

# ---- banners ----
cut('G.cover=function(){','G.strip=function(){','''G.cover=function(n){
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
var BANNER_NAMES=["Sunny hills","Sunset","Night sky","Meadow","Blue sky","Sunshine waves","Little village","Confetti"];
''')

# ---- landing ----
rep('''var tick=["Sound systems","Borrow a ladder"''','''var tick=["Sound systems","Borrow a ladder"''')
cut('''   '<p class="lead">Favor. is where''','''   '<div class="cta">''')
cut('''   '<p class="fine demo-note">Free to join.''','''   '<div class="art" id="art">''',"""   '</div>'+\n""")
rep('''<h3>Help installing a sound system</h3><div class="row wrapf">'+rateChip(50,"flat","Budget ")+'<span class="chip">Clover Lane</span>''','''<h3>Borrow a ladder this weekend</h3><div class="row wrapf">'+rateChip(0,"flat","Budget ")+'<span class="chip">Clover Lane</span>''')
rep('''<h3>Sound system install, no pro prices</h3><div class="row wrapf">'+rateChip(40,"hr")+'<span class="chip">Maple Ct</span>''','''<h3>Lawn care, weekends</h3><div class="row wrapf">'+rateChip(35,"hr")+'<span class="chip">Maple Ct</span>''')
rep('''<h3>Post what you need</h3><p>A sound system to install, a microphone to borrow, a couch to carry. Add a budget, or none at all.</p>''','''<h3>Post what you need</h3>''')
rep('''<h3>List what you can do</h3><p>Add skills to your profile with a rate from Free to $500. Neighbors find you when they search.</p>''','''<h3>List what you can do</h3>''')
rep('''<h3>Message and say thanks</h3><p>Chat in the app or share contact details. When the favor is done, say thanks and it counts.</p>''','''<h3>Message and say thanks</h3>''')
cut('''   '<section class="section" style="padding-top:0"><p class="eyebrow">Happening this week</p>''','''   '<section class="section" style="padding-top:0"><div class="big-cta rv">''')
rep('''<p class="muted sm">Made for Sutton Fields. Neighbors first.</p>''','''<p class="muted sm">Together, anything is possible.</p>''')

# ---- onboarding skills: editable + removable ----
cut('''(chosen.length?'<div class="stack">'+chosen.map(function(c){''','''    '<div class="actions"><button class="btn quiet" data-a="ob-back">Back</button><button class="btn" data-a="ob-next">Next: your neighbors</button></div>';
  }else{''','''(chosen.length?'<div class="stack">'+chosen.map(function(c,i){return '<div class="sk-row"><div class="top2"><span class="nm" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">'+ico(c.n,"xs")+'<input class="in skname" data-in="ob-skname" data-id="'+i+'" value="'+esc(c.n)+'" maxlength="60" aria-label="Skill name"></span><span class="seg" role="group" aria-label="Rate type"><button class="'+(c.u==="hr"?"on":"")+'" data-a="ob-unit" data-id="'+i+'" data-v="hr">per hour</button><button class="'+(c.u==="flat"?"on":"")+'" data-a="ob-unit" data-id="'+i+'" data-v="flat">flat</button></span><button class="x btn sm quiet" data-a="ob-del" data-id="'+i+'" aria-label="Remove '+esc(c.n)+'">'+ICON.x+'</button></div>'+rateSlider("ob:"+i,c.r,c.u)+'</div>'}).join("")+'</div>':'<p class="hint">No skills yet. You can skip this and just ask for help.</p>')+
''')
rep('''if(a==="ob-unit"){S.ob.skills.forEach(function(c){if(c.n===id)c.u=v});render(true);return}''','''if(a==="ob-unit"){var ou=S.ob.skills[+id];if(ou)ou.u=v;render(true);return}
  if(a==="ob-del"){S.ob.skills.splice(+id,1);render(true);return}''')
rep('''if(id.indexOf("ob:")===0){var n=id.slice(3);S.ob.skills.forEach(function(c){if(c.n===n){c.r=v;unit=c.u}})}''','''if(id.indexOf("ob:")===0){var oc=S.ob.skills[+id.slice(3)];if(oc){oc.r=v;unit=oc.u}}''')
rep('''  if(k==="me-name"){S.me.name=t.value;return}''','''  if(k==="me-name"){S.me.name=t.value;return}
  if(k==="ob-skname"){var sk0=S.ob.skills[+t.getAttribute("data-id")];if(sk0)sk0.n=t.value;return}
  if(k==="draft"){S.draft=t.value;var cn=$("#cnt");if(cn){cn.textContent=t.value.length+"/300";cn.classList.toggle("over",t.value.length>=300)}return}''')
rep('''skills:S.ob.skills.map(function(k){return {name:k.n,rate:k.r,unit:k.u}})''','''skills:S.ob.skills.filter(function(k){return k.n.trim()}).map(function(k){return {name:k.n.trim().slice(0,60),rate:k.r,unit:k.u}})''')

# ---- skills edit ----
rep('''<span class="row" style="gap:6px">'+rateChip(s.r,s.u)+'<button class="x" data-a="del-skill"''','''<span class="row" style="gap:6px">'+rateChip(s.r,s.u)+'<button class="x edit" data-a="edit-skill" data-id="'+s.id+'" aria-label="Edit '+esc(s.n)+'">'+ICON.pen+'</button><button class="x" data-a="del-skill"''')
rep('''ICON.flag=''','''ICON.pen='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-5L16 4l4 4L9 19z"/></svg>';
ICON.img='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>';
ICON.flag=''')
cut('function skillModal(){','function profileModal(){','''function skillModal(sk){
  var u=sk?sk.u:"hr";modal.editId=sk?sk.id:null;
  modal('<h2>'+(sk?"Edit skill":"Offer a skill")+'</h2><div class="field"><label for="sn">What can you do?</label><input class="in" id="sn" maxlength="60" placeholder="e.g. Lawn care" value="'+esc(sk?sk.n:"")+'"></div>'+
   '<div class="field"><span class="lbl">Your rate</span>'+rateSlider("skill",sk?sk.r:0,u)+'<div><span class="seg" role="group" aria-label="Rate type"><button class="'+(u==="hr"?"on":"")+'" data-a="sunit" data-v="hr">per hour</button><button class="'+(u==="flat"?"on":"")+'" data-a="sunit" data-v="flat">flat</button></span></div></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-skill">'+(sk?"Save skill":"Add skill")+'</button></div>');
  modal.unit=u;
}
function bannerModal(){
  modal('<div class="row"><h2 class="grow" style="font-size:30px">Choose a banner</h2><button class="btn sm quiet" data-a="close" aria-label="Close">'+ICON.x+'</button></div><div class="bngrid">'+BANNER_NAMES.map(function(nm,i){return '<button class="bn'+((S.me.banner||0)===i?" on":"")+'" data-a="set-banner" data-id="'+i+'" aria-label="'+nm+'" aria-pressed="'+((S.me.banner||0)===i)+'"><span class="bnart">'+G.cover(i)+'</span><span class="bnname">'+nm+'</span></button>'}).join("")+'</div>');
}
''')
rep('''  if(a==="add-skill"){skillModal();return}''','''  if(a==="add-skill"){skillModal();return}
  if(a==="edit-skill"){var es=S.me.skills.filter(function(k){return String(k.id)===id})[0];if(es)skillModal(es);return}
  if(a==="pick-banner"){bannerModal();return}
  if(a==="set-banner"){api("PUT","/api/me/banner",{banner:+id}).then(function(r){setMe(r);closeModal();renderLeft();toast("Banner updated")}).catch(fail);return}''')
rep('''    api("POST","/api/skills",{name:sn,rate:sr,unit:su}).then(function(res){S.me.skills.push(mapSkill(res.skill));closeModal();renderLeft();toast("Skill added to your profile");burst(LASTPT.x,LASTPT.y,40)}).catch(function(e){t.disabled=false;fail(e)});return}''','''    if(modal.editId){api("PUT","/api/skills/"+modal.editId,{name:sn,rate:sr,unit:su}).then(function(res){var nk=mapSkill(res.skill);S.me.skills=S.me.skills.map(function(k){return k.id===nk.id?nk:k});closeModal();renderLeft();toast("Skill updated")}).catch(function(e){t.disabled=false;fail(e)});return}
    api("POST","/api/skills",{name:sn,rate:sr,unit:su}).then(function(res){S.me.skills.push(mapSkill(res.skill));closeModal();renderLeft();toast("Skill added to your profile");burst(LASTPT.x,LASTPT.y,40)}).catch(function(e){t.disabled=false;fail(e)});return}''')

# profile banner
rep('''<div class="cover">'+G.cover()+'</div>''','''<div class="cover">'+G.cover(m.banner)+'<button class="bnbtn" data-a="pick-banner">Change banner</button></div>''')
rep('''picture:u.picture||"",hasAvatar''','''picture:u.picture||"",banner:u.banner||0,hasAvatar''')
rep('''phone:"",picture:"",skills:[]};S.friends={};''','''phone:"",picture:"",banner:0,skills:[]};S.friends={};''')

# needModal placeholders
rep('e.g. Help installing a sound system','e.g. Borrow a ladder for Saturday')

# photo limit copy
rep('"Optional. Neighbors will see it."','"Optional. Up to 20 MB."')
rep('toast("That photo is too big")','toast("Photos can be up to 20 MB.")')

# ---- posts: data ----
rep('''return {id:l.id,kind:l.kind,by:byUser(l.userId),title:l.title,body:l.body,r:l.rate,u:l.unit,when:timeAgo(l.createdAt)}''','''return {id:l.id,kind:l.kind,by:byUser(l.userId),title:l.title,body:l.body,r:l.rate,u:l.unit,when:timeAgo(l.createdAt),ts:new Date(l.createdAt).getTime()}''')
rep('''return {id:p.id,by:byUser(p.userId),text:p.text,when:timeAgo(p.createdAt),likes:p.likes,liked:p.liked}''','''return {id:p.id,by:byUser(p.userId),text:p.text,when:timeAgo(p.createdAt),ts:new Date(p.createdAt).getTime(),likes:p.likes,liked:p.liked,img:!!p.hasImage}''')
rep('''S.listings.unshift({id:res.listing.id,kind:kind,by:"me",title:ti,body:body,r:r,u:unit,when:"Just now"});''','''S.listings.unshift({id:res.listing.id,kind:kind,by:"me",title:ti,body:body,r:r,u:unit,when:"Just now",ts:Date.now()});''')

# postCard image
rep('''<p style="font-size:17px">'+esc(p.text)+'</p>'+''','''<p class="ptext">'+esc(p.text)+'</p>'+(p.img?'<button class="pimgwrap" data-a="view-img" data-id="'+p.id+'" aria-label="View photo larger"><img class="pimg" loading="lazy" src="/api/posts/'+p.id+'/image" alt="Photo shared by '+esc(name)+'"></button>':"")+''')

# ---- merged feed ----
cut('''  var tabs='<div class="tabs" role="tablist">''','''function renderApp(){''','''  var welcome='<section class="card welcome'+(pop?" pop":"")+'"><p class="eyebrow" style="color:var(--on-brand);opacity:.85">Good to see you</p><h2 style="font:400 clamp(30px,5vw,44px)/1 var(--font-display);margin:6px 0 14px">Hi '+esc(S.me.name.split(" ")[0])+'. Who needs a hand today?</h2><div class="actionbar"><button class="btn need" data-a="post-need">Post a need</button><button class="btn sun" data-a="add-skill">Offer a skill</button></div>'+G.mini()+'</section>';
  var composer='<section class="card cmp stack" style="gap:12px"><label class="lbl" for="np">Share something with the street</label><textarea class="in" id="np" maxlength="300" placeholder="Thank a neighbor, announce a swap, ask for tips..." data-in="draft">'+esc(S.draft)+'</textarea>'+
   (S.pimgUrl?'<div class="pprev"><img src="'+S.pimgUrl+'" alt="Photo you are about to post"><button class="btn sm quiet" data-a="rm-pimg">Remove photo</button></div>':"")+
   '<div class="row" style="justify-content:space-between"><div class="row wrapf" style="gap:10px"><label class="btn sm sun" for="pimgfile" tabindex="0">'+ICON.img+(S.pimgUrl?"Change photo":"Add photo")+'</label><span class="muted sm">Photos up to 30 MB</span></div><div class="row" style="gap:12px"><span class="cnt'+(S.draft.length>=300?" over":"")+'" id="cnt">'+S.draft.length+'/300</span><button class="btn sm" data-a="post-text">Post</button></div></div><input type="file" id="pimgfile" accept="image/*" hidden></section>';
  var F=[["all","All"],["post","Posts"],["need","Needs a hand"],["borrow","Borrow"],["offer","Offers"],["free","Free only"]];
  var items=[];
  S.listings.forEach(function(l){if(S.filter==="all"||(S.filter==="free"?!l.r:l.kind===S.filter))items.push({ts:l.ts||0,h:function(){return listingCard(l)}})});
  if(S.filter==="all"||S.filter==="post")S.posts.forEach(function(p){items.push({ts:p.ts||0,h:function(){return postCard(p)}})});
  items.sort(function(a,b){return b.ts-a.ts});
  el.innerHTML=welcome+composer+'<div class="chips" role="group" aria-label="Filter the feed">'+F.map(function(f){return '<button class="chip'+(S.filter===f[0]?" on":"")+'" data-a="filter" data-v="'+f[0]+'" aria-pressed="'+(S.filter===f[0])+'">'+f[1]+'</button>'}).join("")+'</div>'+
   (items.length?items.map(function(x,i){return popc(x.h(),i)}).join(""):emptyCard("Nothing here yet.","Be the first to share something with the street.",'<button class="btn need" data-a="post-need">Post a need</button>'));
  S.pop=false;
}
''')
# post-text handler
cut('''  if(a==="post-text"){''','''});
document.addEventListener("input"''','''  if(a==="post-text"){var tx2=S.draft.trim();if(!tx2){toast("Write something first");return}t.disabled=true;
    api("POST","/api/posts",{text:tx2}).then(function(res){
      var np={id:res.post.id,by:"me",text:tx2,when:"Just now",ts:Date.now(),likes:0,liked:false,img:false},f=S.pimg;
      var done=function(){S.posts.unshift(np);S.draft="";clearPimg();S.pop=true;renderMain();toast("Shared with Sutton Fields");burst(LASTPT.x,LASTPT.y,36)};
      if(!f){done();return}
      return prepImage(f).then(function(b){return uploadImage(np.id,b)}).then(function(){np.img=true;done()}).catch(function(e){done();toast((e&&e.message)||"Posted, but the photo didn't upload.")})
    }).catch(function(e){t.disabled=false;fail(e)});return}
  if(a==="rm-pimg"){clearPimg();renderMain();return}
  if(a==="view-img"){modal('<img class="lightimg" src="/api/posts/'+id+'/image" alt="Shared photo"><div class="row end"><button class="btn quiet" data-a="close">Close</button></div>',true);return}
''')
# image helpers before events
rep('''/* ---------- events ---------- */''','''/* ---------- post images ---------- */
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

/* ---------- events ---------- */''')
# file change handler for post image
rep('''document.addEventListener("change",function(e){
  var t=e.target;if(!t||t.id!=="avfile"''','''document.addEventListener("change",function(e){
  var t0=e.target;
  if(t0&&t0.id==="pimgfile"&&t0.files&&t0.files[0]){var pf=t0.files[0];t0.value="";
    if(!/^image\\//.test(pf.type)){toast("Please choose an image");return}
    if(pf.size>30*1024*1024){toast("Images can be up to 30 MB.");return}
    clearPimg();S.pimg=pf;S.pimgUrl=URL.createObjectURL(pf);renderMain();return}
  var t=e.target;if(!t||t.id!=="avfile"''')

# ---- admin storage tab ----
rep('''["streets","Streets",0],["danger","Danger zone",0]];''','''["streets","Streets",0],["storage","Storage",0],["danger","Danger zone",0]];''')
rep('''  }else{
    h+='<div class="notice warn"><b>These cannot be undone.</b>''','''  }else if(t==="storage"){
    var st=S.adm.storage;
    if(!st)h+='<p class="hint">Loading storage...</p>';
    else{h+='<div class="notice"><b>Database size: '+fmtBytes(st.totalBytes)+'</b><p class="sm">Everything the app stores (accounts, posts, photos, messages) lives in one database. Your Railway plan sets the limit.</p></div>'+
     st.items.map(function(x){var c=S.adm.confirm===x.key;return '<div class="sr admrow"><div class="grow"><b>'+esc(x.label)+'</b><span class="muted sm">'+x.count+' item'+(x.count===1?"":"s")+' &middot; '+fmtBytes(x.bytes)+'</span></div>'+(c?'<div class="stack" style="gap:8px"><button class="btn sm need" data-a="adm-clear-yes" data-v="'+x.key+'">Yes, delete all</button><button class="btn sm quiet" data-a="adm-clear-no">Keep</button></div>':'<button class="btn sm need" data-a="adm-clear" data-v="'+x.key+'"'+(x.count?"":" disabled")+'>Clear</button>')+'</div>'}).join("")+
     '<p class="muted sm">To remove a single post or listing, use Delete (admin) on the card in the feed.</p>'}
  }else{
    h+='<div class="notice warn"><b>These cannot be undone.</b>''')
rep('''  if(a==="adm-tab"){S.adm.tab=v;admPaint();return}''','''  if(a==="adm-tab"){S.adm.tab=v;S.adm.confirm=null;admPaint();if(v==="storage")admStorage();return}
  if(a==="adm-clear"){S.adm.confirm=v;admPaint();return}
  if(a==="adm-clear-no"){S.adm.confirm=null;admPaint();return}
  if(a==="adm-clear-yes"){api("POST","/api/admin/clear",{what:v}).then(function(){S.adm.confirm=null;toast("Cleared");return Promise.all([admStorage(),admLoad(),loadAll()])}).then(function(){renderApp()}).catch(fail);return}''')
rep('''function openAdmin(){''','''function admStorage(){return api("GET","/api/admin/storage").then(function(d){S.adm.storage=d;admPaint()}).catch(fail)}
function openAdmin(){''')
open(p,'w').write(s)

# ---- CSS ----
c=open('public/styles.css').read()
c+='''
/* v3 additions */
.wm{display:inline-flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left}
.wm .wm-t{display:block;font:400 34px/.9 var(--font-display);letter-spacing:-.01em}
.wm .wm-sub{display:block;font:500 10px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-muted)}
.wm.on-dark .wm-sub{color:var(--on-brand);opacity:.8}
.profile .cover .bnbtn{position:absolute;right:8px;bottom:8px;padding:6px 10px;border:2px solid var(--ink);border-radius:var(--r-pill);background:var(--surface);font:700 12px/1 var(--font-sans);cursor:pointer;z-index:2}
.bngrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}
@media(min-width:560px){.bngrid{grid-template-columns:repeat(4,1fr)}}
.bn{display:grid;gap:6px;padding:0;border:3px solid var(--ink);border-radius:var(--r-md);background:var(--surface);cursor:pointer;overflow:hidden;text-align:left}
.bn.on{box-shadow:var(--shadow-pop);outline:3px solid var(--moss);outline-offset:2px}
.bn .bnart{display:block;height:64px;position:relative;border-bottom:3px solid var(--ink)}
.bn .bnart .coversvg{position:absolute;inset:0;width:100%;height:100%;display:block}
.bn .bnname{padding:0 10px 8px;font:700 13px/1.2 var(--font-sans)}
.skname{padding:8px 10px;font-weight:700;min-width:0}
.sk-row .top2 .x{flex:none}
.skrow .x.edit{margin-right:2px}
.cmp textarea{min-height:88px}
.cnt{font:500 13px/1 var(--font-mono);color:var(--ink-muted)} .cnt.over{color:var(--clay);font-weight:700}
.pprev{display:grid;gap:8px;justify-items:start}
.pprev img{max-width:100%;max-height:220px;border:3px solid var(--ink);border-radius:var(--r-md);object-fit:cover}
.ptext{font-size:17px;white-space:pre-wrap;overflow-wrap:anywhere}
.pimgwrap{display:block;width:100%;padding:0;border:3px solid var(--ink);border-radius:var(--r-md);overflow:hidden;background:var(--surface);cursor:zoom-in}
.pimg{display:block;width:100%;max-height:480px;object-fit:cover}
.lightimg{display:block;max-width:100%;max-height:70vh;margin:0 auto 14px;border:3px solid var(--ink);border-radius:var(--r-md)}
@media(max-width:560px){.wm .wm-t{font-size:30px}}
'''
open('public/styles.css','w').write(c)
