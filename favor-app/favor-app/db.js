"use strict";
const { Pool } = require("pg");

let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Railway's private network (postgres.railway.internal) needs no SSL.
      // Set DATABASE_SSL=true when using a public proxy URL.
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 10,
    });
    pool.on("error", (err) => console.error("pg pool error", err.message));
  }
  return pool;
}

const query = (text, params) => getPool().query(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT,
  name TEXT NOT NULL,
  picture TEXT,
  street TEXT,
  contact TEXT NOT NULL DEFAULT 'messages',
  phone TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  favors_done INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate INT NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 500),
  unit TEXT NOT NULL DEFAULT 'hr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skills_user_idx ON skills(user_id);
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('need','borrow','offer')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  rate INT NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 500),
  unit TEXT NOT NULL DEFAULT 'flat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_created_idx ON listings(created_at DESC);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS friendships (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref TEXT,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages(from_id, to_id, id);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(to_id, read);
`;

async function migrate() {
  await query(SCHEMA);
}

module.exports = { query, getPool, migrate };
