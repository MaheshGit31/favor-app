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
   - `ADMIN_EMAILS` = comma-separated Google emails of your admins (private, never sent to the browser)
4. Settings > Networking > Generate Domain, then add that domain to the Google origins in step 1.3.

Tables are created automatically on boot. Health check: `/healthz`.

## Admins and the approved street list

- Anyone who signs in with a Google email listed in `ADMIN_EMAILS` gets an **Admin** button. Everyone else gets a 404 from the admin API.
- Neighbors type their street address when they join. The street name is matched against the approved list (Ct and Court, upper and lower case all match). If it is not there they can **Request a review**.
- The list starts empty. When an admin joins, their own street is approved automatically, which seeds the list. After that, admins approve or reject requests and add or remove streets in **Admin > Addresses / Streets**.
- Admins can review reports, delete any post or listing, and (Danger zone) clear all content or wipe everything. Both need the typed phrase DELETE EVERYTHING.
- Profile photos are resized in the browser to 256px and stored in Postgres. Neighbors without one show their Google photo, then their initial.

## Local development

    cp .env.example .env   # fill in, or set DEV_LOGIN=true to skip Google
    npm install
    npm start
    node test/smoke.js     # API checks (needs DEV_LOGIN=true)

`DEV_LOGIN` is ignored in production. For local admin testing set `ADMIN_EMAILS="dev:admin tester@example.test"` and dev-login as "Admin Tester".

## Pre-approving streets

Set `SEED_STREETS=Aiken` (comma-separated) to approve street names on boot. A name with no suffix (like "Aiken") covers every suffix: Aiken Drive, Aiken Court, Aiken Lane, and so on.

## Posts, photos and storage

Posts are up to 300 characters with an optional photo (up to 30 MB in, resized to 1600px in the browser). Profile photos are up to 20 MB in and resized to 256px. Admins can see database size per category and clear posts, images, messages, listings, profile photos or reports from Admin > Storage.
