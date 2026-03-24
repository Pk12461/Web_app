# MentorLoop

A responsive student learning platform website built with HTML, CSS, JavaScript, React (for enrollment UI), and a Node.js + PostgreSQL enrollment API.

## Live now

- Temporary public URL: `https://0cb32a96f77cbc.lhr.life`
- This link stays online only while the local tunnel and local server are running on this machine.
- If you restart the tunnel later, the URL may change. The newest address is always saved in `public-url.txt`.

## Features

- Modern hero section with dashboard-style visual
- Student-focused sections for features, course categories, roadmap, testimonials, and pricing
- Responsive layout for desktop, tablet, and mobile
- Interactive mobile navigation
- Course category filters
- Rotating testimonials
- Simple email CTA form feedback

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

3. Start app + API server:

```bash
npm start
```

4. Open `http://localhost:3000`.

If you only want static preview without backend, you can still open `index.html` directly.

## PostgreSQL storage for enrollment form

Enrollment form submissions are now sent to `POST /api/enroll` and stored in PostgreSQL table `mentorloop_leads`.

## Quick backend URL (no setup)

If you need a backend URL immediately, use the Python API + localhost.run tunnel:

```powershell
.\go-online-backend.ps1
```

This starts:

- `api-server.py` on `http://127.0.0.1:8787`
- a temporary public URL saved in `backend-url.txt`

Stop it with:

```powershell
.\stop-online-backend.ps1
```

Environment variables (`.env`):

- `DATABASE_URL` (required)
- `PG_SSL` (`true` or `false`)
- `ADMIN_API_KEY` (required for lead queries)
- `PORT` (default `3000`)

## Cloudflare Pages deploy (static UI)

Use Pages only for frontend files from `dist`:

```bash
npm run build:pages
npm run deploy:pages
```

Wrangler is configured in `wrangler.toml` with:

- `assets.directory = "./dist"`

This avoids uploading the whole repository and prevents large asset failures.

### Point frontend to external API

When frontend is on Pages and backend is hosted elsewhere, set API base URL in `enrollment.html`:

```html
<meta name="mentorloop-api-base" content="https://your-api-domain.com" />
```

If empty, frontend uses same-origin requests.

Schema file:

- `db-schema.sql`

The server also auto-creates this table at startup.

### Test enrollment API

```bash
npm run test:api
```

### Query saved leads

Use admin key header:

```bash
curl -H "x-admin-key: YOUR_ADMIN_API_KEY" "http://localhost:3000/api/leads?limit=25"
```

## Make it online from this PC

This project now includes Windows PowerShell helpers that start a local server and open a temporary public tunnel using `localhost.run`.

Start it:

```powershell
.\go-online.ps1
```

Stop it:

```powershell
.\stop-online.ps1
```

What these scripts do:

- start a local Python server for the project
- open a public HTTPS tunnel
- save the current public URL in `public-url.txt`
- save running process info in `.study-online-online.json`

## Project structure

- `index.html` — page structure and content
- `styles.css` — responsive styling
- `main.js` — interactivity
- `server.mjs` — Express API + PostgreSQL integration
- `db-schema.sql` — enrollment database schema
- `.env.example` — environment variable template
- `test-enroll.mjs` — tiny API test runner
- `package.json` — optional project metadata
- `go-online.ps1` — starts a temporary public URL for the site
- `stop-online.ps1` — stops the local server and tunnel

## Validation checklist

- Header navigation works on desktop and mobile
- Course filter buttons update the visible cards
- Testimonial dots switch between student reviews
- CTA form shows a confirmation message after submission
- `index.html` opens correctly in a browser without a build step
- `.\go-online.ps1` prints a public HTTPS URL when Python and SSH are available

