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

  // v3: 300-char posts, post images, banners, skill edit, admin storage
  ok((await a.call("POST", "/api/posts", { text: "x".repeat(301) })).s === 400, "post over 300 chars refused");
  const p3 = await a.call("POST", "/api/posts", { text: "y".repeat(300) });
  ok(p3.s === 201, "300-char post ok");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(500, 3)]);
  const up = async (who, id, buf, type) => { const x = await fetch(B + `/api/posts/${id}/image`, { method: "PUT", headers: { "Content-Type": type, Cookie: who.ck }, body: buf }); return x.status; };
  a.ck = (await (await fetch(B + "/api/auth/dev", { method: "POST", headers: J, body: JSON.stringify({ name: a.me.name }) })).headers.get("set-cookie")).split(";")[0];
  b.ck = (await (await fetch(B + "/api/auth/dev", { method: "POST", headers: J, body: JSON.stringify({ name: b.me.name }) })).headers.get("set-cookie")).split(";")[0];
  ok((await up(a, p3.j.post.id, Buffer.from("not an image at all"), "image/png")) === 400, "non-image refused");
  ok((await up(b, p3.j.post.id, png, "image/png")) === 404, "only the author can attach an image");
  ok((await up(a, p3.j.post.id, png, "image/png")) === 200, "image attached");
  ok((await b.call("GET", "/api/posts")).j.posts.find((x) => x.id === p3.j.post.id).hasImage === true, "hasImage flag");
  const im = await b.call("GET", `/api/posts/${p3.j.post.id}/image`);
  ok(im.s === 200 && im.ct === "image/png", "post image served");
  const big = await fetch(B + `/api/posts/${p3.j.post.id}/image`, { method: "PUT", headers: { "Content-Type": "image/png", Cookie: a.ck }, body: Buffer.alloc(31 * 1024 * 1024, 1) });
  ok(big.status === 413, "over 30 MB refused");
  ok((await a.call("PUT", "/api/me/banner", { banner: 3 })).j.user.banner === 3, "banner saved");
  ok((await a.call("PUT", "/api/me/banner", { banner: 99 })).s === 400, "bad banner refused");
  const sk = await a.call("POST", "/api/skills", { name: "Lawn care", rate: 20, unit: "hr" });
  const ed = await a.call("PUT", `/api/skills/${sk.j.skill.id}`, { name: "Garden care", rate: 30, unit: "flat" });
  ok(ed.j.skill.name === "Garden care" && ed.j.skill.rate === 30, "skill edited");
  ok((await b.call("PUT", `/api/skills/${sk.j.skill.id}`, { name: "Hack", rate: 1, unit: "hr" })).s === 404, "cannot edit someone else's skill");
  const stg = await admin.call("GET", "/api/admin/storage");
  ok(stg.s === 200 && stg.j.totalBytes > 0 && stg.j.items.some((x) => x.key === "images" && x.count >= 1), "admin storage report");
  ok((await a.call("GET", "/api/admin/storage")).s === 404, "storage is admin only");
  ok((await admin.call("POST", "/api/admin/clear", { what: "images" })).s === 200, "admin clears images");
  ok((await b.call("GET", `/api/posts/${p3.j.post.id}/image`)).s === 404, "image is gone");
  ok((await admin.call("POST", "/api/admin/clear", { what: "nope" })).s === 400, "bad clear target refused");

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
