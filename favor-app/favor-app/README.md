# Favor.

Together, anything is possible. A neighbor help-exchange for Sutton Fields.
Node 22 + Express + Postgres, Google sign-in, served as one Railway service.

## 1. Get your Google Client ID (about 5 minutes)

1. Go to https://console.cloud.google.com and create a project (name it "Favor").
2. Menu > APIs & Services > OAuth consent screen (Google Auth Platform > Branding).
   - App name: Favor. | User support email: yours | Audience: External
   - Publish the app ("In production") so any neighbor can sign in. Basic sign-in (name, email, photo) needs no Google review.
3. Menu > APIs & Services > Credentials > Create credentials > OAuth client ID.
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add `https://YOUR-APP.up.railway.app` (your Railway domain) and `http://localhost:3000` for local tests.
   - Leave redirect URIs empty. This app uses the Google button and verifies the ID token on the server.
4. Copy the Client ID (ends in `.apps.googleusercontent.com`). No client secret is needed.

## 2. Deploy on Railway

1. Push this folder to a GitHub repo.
2. Railway: New Project > Deploy from GitHub repo. Then + New > Database > PostgreSQL.
3. On the web service, Variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `GOOGLE_CLIENT_ID` = your Client ID
   - `SESSION_SECRET` = a long random string (`openssl rand -hex 32`)
   - `NODE_ENV` = `production`
4. Settings > Networking > Generate Domain, then add that domain to the Google origins in step 1.3.

Tables are created automatically on boot. Health check: `/healthz`.

## Local development

    cp .env.example .env   # fill in, or set DEV_LOGIN=true to skip Google
    npm install
    npm start
    node test/smoke.js     # API checks (needs DEV_LOGIN=true)

`DEV_LOGIN` is ignored in production. Optional: `STREETS` (comma list) to change the street choices.
