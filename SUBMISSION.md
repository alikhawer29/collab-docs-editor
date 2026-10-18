# Submission

Product: **Folio**, a shared document editor for a small team.

Candidate workspace: Khawer Ali. The primary review account uses that name. The login emails are seeded addresses, not a personal inbox.

## Included

- Source code in this folder
- [README.md](README.md) — local setup, seeded accounts, and the review script
- [ARCHITECTURE.md](ARCHITECTURE.md) — what was built, what was cut, and why
- [AI_WORKFLOW.md](AI_WORKFLOW.md) — how AI was used and what was rejected
- [SUBMISSION.md](SUBMISSION.md) — this file
- [examples/kickoff.md](examples/kickoff.md) — sample import
- `WALKTHROUGH_URL.txt` — walkthrough video URL
- `LIVE_URL.txt` — deployed app URL

## Review accounts

Password for every account: `folio-demo`

- Khawer Ali — `khawer.ali@ajaia.test` — owns Product kickoff
- Alex Chen — `alex.chen@ajaia.test` — can edit Product kickoff, owns Hiring rubric
- Sam Okafor — `sam.okafor@ajaia.test` — can view Product kickoff, owns Interview notes

Local run:

```powershell
npm install
npm test
npm run dev
```

Open http://localhost:3000. **Enter as Khawer** is the fastest start. **Review as** in the account menu switches the real session.

## What works

- Create, rename, edit, autosave, and reopen a document
- Bold, italic, underline, headings 1–3, bulleted lists, numbered lists
- Formatting survives refresh
- Import `.txt` and `.md` (200 KB) into a new document, including `examples/kickoff.md`
- Download the supported formatting as Markdown
- Owner, editor, and viewer roles, enforced on the server
- Owned documents and shared documents are separate on the home screen
- Stale saves are rejected when someone else has saved a newer revision
- Seeded accounts, signed-in sessions, and a one-click reviewer switch
- Automated tests for the access rules, import, sanitizer, and seed data

## What is incomplete

- Live app: https://collab-docs-editor-three.vercel.app . Login and the seeded documents work. New documents may disappear after the Vercel instance shuts down, because storage is a local file. Local `npm run dev` keeps them in `data/folio.json`.
- No walkthrough video yet. `WALKTHROUGH_URL.txt` has the outline to record.
- No realtime co-editing. Two people can edit, and the second stale save is blocked instead of merged.
- No `.docx`, images, comments, or version history.

## Next 2–4 hours

1. Record the walkthrough. A later host with one Node process and a persistent disk would keep new documents across restarts.
2. Add a short version history from the existing revision counter.
3. Show who else has the document open, without building a collaborative merge.

## Live URL

https://collab-docs-editor-three.vercel.app

## Walkthrough

See `WALKTHROUGH_URL.txt`.
