# Folio

Folio is a small shared document editor. You can create a draft, format it, import a `.txt` or `.md` file, and share it with another person as an editor or a viewer.

It is intentionally not Google Docs. Realtime cursors, comments, and version history are out of scope.

## Reviewer accounts

| Name | Email | Password | What you will see |
| --- | --- | --- | --- |
| Khawer Ali | khawer.ali@ajaia.test | folio-demo | Owns **Product kickoff**. Alex can edit it. Sam can view it. Khawer can also edit Alex's **Hiring rubric**. |
| Alex Chen | alex.chen@ajaia.test | folio-demo | Owns **Hiring rubric**, shared with Khawer. Can edit **Product kickoff**. |
| Sam Okafor | sam.okafor@ajaia.test | folio-demo | Owns private **Interview notes**. Can view **Product kickoff** and cannot edit it. |

The account menu includes **Review as**. That signs in through the same login route and replaces the session cookie. A private window works too, if you want two people open at once.

## Run it locally

Requirements: Node.js 22 or newer.

```powershell
npm install
npm test
npm run dev
```

Open http://localhost:3000 and choose **Enter as Khawer**.

`npm run dev` works without environment variables. Documents are stored in `data/folio.json`. Delete that file and restart to restore the seeded workspace.

## Five-minute review

1. Enter as Khawer. Confirm **Product kickoff** is under Your documents and **Hiring rubric** is under Shared with you.
2. Open **Product kickoff**. Apply bold, italic, underline, a heading, and a list. Wait until the status says **Saved**. Refresh. The formatting is still there.
3. Open **Share**. Alex can edit. Sam can view. Remove or change a permission, then set it back.
4. Use **Review as Sam**. Open **Product kickoff**. The formatting bar is gone and the body is read-only.
5. Use **Review as Alex**. Open **Product kickoff**, change a sentence, and wait for **Saved**.
6. Use **Review as Khawer**. Import `examples/kickoff.md` from the project folder. The import becomes a new document you own.
7. Open **Interview notes** as Sam and share it with Khawer. Return as Khawer and confirm it appears under Shared with you.
8. Use **Download .md** on a formatted document. Headings, lists, bold, and italic are kept. Underline becomes plain text.

Optional conflict check, using two sessions:

1. Leave the kickoff open as Alex.
2. In a private window, edit the same document as Khawer and wait for **Saved**.
3. Type again as Alex. Folio refuses the stale save and asks you to reload. Reloading discards the unsaved text on that screen.

## Import limits

- `.txt` and `.md` only, up to 200 KB
- `.md` supports headings (`#` through `###`), paragraphs, `**bold**`, `*italic*`, bulleted lists, and numbered lists
- `.docx` and other office files are rejected in the UI and on the server
- Imported HTML is escaped. Saved document HTML is limited to the formatting controls above

## Production and Docker

Set `SESSION_SECRET` before `npm start`. Copy `.env.example` to `.env.local` for local production mode.

```powershell
npm run build
$env:SESSION_SECRET = "a-long-random-string"
npm start
```

Leave `COOKIE_SECURE` unset when you open Folio over plain HTTP, including localhost. Set `COOKIE_SECURE=true` only behind HTTPS.

```powershell
docker build -t folio .
docker run --rm -p 3000:3000 -e SESSION_SECRET=a-long-random-string -v folio-data:/app/data folio
```

The file store is safe on one Node process. Do not run several instances against the same `folio.json`. Hosts with an ephemeral disk, including a free web service that sleeps, will lose documents created after the seed when the disk is wiped. Put `FOLIO_DATA_PATH` on a persistent disk if the review deployment needs to keep new drafts.

Vercel and other serverless hosts are a poor fit: there is no durable local disk, and more than one instance would race on the file.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local app at http://localhost:3000 |
| `npm test` | Sharing, import, sanitizer, sessions, and the seeded workspace |
| `npm run build` | Production build |
| `npm start` | Serves the production build. Requires `SESSION_SECRET` |

## Where to read next

- [ARCHITECTURE.md](ARCHITECTURE.md) explains the cuts and the save model
- [AI_WORKFLOW.md](AI_WORKFLOW.md) explains how AI was used
- [SUBMISSION.md](SUBMISSION.md) lists the deliverables

## Troubleshooting

- Sign-in fails in production with a server error: `SESSION_SECRET` is missing.
- Sign-in appears to succeed but the next page asks again: you set `COOKIE_SECURE=true` while using HTTP.
- The library looks empty or corrupt: stop the app, delete `data/folio.json`, and start it again.
- Port 3000 is busy: `npx next dev -p 3001`
