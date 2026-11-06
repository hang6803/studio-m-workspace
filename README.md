# Studio M Workspace

Studio M's team app for Mac (Tauri 2) and, later, phone (the same pages as a web app). The GitHub repo keeps its old name.

- **PIN lock** → **Home**: one sentence (your jobs not backed up, your next shoot) and a 3D graph of the year —
  drives (orange), editors (white), jobs (green backed up, red not backed up), upcoming shoots (hollow).
  Drag to turn, click a dot to pin it, click again to open its page. Year arrows and "Only not backed up" filter.
- **Sidebar** (phone: Home / Calendar / Search / Drives tabs) — Not backed up, each drive and editor with counts.
- **Drive / editor / job pages** — read only, every drive, editor and date links to its own page; a job shows what else is
  on the same drive and what else the same editor cut. Addresses like `#/drive/M1 2026`, so Back / Forward work.
- **小M** sits in the corner: tap it (or ⌘K) and it turns into the chat — instant matches while you type, ask questions,
  describe a shoot and add it to the Calendar from the card. Hermes Agent on this Mac by default
  (`http://127.0.0.1:8642/v1`); Ollama, LM Studio, OpenAI, Claude, OpenRouter or any OpenAI-compatible server in Settings.
- **Calendar** — shoot days (Sheet tab `Shoots`), add / edit by hand.
- **Backup** (sidebar and phone tab) — the Backup page with its own job form (add, edit, mark backed up, delete). Save hands the form to **Classic Backup** (the page from `hang6803/studio-m-backup`, kept loaded unseen), which writes with its own code: same rows, numbers, history, twin rules and outbox. Classic Backup itself is still in Settings.

Not backed up follows the Backup page: Video and Photo of one job are two rows, and a row is green only when both are backed up.

## Files

- `src/` — the shell (index.html, app.js, app.css, graph.js = the 3D graph, plain canvas)
- `vendor/backup/` — copy of the Backup page + Google bridge (`tools/sync_backup.sh ../studio-m-backup`; `SOURCE` = commit)
- `api/MApp.gs` — JSON API: add it as a second file next to Code.gs in the Backup Apps Script project (Code.gs is not changed)
- `tools/build.mjs` — builds `dist/` (shell + backup.html + fonts/logos taken from the Backup page)
- `src-tauri/` — the Mac app; `.github/workflows/build-mac.yml` builds the .dmg on GitHub (Run workflow, or push a `v*` tag)

## Data

Google Sheet "Studio M Backup Data" stays the only source. Jobs columns never change. New: tab `Shoots`
(id, name, dates, location, type, crew, notes, jobId, createdBy, createdAt, updatedBy, updatedAt) and Script properties
`PIN_SALT` + `UPIN_<name>` (set by the API; hashed personal PINs, never sent to the app).
`DEEPSEEK_KEY` stays on the server for Ask M. The app has no shared API key: after the PIN, the server checks the session token.

## Server setup (once)

1. Apps Script → + file `MApp` → paste `api/MApp.gs`. Do not add an API key to the app. After this version is deployed, delete an old Script property `API_KEY` if it is still there.
2. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone → copy the `/exec` link.
3. `config.local.json` (see `config.example.json`) for local builds, or the repo secret `M_API_URL` for GitHub builds. That secret is only the `/exec` address.

## Build

    npm install
    node tools/build.mjs        # no config → demo data (PINs Hang 1111, Mun 2222, Michael 3333; studio PIN 0000)
    npx tauri dev               # on a Mac
    npx tauri build             # .dmg in src-tauri/target/release/bundle/dmg

Unsigned (no Apple Developer account yet): the first time, right-click the app → Open.

## Phone app (PWA)
- Every push to `main` publishes `dist/` to GitHub Pages (`.github/workflows/pages.yml`), with the address from the secret `M_API_URL` built in. The API key is not in the page. The PIN signs you in; the session token is what the server checks after that. Turn it on once: Settings → Pages → Source "GitHub Actions".
- On the phone: open the Pages link → Share → Add to Home Screen (iPhone) or Install app (Android).
- Offline: after one online sign-in, the same PIN opens the last data saved on that phone, view only. Back online it asks for the PIN again.
