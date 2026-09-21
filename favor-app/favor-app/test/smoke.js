// Run against a local server started with DEV_LOGIN=true: node test/smoke.js
const B = process.env.BASE || "http://localhost:3000";
const J = { "Content-Type": "application/json" };
async function as(name) {
  const r = await fetch(B + "/api/auth/dev", { method: "POST", headers: J, body: JSON.stringify({ name }) });
  const ck = r.headers.get("set-cookie").split(";")[0];
  const call = async (m, p, b) => {
    const x = await fetch(B + p, { method: m, headers: { ...J, Cookie: ck }, body: b ? JSON.stringify(b) : undefined });
    return { s: x.status, j: await x.json().catch(() => ({})) };
  };
  return { call, me: (await r.json()).user };
}
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
(async () => {
  const u = Date.now() % 100000;
  const a = await as("Ann" + u), b = await as("Ben" + u);
  ok((await a.call("GET", "/api/me")).s === 200, "me");
  {const r=await a.call("POST","/api/me/onboard", { name: a.me.name, street: "Maple Ct", contact: "messages", skills: [{ name: "Sound systems", rate: 25, unit: "hr" }], friends: [] });console.log(r.s,JSON.stringify(r.j));ok(r.s===200,"onboard a")}
  ok((await b.call("POST", "/api/me/onboard", { name: b.me.name, street: "Birch Loop", contact: "messages", skills: [], friends: [a.me.id] })).s === 200, "onboard b");
  ok((await a.call("POST", "/api/skills", { name: "Lawn care", rate: 0, unit: "hr" })).s < 300, "add skill");
  {const r=await a.call("POST","/api/skills",{name:"x",rate:9999,unit:"hr"});ok(JSON.stringify(r.j).includes("500")&&!JSON.stringify(r.j).includes("9999"),"rate clamped to 500")}
  const l = await a.call("POST", "/api/listings", { kind: "borrow", title: "Need a pro microphone", body: "Saturday", rate: 0, unit: "flat" });
  ok(l.s < 300, "listing");
  ok(JSON.stringify((await b.call("GET", "/api/listings")).j).includes("pro microphone"), "b sees listing");
  const p = await a.call("POST", "/api/posts", { text: "Hello Sutton Fields" });
  ok(p.s < 300, "post");
  const pid = (p.j.post || p.j).id;
  ok((await b.call("POST", `/api/posts/${pid}/like`)).s === 200, "like");
  await b.call("DELETE", `/api/posts/${pid}`); ok(JSON.stringify((await a.call("GET","/api/posts")).j).includes("Hello Sutton"), "others cannot delete my post");
  ok((await b.call("POST", `/api/messages/${a.me.id}`, { body: "Can I borrow it?" })).s < 300, "send msg");
  const c = await a.call("GET", "/api/conversations");
  ok(c.j.unread === 1, "unread badge = 1");
  ok(JSON.stringify((await a.call("GET", `/api/messages/${b.me.id}`)).j).includes("borrow"), "read thread");
  ok((await a.call("GET", "/api/conversations")).j.unread === 0, "marked read");
  ok((await fetch(B + "/api/me")).status === 401, "anon blocked");
  console.log("ALL PASSED");
})().catch(e => { console.error(e); process.exit(1); });
