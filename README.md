# Sanjeevani Hospital Pokhara — Website + Admin CMS

A real, deployable hospital website with a working admin panel. Unlike a static
mockup, this has an actual backend (Node.js + Express) and database (SQLite),
so content edited in the admin panel is saved permanently and shown to every
visitor — on any hosting provider that runs Node.js.

## What's included

- **Public website** — homepage, departments, doctors, about, news, gallery,
  testimonials, appointment form, contact/footer — all driven by real data
  from the database, not hardcoded text.
- **Admin panel** at `/admin` — login-protected, lets you edit:
  - Homepage hero text
  - Statistics counters
  - Departments (add/edit/delete)
  - Doctors (add/edit/delete, status: Active / On Leave / Retired)
  - Testimonials (add/delete)
  - News & blog articles (draft/publish, SEO fields)
  - Gallery images (by category)
  - About page (story, mission, vision, chairman/director messages, history, values)
  - Appointments (approve/reject/delete, export CSV)
  - SEO settings (meta title, description, keywords, OG image)
  - Contact info & footer (phones, email, address, WhatsApp)
  - Admin password
- **Real authentication** — JWT-based login, passwords hashed with bcrypt
  (not visible in source code, unlike the earlier demo version).
- **SQLite database** — no separate database server to install or pay for;
  the whole database is a single file (`server/data.sqlite`) that lives next
  to your code.

## What's NOT included (be aware before you launch)

- **File uploads** — doctor photos, gallery images, and news cover images are
  entered as image URLs (e.g. paste a link from Cloudinary, Imgur, or your own
  server). Direct "upload from my computer" isn't wired up in this build.
- **Multiple user roles** — there's one admin account type for now, not the
  full Super Admin / Admin / Doctor / Receptionist split from the original spec.
- **Email/SMS notifications, 2FA, live chat, multi-language** — not built.
- **HTTPS** — your hosting provider needs to provide this (most do automatically).

These are all realistic additions for a "phase 2" if you want to keep
building this out.

## Project structure

```
hospital-site/
├── package.json
├── .env.example          ← copy to .env and fill in real values
├── server/
│   ├── server.js         ← Express app + all API routes
│   ├── db.js              ← SQLite schema + seed data
│   ├── auth.js             ← JWT helpers
│   └── data.sqlite        ← created automatically on first run
└── public/
    ├── index.html         ← public homepage
    ├── admin/index.html   ← admin panel shell
    └── assets/
        ├── style.css
        ├── app.js          ← public site logic
        ├── admin.js         ← admin panel logic
        └── logo.jpg
```

## Running it locally first (recommended before deploying)

You'll need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
cd hospital-site
npm install
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — any long random string
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your real admin login (used only the
  first time the server starts, to create the admin account)

Then:

```bash
npm start
```

Visit `http://localhost:3000` for the website, and `http://localhost:3000/admin`
to log in and edit content.

## Deploying to a hosting platform

This is a standard Node.js + Express app, so it runs on any host that
supports Node. A few good options, roughly easiest to most control:

### Option A — Render.com (easy, has a free tier)
1. Push this project to a GitHub repository.
2. On Render: **New → Web Service** → connect your repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables (`JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`)
   in Render's dashboard.
6. Deploy. Render gives you a live URL.

   **Note:** Render's free tier has an ephemeral filesystem on redeploys —
   for a real production hospital site, use a paid tier with a persistent
   disk, or migrate to Render's managed Postgres later (see "Growing past
   SQLite" below).

### Option B — Railway.app (similarly easy)
Same idea as Render: connect the GitHub repo, set the same environment
variables, Railway auto-detects the Node app and deploys it. Railway volumes
can be used to persist `server/data.sqlite` across deploys.

### Option C — A VPS (DigitalOcean, Hetzner, AWS Lightsail, etc.) — most control
1. SSH into your server, install Node.js 18+.
2. Upload the project (e.g. `git clone` your repo, or `scp` the folder).
3. `npm install`
4. Create your real `.env` file on the server.
5. Run it persistently with a process manager:
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name sanjeevani
   pm2 save
   ```
6. Put Nginx in front of it as a reverse proxy (forwarding port 80/443 to
   your Node app's port) and use **Certbot** for free HTTPS.

### Shared hosting / cPanel with "Node.js App" support
Many Nepali/Indian hosting panels now offer a Node.js App manager in cPanel.
If yours does:
1. Create a new Node.js app, pointing the app root at this folder.
2. Set the same environment variables in the cPanel Node.js interface.
3. Run `npm install` from the cPanel terminal or "Run NPM Install" button.
4. Start the app from the panel.

If your host **only** supports PHP/static hosting (no Node.js), this backend
won't run there — you'd need a host that supports Node, or migrate the
backend to a PHP equivalent (a different rebuild).

## Growing past SQLite (optional, later)

SQLite is genuinely fine for a single hospital's traffic. If you outgrow it —
multiple staff editing simultaneously at high volume, or you want managed
backups — the cleanest upgrade path is swapping `better-sqlite3` for
PostgreSQL via a small change in `server/db.js`, ideally using Prisma as the
original spec proposed. That's worth doing as a deliberate next project, not
something to bolt on casually.

## Security notes before going live

- Set a real, long `JWT_SECRET` — don't leave the default.
- Set a strong `ADMIN_PASSWORD` before the first run (it's only used once, to
  create the account — changing `.env` afterward won't change an existing
  account's password; use the **Account** tab inside the admin panel instead).
- Put this behind HTTPS in production (Render/Railway do this automatically;
  on a VPS, use Certbot).
- Back up `server/data.sqlite` regularly — it's your entire database.
