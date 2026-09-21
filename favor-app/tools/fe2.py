import re
p='public/app.js'
s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1,("anchor count %d"%s.count(a),a[:90])
    s=s.replace(a,b)

# ---------- helpers: icons, photo row, address UI, admin
NEWFN=r'''
ICON.flag='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>';
function titleCase(k){return String(k||"").replace(/\b[a-z]/g,function(c){return c.toUpperCase()})}
function photoRow(){
  return '<div class="photorow">'+av(S.me,"big")+'<div class="grow"><b>Profile photo</b><p class="muted sm">'+(S.me.hasAvatar?"Looking good.":"Optional. Neighbors will see it.")+'</p>'+
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
  var tabs=[["requests","Addresses",d.requests.length],["reports","Reports",d.reports.length],["streets","Streets",0],["danger","Danger zone",0]];
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
  }else{
    h+='<div class="notice warn"><b>These cannot be undone.</b><p class="sm">Type DELETE EVERYTHING to unlock the buttons.</p><input class="in" id="adm-confirm" data-in="adm-confirm" placeholder="DELETE EVERYTHING" autocomplete="off"></div>'+
     '<div class="sr admrow"><div class="grow"><b>Clear all content</b><span class="muted sm">Deletes every post, listing, message and report. Keeps accounts, friends, skills and approved streets.</span></div><button class="btn sm need" data-a="adm-wipe" data-v="content">Clear content</button></div>'+
     '<div class="sr admrow"><div class="grow"><b>Wipe everything</b><span class="muted sm">Deletes all accounts, photos, content and the approved street list. Admins can sign in again afterward.</span></div><button class="btn sm need" data-a="adm-wipe" data-v="all">Wipe everything</button></div>';
  }
  return h}
function admPaint(){var m=$("#modal .modal");if(m)m.innerHTML=admView()}
function admLoad(){return api("GET","/api/admin/overview").then(function(d){S.adm.data=d;S.adminN=d.requests.length+d.reports.length;admPaint();var b=$("#admbadge");if(b){b.textContent=S.adminN;b.hidden=!S.adminN}}).catch(fail)}
function openAdmin(){S.adm={tab:"requests",data:null};modal(admView(),true);admLoad()}
'''
rep('function toast(msg){',NEWFN+'function toast(msg){')

# modal(): wide option
rep('function modal(html){$("#modal").innerHTML=\'<div class="scrim" data-a="scrim"><div class="modal" role="dialog"','function modal(html,wide){$("#modal").innerHTML=\'<div class="scrim" data-a="scrim"><div class="modal\'+(wide?" wide":"")+\'" role="dialog"')

# ---------- state
rep('me:{id:0,name:"",street:"",contact:"messages",phone:"",picture:"",skills:[]},\n  ob:{skills:[]}','me:{id:0,name:"",street:"",address:"",contact:"messages",phone:"",picture:"",skills:[]},\n  ob:{skills:[]}')
# setMe
rep('S.me={id:u.id,name:u.name,email:u.email,picture:u.picture||"",street:u.street||"",','S.me={id:u.id,name:u.name,email:u.email,picture:u.picture||"",hasAvatar:!!u.hasAvatar,isAdmin:!!u.isAdmin,req:u.request||null,address:u.address||(u.request&&u.request.address)||"",street:u.street||"",')

# ---------- onboarding step 0
m=re.search(r"""'<div class="field"><label for="ob-street">.*?</select></div>'\+\n""",s,re.S)
assert m
s=s[:m.start()]+"photoRow()+addrField()+\n"+s[m.end():]
rep('''  if(a==="ob-next"){if(S.step===0){if(!S.me.name.trim()){toast("Add your name first");return}if(!S.me.street){toast("Choose your street first");return}}S.step++;S._pan=true;render();return}''',
'''  if(a==="ob-next"){
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
      else toast("Still under review. Check back soon.")}).catch(fail);return}''')
rep('{name:S.me.name,street:S.me.street,contact:S.me.contact,phone:S.me.phone,skills:S.ob.skills','{name:S.me.name,address:S.me.address,contact:S.me.contact,phone:S.me.phone,skills:S.ob.skills')
rep('''burst(window.innerWidth/2,window.innerHeight*.35,90);startPolling()})
      .catch(function(e){t.disabled=false;fail(e)});return}''','''burst(window.innerWidth/2,window.innerHeight*.35,90);startPolling();refreshAdmin()})
      .catch(function(e){t.disabled=false;if(e&&e.code==="street_unverified"){S.step=0;S.addr={state:"unlisted"};render();return}fail(e)});return}''')
rep('S.view="home";S.tab="needs";S.q="";render();startPolling()})','S.view="home";S.tab="needs";S.q="";render();startPolling();refreshAdmin()})')
rep('if(S.view!=="home")return;refreshInbox();n++;','if(S.view!=="home")return;refreshInbox();refreshAdmin();n++;')

# api error code
rep('e.status=r.status;throw e}','e.status=r.status;e.code=j.code;throw e}')

# input handler
rep('  if(k==="me-street"){S.me.street=t.value;return}','  if(k==="me-street"){S.me.street=t.value;return}\n  if(k==="me-address"){S.me.address=t.value;if(S.addr){S.addr=null;var wn=document.querySelector(".ob .notice.warn");if(wn)wn.remove()}return}')

# ---------- profile modal
a=s.index('function profileModal(){'); b=s.index('function googleModal')
s=s[:a]+'''function profileModal(){
  var m=S.me;
  modal('<h2>Edit profile</h2>'+photoRow()+'<div class="field"><label for="pn">Name</label><input class="in" id="pn" value="'+esc(m.name)+'"></div>'+
   '<div class="field"><label for="pa">Street address</label><input class="in" id="pa" value="'+esc(m.address)+'" placeholder="123 Maple Court" autocomplete="street-address"><span class="muted sm">Neighbors only see your street'+(m.street?" ("+esc(m.street)+")":"")+'.</span><div id="pa-note"></div></div>'+
   '<div class="field"><label for="pc">Contact</label><select class="in" id="pc" data-in="pc-toggle"><option value="messages"'+(m.contact==="messages"?" selected":"")+'>Favor. messages only</option><option value="phone"'+(m.contact==="phone"?" selected":"")+'>Messages and phone</option></select></div>'+
   '<div class="field" id="phrow"'+(m.contact==="phone"?"":" hidden")+'><label for="pp">Phone number</label><input class="in" id="pp" type="tel" value="'+esc(m.phone||"")+'" autocomplete="tel"></div>'+
   '<div class="row end"><button class="btn quiet" data-a="close">Cancel</button><button class="btn" data-a="save-profile">Save</button></div>')
}
'''+s[b:]
rep('''    api("PUT","/api/me",{name:nm,street:$("#ps").value,contact:$("#pc").value,phone:($("#pp")||{}).value||""}).then(function(r){setMe(r);closeModal();renderApp();toast("Profile saved")}).catch(fail);return}''',
'''    api("PUT","/api/me",{name:nm,address:$("#pa").value,contact:$("#pc").value,phone:($("#pp")||{}).value||""}).then(function(r){setMe(r);closeModal();render(true);toast("Profile saved")})
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
  if(a==="adm-tab"){S.adm.tab=v;admPaint();return}
  if(a==="adm-approve"){var nin=document.querySelector('[data-in="adm-name"][data-id="'+id+'"]');api("POST","/api/admin/street-requests/"+id+"/approve",{name:nin?nin.value:""}).then(function(){toast("Approved. The street is on the list.");return admLoad()}).catch(fail);return}
  if(a==="adm-reject"){api("POST","/api/admin/street-requests/"+id+"/reject").then(function(){toast("Rejected");return admLoad()}).catch(fail);return}
  if(a==="adm-dismiss"){api("POST","/api/admin/reports/"+id+"/dismiss").then(function(){return admLoad()}).catch(fail);return}
  if(a==="adm-remove"){api("POST","/api/admin/reports/"+id+"/remove").then(function(){toast("Removed");return Promise.all([admLoad(),loadAll()])}).then(function(){renderApp()}).catch(fail);return}
  if(a==="adm-add-street"){var sn2=$("#adm-street");api("POST","/api/admin/streets",{name:sn2.value}).then(function(){toast("Street added");return admLoad()}).catch(fail);return}
  if(a==="adm-del-street"){api("DELETE","/api/admin/streets/"+id).then(function(){return admLoad()}).catch(fail);return}
  if(a==="adm-wipe"){var ci=$("#adm-confirm");if(!ci||ci.value!=="DELETE EVERYTHING"){toast("Type DELETE EVERYTHING first");if(ci)ci.focus();return}
    api("POST","/api/admin/wipe",{scope:v,confirm:ci.value}).then(function(){closeModal();if(v==="all"){resetSession();toast("Everything was cleared")}else{return loadAll().then(function(){renderApp();refreshAdmin();toast("All content cleared")})}}).catch(fail);return}''')

# ---------- cards
rep('  var kindLabel={need:"Needs a hand",borrow:"Borrow",offer:"Offer"}[l.kind];','  var kindLabel={need:"Needs a hand",borrow:"Borrow",offer:"Offer"}[l.kind];\n  var xtra=(mine||demo)?"":\'<button class="btn sm quiet" data-a="report" data-kind="listing" data-id="\'+l.id+\'" aria-label="Report this listing" title="Report">\'+ICON.flag+\'</button>\'+(S.me.isAdmin?\'<button class="btn sm quiet" data-a="admin-del" data-kind="listing" data-id="\'+l.id+\'">Delete (admin)</button>\':"");')
rep("'</span></div></div>'+cta+'</div></article>'","'</span></div></div><div class=\"row wrapf\" style=\"gap:8px\">'+cta+xtra+'</div></div></article>'")
rep("""Reply</button>')+'</div></article>'""","""Reply</button>')+(mine?"":'<button class="btn sm quiet" data-a="report" data-kind="post" data-id="'+p.id+'" aria-label="Report this post" title="Report">'+ICON.flag+'</button>')+(S.me.isAdmin&&!mine?'<button class="btn sm quiet" data-a="admin-del" data-kind="post" data-id="'+p.id+'">Delete (admin)</button>':"")+'</div></article>'""")

# ---------- topbar admin button
rep("""'<div class="row"><button class="btn sm sun" data-a="inbox" aria-label="Messages">'""","""'<div class="row">'+(S.me.isAdmin?'<button class="btn sm quiet" data-a="admin">Admin<span class="badge" id="admbadge"'+(S.adminN?"":" hidden")+'>'+(S.adminN||0)+'</span></button>':"")+'<button class="btn sm sun" data-a="inbox" aria-label="Messages">'""")

# ---------- photo upload listener (before boot)
rep('\nboot();\n})();','''
document.addEventListener("change",function(e){
  var t=e.target;if(!t||t.id!=="avfile"||!t.files||!t.files[0])return;
  var f=t.files[0];t.value="";
  if(!/^image\\//.test(f.type)){toast("Please choose an image");return}
  if(f.size>20*1024*1024){toast("That photo is too big");return}
  resizePhoto(f).then(function(u){return api("PUT","/api/me/avatar",{image:u})}).then(function(r){S.me.picture=r.user.picture||"";S.me.hasAvatar=!!r.user.hasAvatar;afterPhoto();toast("Photo updated")}).catch(fail)});
boot();
})();''')
open(p,'w').write(s)

# ---------- css
c=open('public/styles.css').read()
c+='''
/* photos, notices, admin */
.photorow{display:flex;align-items:center;gap:16px}
label.btn{cursor:pointer}
.notice{padding:12px 14px;border:3px solid var(--ink);border-radius:var(--r-md);background:var(--sage);display:grid;gap:6px;justify-items:start}
.notice.warn{background:var(--blush)}
.notice.ok{background:var(--sprout);color:var(--on-bright)}
.notice p{margin:0}
.modal.wide{max-width:760px}
.admrow{align-items:flex-start}
.admrow .in{margin-top:4px;padding:8px 10px}
.tabs .badge{margin-left:6px}
'''
open('public/styles.css','w').write(c)
print("patched")
