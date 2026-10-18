# Architecture

Folio is one Next.js app. The browser edits rich text. Server routes check the session, the document role, and the HTML before anything is written. Documents, users, and shares live in a JSON file.

## What I optimized for

A reviewer should be able to create a document, format it, refresh, import a file, and see a second person get edit or view access. That path is more important than covering more of Google Docs.

I chose a file store instead of a hosted database so the project runs with `npm install` and no account. The cost is real: one Node process owns the file. A second instance would race. That is an acceptable cut for this timebox, and it is a bad cut for a multi-server deployment.

TipTap supplies bold, italic, underline, headings, and lists. I did not build an editor. I did disable the extra StarterKit marks (code, strike, quote, rules) so the saved HTML matches the controls on screen.

## Data

`data/folio.json` holds three collections:

- `users` — id, name, email, scrypt password hash
- `documents` — title, HTML content, owner, timestamps, integer `revision`
- `shares` — document id, user id, `edit` or `view`

The seeded accounts are public demo credentials. Passwords are still hashed, and API responses only return id, name, and email.

Writes clone the in-memory database, mutate the copy, and replace the file. If validation throws, the previous file stays. On Windows, replacing a file can fail with a permission error, so the write falls back to a copy.

## Access

| Role | Read | Edit and rename | Share, revoke, delete |
| --- | --- | --- | --- |
| Owner | Yes | Yes | Yes |
| Editor | Yes | Yes | No |
| Viewer | Yes | No | No |
| No share | No | No | No |

Missing documents return 404. A real document id with no share returns 403. That tells a caller the id exists. These ids are random, and this is an internal tool, so I kept the clearer message.

Sharing accepts an email of an existing Folio user and can change `edit` to `view` later. There is no public link and no invite email. The account menu's **Review as** action calls the same login route as the form. It is a real session swap, which is why a private window also works.

Sessions are HMAC-signed cookies, `HttpOnly` and `SameSite=Lax`, for seven days. Production refuses to sign a cookie until `SESSION_SECRET` is set. The cookie is marked `Secure` only when `COOKIE_SECURE=true`, so `npm start` on local HTTP still works.

## Editing

The editor loads HTML and autosaves about 700ms after a change. Each save sends the `revision` it started from. If the stored revision is newer, the server returns 409 and does not write. The screen then asks for a reload and says that reload discards the local unsaved text.

I rejected silent last-write-wins. Two people can still lose keystrokes, but only after a visible warning. Sharing changes do not bump `revision`, so updating access does not look like a content conflict.

Saved HTML passes an allowlist: paragraphs, line breaks, bold, italic, underline, headings 1–3, and lists. Scripts and event-handler attributes are removed. This is the storage format on purpose. It is readable in `folio.json` and it matches the importer.

## Import and export

`.txt` and `.md` only, up to 200 KB. The extension decides the parser. I do not trust the browser MIME type, because Windows often sends `.md` as `application/octet-stream`.

The markdown parser is a small subset: headings, paragraphs, bold, italic, and the two list types. That is enough for the sample file and small enough to test. `.docx` would need another converter and a second pass over messy HTML, so I left it out.

**Download .md** maps the same subset back out. Underline has no markdown equivalent here, so it exports as plain text.

## What I left out

- Realtime presence, cursors, and CRDT merging
- Comments and suggestions
- Version history
- Images, tables, and font colors
- Public links and email invites
- Accounts beyond the three seeded users

## What I would do with another 2–4 hours

1. Keep a short snapshot history from the revision counter, with a restore action for the owner.
2. Show "Alex has this open" with a heartbeat. Still no collaborative merge.
3. Deploy one instance with `FOLIO_DATA_PATH` on a persistent disk and run the review script against that URL.
4. Add `.docx` only if a reviewer still needs it, and send the converted HTML through the same allowlist.

## Tests

`npm test` covers the rules I most wanted pinned down: login, tampered sessions, owned versus shared lists, editor versus viewer, owner-only delete and share, stale revisions, HTML sanitizing, markdown import, and the seeded workspace. The editing screen is checked in a browser after that.
