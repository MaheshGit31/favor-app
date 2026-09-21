"use strict";
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("./db");
const streetsLib = require("./streets");

const PROD = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const DEV_LOGIN = !PROD && process.env.DEV_LOGIN === "true";
// Private list of Google emails that get the admin tools. Never exposed to the browser.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const isAdmin = (u) => !!(u && u.email && ADMIN_EMAILS.includes(String(u.email).toLowerCase()) && (!PROD || !String(u.google_sub).startsWith("dev:")));

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (PROD) throw new Error("SESSION_SECRET must be set in production");
  SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("SESSION_SECRET not set: using a random one (sessions reset on restart).");
}

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const COOKIE = "favor_session";
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: PROD,
  maxAge: 1000 * 60 * 60 * 24 * 30,
  path: "/",
};

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://accounts.google.com/gsi/client"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com/gsi/style"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://*.googleusercontent.com"],
        "connect-src": ["'self'", "https://accounts.google.com/gsi/"],
        "frame-src": ["https://accounts.google.com/gsi/"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": PROD ? [] : null,
      },
    },
    // Google's popup sign-in needs this instead of the default same-origin.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
  })
);
const smallJson = express.json({ limit: "20kb" });
const avatarJson = express.json({ limit: "400kb" });
app.use((req, res, next) => (req.method === "PUT" && req.path === "/api/me/avatar" ? avatarJson(req, res, next) : smallJson(req, res, next)));
app.use(cookieParser());

// Every state-changing API call must be JSON: this blocks plain cross-site form posts.
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const hasBody = req.headers["content-length"] && req.headers["content-length"] !== "0";
    if (hasBody && !req.is("application/json")) return res.status(415).json({ error: "Send JSON." });
    if (PROD) {
      const origin = req.headers.origin;
      if (origin) {
        const host = req.headers.host;
        try { if (new URL(origin).host !== host) return res.status(403).json({ error: "Cross-site request blocked." }); }
        catch { return res.status(403).json({ error: "Bad origin." }); }
      }
    }
  }
  next();
});

app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: "draft-8", legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-8", legacyHeaders: false });
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 40, standardHeaders: "draft-8", legacyHeaders: false,
  skip: (req) => req.method === "GET",
  keyGenerator: (req) => (req.user ? "u" + req.user.id : req.ip),
  validate: { keyGeneratorIpFallback: false },
});

/* ---------------- helpers ---------------- */
const clean = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const cleanMultiline = (v, max) => (typeof v === "string" ? v.replace(/\r/g, "").trim().slice(0, max) : "");
const rateOf = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(500, Math.max(0, n)) : 0; };
const unitOf = (v) => (v === "hr" ? "hr" : "flat");
const idOf = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n < 2147483647 ? n : null; };
const httpsUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.toString().slice(0, 500) : null; } catch { return null; } };
const bad = (res, msg, code = 400, extra) => res.status(code).json({ error: msg, ...(extra || {}) });
const pic = (u) => (u.avatar_at ? `/api/avatar/${u.id}?v=${new Date(u.avatar_at).getTime()}` : u.picture || null);

function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, SESSION_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE, token, cookieOpts);
}

async function loadUser(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return next();
  try {
    const { uid } = jwt.verify(token, SESSION_SECRET);
    const { rows } = await db.query("SELECT * FROM users WHERE id=$1", [uid]);
    if (rows[0]) req.user = rows[0];
  } catch { /* invalid or expired token: treat as signed out */ }
  next();
}
const requireAuth = (req, res, next) => (req.user ? next() : bad(res, "Please sign in.", 401));
const requireAdmin = (req, res, next) => (isAdmin(req.user) ? next() : bad(res, "Not found.", 404));
const requireOnboarded = (req, res, next) => (req.user && req.user.onboarded ? next() : bad(res, "Finish setting up your profile first.", 403));
app.use("/api", loadUser, writeLimiter);

const skillOut = (s) => ({ id: s.id, name: s.name, rate: s.rate, unit: s.unit });

async function fullMe(user) {
  const [skills, friends, unread, lastReq] = await Promise.all([
    db.query("SELECT id,name,rate,unit FROM skills WHERE user_id=$1 ORDER BY id", [user.id]),
    db.query("SELECT friend_id FROM friendships WHERE user_id=$1", [user.id]),
    db.query("SELECT count(*)::int AS n FROM messages WHERE to_id=$1 AND read=false", [user.id]),
    db.query("SELECT id,address,status FROM street_requests WHERE user_id=$1 ORDER BY id DESC LIMIT 1", [user.id]),
  ]);
  return {
    user: {
      id: user.id, name: user.name, email: user.email, picture: pic(user), hasAvatar: !!user.avatar_at, street: user.street, address: user.address,
      isAdmin: isAdmin(user), request: lastReq.rows[0] || null,
      contact: user.contact, phone: user.phone, onboarded: user.onboarded, favorsDone: user.favors_done,
      skills: skills.rows.map(skillOut), friends: friends.rows.map((r) => r.friend_id),
    },
    unread: unread.rows[0].n,
  };
}

/* ---------------- public ---------------- */
app.get("/healthz", async (req, res) => {
  try { await db.query("SELECT 1"); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); }
});
app.get("/api/config", (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID, devLogin: DEV_LOGIN }));

/* ---------------- auth ---------------- */
app.post("/api/auth/google", authLimiter, async (req, res) => {
  if (!googleClient) return bad(res, "Google sign-in is not configured yet.", 503);
  const credential = req.body && req.body.credential;
  if (typeof credential !== "string" || credential.length > 4000) return bad(res, "Missing Google credential.");
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch { return bad(res, "Google could not verify that sign-in. Please try again.", 401); }
  if (!payload || !payload.sub || !payload.email_verified) return bad(res, "Your Google email is not verified.", 401);

  const name = clean(payload.name || payload.given_name || payload.email.split("@")[0], 80) || "Neighbor";
  const picture = httpsUrl(payload.picture || "");
  let { rows } = await db.query("SELECT * FROM users WHERE google_sub=$1", [payload.sub]);
  let user = rows[0];
  if (!user) {
    ({ rows } = await db.query(
      "INSERT INTO users (google_sub,email,name,picture) VALUES ($1,$2,$3,$4) RETURNING *",
      [payload.sub, payload.email, name, picture]
    ));
    user = rows[0];
  } else {
    await db.query("UPDATE users SET email=$2, picture=COALESCE($3,picture) WHERE id=$1", [user.id, payload.email, picture]);
  }
  setSession(res, user.id);
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [user.id])).rows[0]));
});

// Local development only (never enabled in production).
app.post("/api/auth/dev", authLimiter, async (req, res) => {
  if (!DEV_LOGIN) return bad(res, "Not available.", 404);
  const name = clean(req.body && req.body.name, 80) || "Dev Neighbor";
  const sub = "dev:" + name.toLowerCase();
  let { rows } = await db.query("SELECT * FROM users WHERE google_sub=$1", [sub]);
  if (!rows[0]) ({ rows } = await db.query("INSERT INTO users (google_sub,email,name) VALUES ($1,$2,$3) RETURNING *", [sub, sub + "@example.test", name]));
  setSession(res, rows[0].id);
  res.json(await fullMe(rows[0]));
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

/* ---------------- me ---------------- */
app.get("/api/me", requireAuth, async (req, res) => res.json(await fullMe(req.user)));

function profileFields(body) {
  const name = clean(body.name, 80);
  const contact = body.contact === "phone" ? "phone" : "messages";
  const phone = contact === "phone" ? clean(body.phone, 30).replace(/[^\d+()\-. ]/g, "") || null : null;
  return { name, contact, phone };
}

// Parses a typed address and looks its street up on the approved list.
async function checkAddress(raw) {
  const address = clean(raw, 120);
  const p = streetsLib.parse(address);
  if (!p.num || p.key.length < 2) return { error: "Enter your full street address, like 123 Maple Court." };
  const { rows } = await db.query("SELECT id,name,key FROM streets");
  const hit = streetsLib.match(rows, address);
  return { address, key: p.key, street: hit ? hit.name : null };
}
// Admins bootstrap the list: their own street is approved automatically.
async function resolveStreet(user, raw) {
  const r = await checkAddress(raw);
  if (r.error) return { err: r.error, code: "bad_address" };
  if (r.street) return { address: r.address, street: r.street };
  if (isAdmin(user)) {
    const name = streetsLib.title(r.key);
    await db.query("INSERT INTO streets (name,key) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING", [name, r.key]);
    return { address: r.address, street: name };
  }
  return { err: "That street isn't on the approved Sutton Fields list yet.", code: "street_unverified" };
}
const streetProblem = (res, r) => bad(res, r.err, 422, { code: r.code });

app.post("/api/address/check", requireAuth, async (req, res) => {
  const r = await checkAddress(req.body && req.body.address);
  if (r.error) return bad(res, r.error, 422, { code: "bad_address" });
  let street = r.street, auto = false;
  if (!street && isAdmin(req.user)) { street = streetsLib.title(r.key); auto = true; }
  res.json({ ok: !!street, street, auto });
});

app.post("/api/street-requests", requireAuth, async (req, res) => {
  const r = await checkAddress(req.body && req.body.address);
  if (r.error) return bad(res, r.error, 422, { code: "bad_address" });
  if (r.street) return res.json({ matched: true, street: r.street });
  await db.query("DELETE FROM street_requests WHERE user_id=$1 AND status='pending'", [req.user.id]);
  const { rows } = await db.query("INSERT INTO street_requests (user_id,address,key) VALUES ($1,$2,$3) RETURNING id,address,status", [req.user.id, r.address, r.key]);
  res.status(201).json({ request: rows[0] });
});

app.put("/api/me", requireAuth, async (req, res) => {
  const body = req.body || {};
  const f = profileFields(body);
  if (!f.name) return bad(res, "Please enter your name.");
  let address = req.user.address, street = req.user.street;
  if (typeof body.address === "string" && clean(body.address, 120) !== (req.user.address || "")) {
    const r = await resolveStreet(req.user, body.address);
    if (r.err) return streetProblem(res, r);
    address = r.address; street = r.street;
  }
  if (!street) return bad(res, "Enter your street address.", 422, { code: "bad_address" });
  await db.query("UPDATE users SET name=$2, address=$3, street=$4, contact=$5, phone=$6 WHERE id=$1", [req.user.id, f.name, address, street, f.contact, f.phone]);
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0]));
});

app.post("/api/me/onboard", requireAuth, async (req, res) => {
  const b = req.body || {};
  const f = profileFields(b);
  if (!f.name) return bad(res, "Please enter your name.");
  const sr = await resolveStreet(req.user, b.address);
  if (sr.err) return streetProblem(res, sr);
  const skills = (Array.isArray(b.skills) ? b.skills : []).slice(0, 20)
    .map((s) => ({ name: clean(s && s.name, 60), rate: rateOf(s && s.rate), unit: unitOf(s && s.unit) })).filter((s) => s.name);
  const friendIds = [...new Set((Array.isArray(b.friends) ? b.friends : []).map(idOf).filter(Boolean))].filter((i) => i !== req.user.id).slice(0, 100);
  const client = await db.getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET name=$2, address=$3, street=$4, contact=$5, phone=$6, onboarded=true WHERE id=$1", [req.user.id, f.name, sr.address, sr.street, f.contact, f.phone]);
    await client.query("DELETE FROM skills WHERE user_id=$1", [req.user.id]);
    for (const s of skills) await client.query("INSERT INTO skills (user_id,name,rate,unit) VALUES ($1,$2,$3,$4)", [req.user.id, s.name, s.rate, s.unit]);
    if (friendIds.length) {
      const ok = await client.query("SELECT id FROM users WHERE id = ANY($1::int[]) AND onboarded=true", [friendIds]);
      for (const r of ok.rows) {
        await client.query("INSERT INTO friendships (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user.id, r.id]);
        await client.query("INSERT INTO friendships (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [r.id, req.user.id]);
      }
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0]));
});

/* ---------------- people & skills ---------------- */
app.get("/api/people", requireAuth, async (req, res) => {
  const [users, skills] = await Promise.all([
    db.query("SELECT id,name,picture,avatar_at,street,contact,phone,favors_done FROM users WHERE onboarded=true AND id<>$1 ORDER BY name LIMIT 500", [req.user.id]),
    db.query("SELECT id,user_id,name,rate,unit FROM skills WHERE user_id IN (SELECT id FROM users WHERE onboarded=true) ORDER BY id"),
  ]);
  const by = {};
  skills.rows.forEach((s) => (by[s.user_id] = by[s.user_id] || []).push(skillOut(s)));
  res.json({
    people: users.rows.map((u) => ({
      id: u.id, name: u.name, picture: pic(u), street: u.street, favorsDone: u.favors_done,
      contact: u.contact, phone: u.contact === "phone" ? u.phone : null, skills: by[u.id] || [],
    })),
  });
});

app.post("/api/skills", requireOnboarded, async (req, res) => {
  const name = clean(req.body && req.body.name, 60);
  if (!name) return bad(res, "Name your skill.");
  const count = (await db.query("SELECT count(*)::int AS n FROM skills WHERE user_id=$1", [req.user.id])).rows[0].n;
  if (count >= 30) return bad(res, "That's plenty of skills for now.");
  const { rows } = await db.query("INSERT INTO skills (user_id,name,rate,unit) VALUES ($1,$2,$3,$4) RETURNING *", [req.user.id, name, rateOf(req.body.rate), unitOf(req.body.unit)]);
  res.status(201).json({ skill: skillOut(rows[0]) });
});
app.delete("/api/skills/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("DELETE FROM skills WHERE id=$1 AND user_id=$2", [id, req.user.id]);
  res.json({ ok: true });
});

/* ---------------- listings ---------------- */
const listingOut = (l) => ({ id: l.id, userId: l.user_id, kind: l.kind, title: l.title, body: l.body, rate: l.rate, unit: l.unit, createdAt: l.created_at });
app.get("/api/listings", requireOnboarded, async (req, res) => {
  const { rows } = await db.query("SELECT * FROM listings ORDER BY created_at DESC, id DESC LIMIT 200");
  res.json({ listings: rows.map(listingOut) });
});
app.post("/api/listings", requireOnboarded, async (req, res) => {
  const b = req.body || {};
  const kind = ["need", "borrow", "offer"].includes(b.kind) ? b.kind : null;
  const title = clean(b.title, 100);
  if (!kind) return bad(res, "Pick a post type.");
  if (!title) return bad(res, "Give your post a title.");
  const body = cleanMultiline(b.body, 600);
  const { rows } = await db.query("INSERT INTO listings (user_id,kind,title,body,rate,unit) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [req.user.id, kind, title, body, rateOf(b.rate), unitOf(b.unit)]);
  res.status(201).json({ listing: listingOut(rows[0]) });
});
app.delete("/api/listings/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("DELETE FROM listings WHERE id=$1 AND user_id=$2", [id, req.user.id]);
  res.json({ ok: true });
});

/* ---------------- posts ---------------- */
app.get("/api/posts", requireOnboarded, async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.id,p.user_id,p.text,p.created_at,
            (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) AS likes,
            EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked
       FROM posts p ORDER BY p.created_at DESC, p.id DESC LIMIT 100`, [req.user.id]);
  res.json({ posts: rows.map((p) => ({ id: p.id, userId: p.user_id, text: p.text, createdAt: p.created_at, likes: p.likes, liked: p.liked })) });
});
app.post("/api/posts", requireOnboarded, async (req, res) => {
  const text = cleanMultiline(req.body && req.body.text, 1000);
  if (!text) return bad(res, "Write something first.");
  const { rows } = await db.query("INSERT INTO posts (user_id,text) VALUES ($1,$2) RETURNING *", [req.user.id, text]);
  res.status(201).json({ post: { id: rows[0].id, userId: req.user.id, text, createdAt: rows[0].created_at, likes: 0, liked: false } });
});
app.delete("/api/posts/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("DELETE FROM posts WHERE id=$1 AND user_id=$2", [id, req.user.id]);
  res.json({ ok: true });
});
app.post("/api/posts/:id/like", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  const exists = await db.query("SELECT 1 FROM posts WHERE id=$1", [id]);
  if (!exists.rows[0]) return bad(res, "That post is gone.", 404);
  const del = await db.query("DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2", [id, req.user.id]);
  let liked = false;
  if (del.rowCount === 0) { await db.query("INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, req.user.id]); liked = true; }
  const n = (await db.query("SELECT count(*)::int AS n FROM post_likes WHERE post_id=$1", [id])).rows[0].n;
  res.json({ liked, likes: n });
});

/* ---------------- friends ---------------- */
app.post("/api/friends/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id || id === req.user.id) return bad(res, "Bad id.");
  const u = await db.query("SELECT 1 FROM users WHERE id=$1 AND onboarded=true", [id]);
  if (!u.rows[0]) return bad(res, "That neighbor isn't here.", 404);
  await db.query("INSERT INTO friendships (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user.id, id]);
  await db.query("INSERT INTO friendships (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, req.user.id]);
  res.json({ ok: true });
});
app.delete("/api/friends/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("DELETE FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)", [req.user.id, id]);
  res.json({ ok: true });
});

/* ---------------- messages ---------------- */
app.get("/api/conversations", requireOnboarded, async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (other) other AS user_id, body, created_at,
            (SELECT count(*)::int FROM messages m2 WHERE m2.from_id=t.other AND m2.to_id=$1 AND m2.read=false) AS unread
       FROM (SELECT CASE WHEN from_id=$1 THEN to_id ELSE from_id END AS other, body, created_at, id
               FROM messages WHERE from_id=$1 OR to_id=$1) t
      ORDER BY other, id DESC`, [req.user.id]);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unread = rows.reduce((n, r) => n + r.unread, 0);
  res.json({ conversations: rows.map((r) => ({ userId: r.user_id, last: r.body, at: r.created_at, unread: r.unread })), unread });
});
app.get("/api/messages/:userId", requireOnboarded, async (req, res) => {
  const other = idOf(req.params.userId);
  if (!other) return bad(res, "Bad id.");
  const { rows } = await db.query(
    "SELECT id,from_id,body,created_at FROM messages WHERE (from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1) ORDER BY id DESC LIMIT 200", [req.user.id, other]);
  await db.query("UPDATE messages SET read=true WHERE to_id=$1 AND from_id=$2 AND read=false", [req.user.id, other]);
  res.json({ messages: rows.reverse().map((m) => ({ id: m.id, fromId: m.from_id, body: m.body, createdAt: m.created_at })) });
});
app.post("/api/messages/:userId", requireOnboarded, async (req, res) => {
  const other = idOf(req.params.userId);
  if (!other || other === req.user.id) return bad(res, "Bad id.");
  const body = cleanMultiline(req.body && req.body.body, 1000);
  if (!body) return bad(res, "Write a message first.");
  const u = await db.query("SELECT 1 FROM users WHERE id=$1 AND onboarded=true", [other]);
  if (!u.rows[0]) return bad(res, "That neighbor isn't here.", 404);
  const ref = clean(req.body.ref, 120) || null;
  const { rows } = await db.query("INSERT INTO messages (from_id,to_id,ref,body) VALUES ($1,$2,$3,$4) RETURNING id,created_at", [req.user.id, other, ref, body]);
  res.status(201).json({ message: { id: rows[0].id, fromId: req.user.id, body, createdAt: rows[0].created_at } });
});

/* ---------------- profile photos ---------------- */
app.put("/api/me/avatar", requireAuth, async (req, res) => {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String((req.body && req.body.image) || ""));
  if (!m) return bad(res, "Please choose a photo.");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 200 || buf.length > 150 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return bad(res, "That photo couldn't be used. Try a different one.");
  await db.query("INSERT INTO avatars (user_id,data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data", [req.user.id, buf]);
  await db.query("UPDATE users SET avatar_at=now() WHERE id=$1", [req.user.id]);
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0]));
});
app.delete("/api/me/avatar", requireAuth, async (req, res) => {
  await db.query("DELETE FROM avatars WHERE user_id=$1", [req.user.id]);
  await db.query("UPDATE users SET avatar_at=NULL WHERE id=$1", [req.user.id]);
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0]));
});
app.get("/api/avatar/:id", requireAuth, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.", 404);
  const { rows } = await db.query("SELECT data FROM avatars WHERE user_id=$1", [id]);
  if (!rows[0]) return bad(res, "No photo.", 404);
  res.set({ "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" });
  res.send(rows[0].data);
});

/* ---------------- reports ---------------- */
app.post("/api/reports", requireOnboarded, async (req, res) => {
  const b = req.body || {};
  const kind = b.kind === "post" || b.kind === "listing" ? b.kind : null;
  const id = idOf(b.id);
  if (!kind || !id) return bad(res, "Bad report.");
  const t = await db.query(kind === "post" ? "SELECT user_id FROM posts WHERE id=$1" : "SELECT user_id FROM listings WHERE id=$1", [id]);
  if (!t.rows[0]) return bad(res, "That post is already gone.", 404);
  if (t.rows[0].user_id === req.user.id) return bad(res, "That one is yours.");
  await db.query("INSERT INTO reports (reporter_id,kind,target_id,reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [req.user.id, kind, id, clean(b.reason, 300)]);
  res.status(201).json({ ok: true });
});

/* ---------------- admin (hidden from non-admins: they get a 404) ---------------- */
async function removeContent(kind, id) {
  await db.query(kind === "post" ? "DELETE FROM posts WHERE id=$1" : "DELETE FROM listings WHERE id=$1", [id]);
  await db.query("UPDATE reports SET status='resolved' WHERE kind=$1 AND target_id=$2", [kind, id]);
}
app.get("/api/admin/overview", requireAdmin, async (req, res) => {
  const [streets, requests, reports, counts] = await Promise.all([
    db.query("SELECT id,name FROM streets ORDER BY name"),
    db.query("SELECT r.id,r.address,r.key,r.created_at,u.name FROM street_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.id"),
    db.query(`SELECT rp.id,rp.kind,rp.target_id,rp.reason,rp.created_at,ru.name AS reporter,
                CASE WHEN rp.kind='post' THEN p.text ELSE l.title END AS content,
                CASE WHEN rp.kind='post' THEN pu.name ELSE lu.name END AS author
           FROM reports rp JOIN users ru ON ru.id=rp.reporter_id
           LEFT JOIN posts p ON rp.kind='post' AND p.id=rp.target_id LEFT JOIN users pu ON pu.id=p.user_id
           LEFT JOIN listings l ON rp.kind='listing' AND l.id=rp.target_id LEFT JOIN users lu ON lu.id=l.user_id
          WHERE rp.status='open' ORDER BY rp.id`),
    db.query(`SELECT (SELECT count(*)::int FROM users) AS users, (SELECT count(*)::int FROM posts) AS posts,
                     (SELECT count(*)::int FROM listings) AS listings, (SELECT count(*)::int FROM messages) AS messages`),
  ]);
  res.json({ streets: streets.rows, requests: requests.rows, reports: reports.rows, counts: counts.rows[0] });
});
app.post("/api/admin/street-requests/:id/approve", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  const r = (await db.query("SELECT * FROM street_requests WHERE id=$1 AND status='pending'", [id])).rows[0];
  if (!r) return bad(res, "That request was already handled.", 404);
  const name = clean(req.body && req.body.name, 60) || streetsLib.title(r.key);
  await db.query("INSERT INTO streets (name,key) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING", [name, r.key]);
  await db.query("UPDATE street_requests SET status='approved', decided_at=now() WHERE status='pending' AND (id=$1 OR key=$2)", [id, r.key]);
  res.json({ ok: true });
});
app.post("/api/admin/street-requests/:id/reject", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("UPDATE street_requests SET status='rejected', decided_at=now() WHERE id=$1 AND status='pending'", [id]);
  res.json({ ok: true });
});
app.post("/api/admin/streets", requireAdmin, async (req, res) => {
  const name = clean(req.body && req.body.name, 60);
  const key = streetsLib.parse(name).key;
  if (!name || key.length < 2) return bad(res, "Enter a street name, like Maple Court.");
  await db.query("INSERT INTO streets (name,key) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING", [name, key]);
  res.status(201).json({ ok: true });
});
app.delete("/api/admin/streets/:id", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("DELETE FROM streets WHERE id=$1", [id]);
  res.json({ ok: true });
});
app.post("/api/admin/reports/:id/dismiss", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await db.query("UPDATE reports SET status='resolved' WHERE id=$1", [id]);
  res.json({ ok: true });
});
app.post("/api/admin/reports/:id/remove", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  const r = (await db.query("SELECT kind,target_id FROM reports WHERE id=$1", [id])).rows[0];
  if (!r) return bad(res, "Report not found.", 404);
  await removeContent(r.kind, r.target_id);
  res.json({ ok: true });
});
app.delete("/api/admin/posts/:id", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await removeContent("post", id);
  res.json({ ok: true });
});
app.delete("/api/admin/listings/:id", requireAdmin, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  await removeContent("listing", id);
  res.json({ ok: true });
});
app.post("/api/admin/wipe", requireAdmin, async (req, res) => {
  const b = req.body || {};
  if (b.confirm !== "DELETE EVERYTHING") return bad(res, "Type DELETE EVERYTHING to confirm.");
  if (b.scope === "content") await db.query("TRUNCATE post_likes, posts, listings, messages, reports RESTART IDENTITY");
  else if (b.scope === "all") await db.query("TRUNCATE users, streets RESTART IDENTITY CASCADE");
  else return bad(res, "Choose what to clear.");
  console.warn(`ADMIN WIPE (${b.scope}) by user ${req.user.id}`);
  if (b.scope === "all") res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true, scope: b.scope });
});

app.use("/api", (req, res) => bad(res, "Not found.", 404));

/* ---------------- static frontend ---------------- */
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], maxAge: PROD ? "1h" : 0 }));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const st = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(st).json({ error: st === 413 ? "That file is too big." : st === 500 ? "Something went wrong on our side. Please try again." : "Bad request." });
});

async function start() {
  await db.migrate();
  // Optional: SEED_STREETS="Aiken,Maple Court" adds approved streets at boot (existing ones are left alone).
  for (const name of (process.env.SEED_STREETS || "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const key = streetsLib.parse(name).key;
    if (key.length >= 2) await db.query("INSERT INTO streets (name,key) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING", [name, key]);
  }
  return app.listen(PORT, () => console.log(`Favor. listening on ${PORT}` + (GOOGLE_CLIENT_ID ? "" : " (Google sign-in NOT configured)")));
}
if (require.main === module) start().catch((e) => { console.error(e); process.exit(1); });
module.exports = { app, start };
