import re
p='server.js'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert a in s, a[:60]
    s=s.replace(a,b,cnt)

# CSRF middleware: allow raw image uploads
rep('''    if (hasBody && !req.is("application/json")) return''','''    const isImageUpload = req.method === "PUT" && /^\\/posts\\/\\d+\\/image$/.test(req.path) && req.is("image/*");
    if (hasBody && !isImageUpload && !req.is("application/json")) return''')

# fullMe banner
rep("isAdmin: isAdmin(user), request: lastReq.rows[0] || null,","isAdmin: isAdmin(user), banner: user.banner || 0, request: lastReq.rows[0] || null,")

# skills edit + banner
rep('''app.delete("/api/skills/:id"''','''app.put("/api/skills/:id", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  const name = clean(req.body && req.body.name, 60);
  if (!id) return bad(res, "Bad id.");
  if (!name) return bad(res, "Name your skill.");
  const { rows } = await db.query("UPDATE skills SET name=$1, rate=$2, unit=$3 WHERE id=$4 AND user_id=$5 RETURNING *", [name, rateOf(req.body.rate), unitOf(req.body.unit), id, req.user.id]);
  if (!rows[0]) return bad(res, "That skill is gone.", 404);
  res.json({ skill: skillOut(rows[0]) });
});
app.put("/api/me/banner", requireAuth, async (req, res) => {
  const n = Math.round(Number(req.body && req.body.banner));
  if (!Number.isInteger(n) || n < 0 || n > 7) return bad(res, "Pick one of the banners.");
  await db.query("UPDATE users SET banner=$1 WHERE id=$2", [n, req.user.id]);
  res.json(await fullMe((await db.query("SELECT * FROM users WHERE id=$1", [req.user.id])).rows[0]));
});
app.delete("/api/skills/:id"''')

# posts
a=s.index('app.get("/api/posts", requireOnboarded')
b=s.index('app.delete("/api/posts/:id"')
new='''const postOut = (p) => ({ id: p.id, userId: p.user_id, text: p.text, createdAt: p.created_at, likes: p.likes || 0, liked: !!p.liked, hasImage: !!p.has_image });
app.get("/api/posts", requireOnboarded, async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.id,p.user_id,p.text,p.created_at,
            (SELECT count(*)::int FROM post_likes l WHERE l.post_id=p.id) AS likes,
            EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,
            EXISTS (SELECT 1 FROM post_images i WHERE i.post_id=p.id) AS has_image
       FROM posts p ORDER BY p.created_at DESC, p.id DESC LIMIT 100`, [req.user.id]);
  res.json({ posts: rows.map(postOut) });
});
app.post("/api/posts", requireOnboarded, async (req, res) => {
  const text = cleanMultiline(req.body && req.body.text, 300);
  if (!text) return bad(res, "Write something first.");
  if (typeof req.body.text === "string" && req.body.text.trim().length > 300) return bad(res, "Posts can be up to 300 characters.");
  const { rows } = await db.query("INSERT INTO posts (user_id,text) VALUES ($1,$2) RETURNING *", [req.user.id, text]);
  res.status(201).json({ post: postOut(rows[0]) });
});
const IMG_MAX = 30 * 1024 * 1024;
function sniffImage(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b.toString("latin1", 1, 4) === "PNG") return "image/png";
  if (b.toString("latin1", 0, 4) === "GIF8") return "image/gif";
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}
app.put("/api/posts/:id/image", requireOnboarded, express.raw({ type: "image/*", limit: IMG_MAX }), async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.");
  const own = await db.query("SELECT 1 FROM posts WHERE id=$1 AND user_id=$2", [id, req.user.id]);
  if (!own.rows[0]) return bad(res, "That post is gone.", 404);
  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const mime = buf && sniffImage(buf);
  if (!mime) return bad(res, "That image couldn't be used. Try a JPG, PNG, GIF or WebP.");
  if (buf.length > IMG_MAX) return bad(res, "Images can be up to 30 MB.", 413);
  await db.query("INSERT INTO post_images (post_id,mime,data) VALUES ($1,$2,$3) ON CONFLICT (post_id) DO UPDATE SET mime=EXCLUDED.mime, data=EXCLUDED.data", [id, mime, buf]);
  res.json({ ok: true });
});
app.get("/api/posts/:id/image", requireOnboarded, async (req, res) => {
  const id = idOf(req.params.id);
  if (!id) return bad(res, "Bad id.", 404);
  const { rows } = await db.query("SELECT mime,data FROM post_images WHERE post_id=$1", [id]);
  if (!rows[0]) return bad(res, "No image.", 404);
  res.set({ "Content-Type": rows[0].mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" });
  res.send(rows[0].data);
});
'''
s=s[:a]+new+s[b:]

# admin storage + clear
rep('app.post("/api/admin/wipe"','''const STORAGE_TABLES = [
  ["posts", "Posts (text)", "posts"], ["images", "Post images", "post_images"], ["messages", "Message history", "messages"],
  ["listings", "Needs and offers", "listings"], ["avatars", "Profile photos", "avatars"], ["reports", "Reports", "reports"],
];
app.get("/api/admin/storage", requireAdmin, async (req, res) => {
  const total = (await db.query("SELECT pg_database_size(current_database())::bigint AS n")).rows[0].n;
  const items = [];
  for (const [key, label, table] of STORAGE_TABLES) {
    const r = (await db.query(`SELECT count(*)::int AS n, pg_total_relation_size('${table}')::bigint AS bytes FROM ${table}`)).rows[0];
    items.push({ key, label, count: r.n, bytes: Number(r.bytes) });
  }
  const users = (await db.query("SELECT count(*)::int AS n FROM users")).rows[0].n;
  res.json({ totalBytes: Number(total), users, items });
});
app.post("/api/admin/clear", requireAdmin, async (req, res) => {
  const what = req.body && req.body.what;
  if (what === "posts") { await db.query("DELETE FROM reports WHERE kind='post'"); await db.query("TRUNCATE post_likes, post_images, posts RESTART IDENTITY"); }
  else if (what === "images") await db.query("TRUNCATE post_images");
  else if (what === "messages") await db.query("TRUNCATE messages RESTART IDENTITY");
  else if (what === "listings") { await db.query("DELETE FROM reports WHERE kind='listing'"); await db.query("TRUNCATE listings RESTART IDENTITY"); }
  else if (what === "avatars") { await db.query("TRUNCATE avatars"); await db.query("UPDATE users SET avatar_at=NULL"); }
  else if (what === "reports") await db.query("TRUNCATE reports RESTART IDENTITY");
  else return bad(res, "Choose what to clear.");
  console.warn(`ADMIN CLEAR (${what}) by user ${req.user.id}`);
  res.json({ ok: true, what });
});
app.post("/api/admin/wipe"''')
# wipe content should include images
rep("TRUNCATE post_likes, posts, listings, messages, reports RESTART IDENTITY","TRUNCATE post_likes, post_images, posts, listings, messages, reports RESTART IDENTITY")
open(p,'w').write(s)

p='db.js'; s=open(p).read()
rep("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_at TIMESTAMPTZ;","ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_at TIMESTAMPTZ;\nALTER TABLE users ADD COLUMN IF NOT EXISTS banner SMALLINT NOT NULL DEFAULT 0;\nCREATE TABLE IF NOT EXISTS post_images (\n  post_id INT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,\n  mime TEXT NOT NULL,\n  data BYTEA NOT NULL\n);")
open(p,'w').write(s)
