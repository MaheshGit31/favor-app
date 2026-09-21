// Local API checks. Start the server with DEV_LOGIN=true and ADMIN_EMAILS="dev:admin tester@example.test", then: node test/smoke.js
const B = process.env.BASE || "http://localhost:3000";
const J = { "Content-Type": "application/json" };
async function as(name) {
  const r = await fetch(B + "/api/auth/dev", { method: "POST", headers: J, body: JSON.stringify({ name }) });
  const ck = r.headers.get("set-cookie").split(";")[0];
  const call = async (m, p, b) => {
    const x = await fetch(B + p, { method: m, headers: { ...J, Cookie: ck }, body: b ? JSON.stringify(b) : undefined });
    const ct = x.headers.get("content-type") || "";
    return { s: x.status, ct, j: ct.includes("json") ? await x.json().catch(() => ({})) : {} };
  };
  return { call, me: (await r.json()).user };
}
const ok = (c, m) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
(async () => {
  const u = Date.now() % 100000;
  const admin = await as("Admin Tester");
  const a = await as("Ann" + u), b = await as("Ben" + u);
  const OAK = "Oak" + u.toString(36).replace(/\d/g, (d) => "abcdefghij"[d]) + " Lane"; // fresh street name each run

  // admin area is hidden from everyone else
  ok((await a.call("GET", "/api/admin/overview")).s === 404, "non-admin gets 404 on admin routes");
  ok(admin.me.isAdmin === true && a.me.isAdmin === false, "isAdmin flag");

  // admins bootstrap the approved street list with their own address
  const ad = await admin.call("POST", "/api/me/onboard", { name: admin.me.name, address: "1 Maple Court", contact: "messages", skills: [], friends: [] });
  ok(ad.s === 200 && ad.j.user.street === "Maple Court", "admin address auto-approved");
  ok((await admin.call("GET", "/api/admin/overview")).j.streets.some((s) => s.name === "Maple Court"), "street on approved list");

  // typed addresses are matched against the list (Ct == Court, case-insensitive)
  ok((await a.call("POST", "/api/address/check", { address: "42 maple ct." })).j.ok === true, "address check matches Ct to Court");
  const bad1 = await b.call("POST", "/api/me/onboard", { name: b.me.name, address: "9 " + OAK, contact: "messages", skills: [], friends: [] });
  ok(bad1.s === 422 && bad1.j.code === "street_unverified", "unlisted street is refused");
  ok((await b.call("POST", "/api/me/onboard", { name: b.me.name, address: OAK, contact: "messages" })).j.code === "bad_address", "address without house number is refused");

  // request a review, admin approves, then it works
  const rq = await b.call("POST", "/api/street-requests", { address: "9 " + OAK });
  ok(rq.s === 201, "review requested");
  const ov = await admin.call("GET", "/api/admin/overview");
  const pend = ov.j.requests.find((r) => r.address === "9 " + OAK);
  ok(!!pend, "admin sees the request");
  ok((await b.call("GET", "/api/me")).j.user.request.status === "pending", "user sees pending status");
  ok((await admin.call("POST", `/api/admin/street-requests/${pend.id}/approve`, { name: OAK })).s === 200, "admin approves");
  ok((await b.call("GET", "/api/me")).j.user.request.status === "approved", "user sees approved status");
  ok((await b.call("POST", "/api/me/onboard", { name: b.me.name, address: "9 " + OAK, contact: "messages", skills: [], friends: [] })).s === 200, "onboard passes after approval");
  ok((await a.call("POST", "/api/me/onboard", { name: a.me.name, address: "42 Maple Ct", contact: "messages", skills: [{ name: "Sound systems", rate: 25, unit: "hr" }], friends: [] })).s === 200, "onboard a");

  // core features
  ok((await a.call("POST", "/api/skills", { name: "Lawn care", rate: 0, unit: "hr" })).s < 300, "add skill");
  { const r = await a.call("POST", "/api/skills", { name: "x", rate: 9999, unit: "hr" }); ok(JSON.stringify(r.j).includes("500") && !JSON.stringify(r.j).includes("9999"), "rate clamped to 500"); }
  const l = await a.call("POST", "/api/listings", { kind: "borrow", title: "Need a pro microphone", body: "Saturday", rate: 0, unit: "flat" });
  ok(l.s < 300, "listing");
  ok(JSON.stringify((await b.call("GET", "/api/listings")).j).includes("pro microphone"), "b sees listing");
  const p = await a.call("POST", "/api/posts", { text: "Hello Sutton Fields " + u });
  ok(p.s < 300, "post");
  const pid = p.j.post.id;
  ok((await b.call("POST", `/api/posts/${pid}/like`)).s === 200, "like");
  await b.call("DELETE", `/api/posts/${pid}`);
  ok(JSON.stringify((await a.call("GET", "/api/posts")).j).includes("Hello Sutton Fields " + u), "others cannot delete my post");

  // reports + moderation
  ok((await a.call("POST", "/api/reports", { kind: "post", id: pid, reason: "x" })).s === 400, "cannot report own post");
  ok((await b.call("POST", "/api/reports", { kind: "post", id: pid, reason: "Spam" })).s === 201, "report a post");
  const rep = (await admin.call("GET", "/api/admin/overview")).j.reports.find((r) => r.target_id === pid);
  ok(rep && rep.content === "Hello Sutton Fields " + u && rep.reason === "Spam", "admin sees the report with content");
  ok((await admin.call("POST", `/api/admin/reports/${rep.id}/remove`)).s === 200, "admin removes reported post");
  ok(!JSON.stringify((await a.call("GET", "/api/posts")).j).includes("Hello Sutton Fields " + u), "post is gone");
  const p2 = await a.call("POST", "/api/posts", { text: "Another one" });
  ok((await admin.call("DELETE", `/api/admin/posts/${p2.j.post.id}`)).s === 200, "admin deletes any post directly");
  ok((await a.call("DELETE", `/api/admin/posts/1`)).s === 404, "non-admin cannot use admin delete");

  // profile photos (server checks JPEG magic bytes and size)
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(400, 7)]).toString("base64");
  ok((await a.call("PUT", "/api/me/avatar", { image: "data:image/png;base64," + jpeg })).s === 400, "non-JPEG photo refused");
  const av = await a.call("PUT", "/api/me/avatar", { image: "data:image/jpeg;base64," + jpeg });
  ok(av.s === 200 && av.j.user.picture.startsWith("/api/avatar/"), "photo uploaded, picture URL returned");
  const img = await a.call("GET", av.j.user.picture);
  ok(img.s === 200 && img.ct === "image/jpeg", "photo is served");
  ok((await b.call("GET", "/api/people")).j.people.some((x) => x.picture && x.picture.startsWith("/api/avatar/")), "neighbors see the photo");
  ok((await a.call("DELETE", "/api/me/avatar")).j.user.hasAvatar === false, "photo removed");

  // messages
  ok((await b.call("POST", `/api/messages/${a.me.id}`, { body: "Can I borrow it?" })).s < 300, "send msg");
  ok((await a.call("GET", "/api/conversations")).j.unread === 1, "unread badge = 1");
  ok(JSON.stringify((await a.call("GET", `/api/messages/${b.me.id}`)).j).includes("borrow"), "read thread");
  ok((await a.call("GET", "/api/conversations")).j.unread === 0, "marked read");

  // safety
  ok((await admin.call("POST", "/api/admin/wipe", { scope: "all", confirm: "yes" })).s === 400, "wipe needs the typed phrase");
  ok((await a.call("POST", "/api/admin/wipe", { scope: "all", confirm: "DELETE EVERYTHING" })).s === 404, "non-admin cannot wipe");
  ok((await fetch(B + "/api/me")).status === 401, "anon blocked");
  console.log("ALL PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
