# AI workflow

I used Cursor's coding agent (Grok) as a pair on this take-home. I kept the product decisions and checked the parts that are easy for an agent to get subtly wrong.

## Tools

- Cursor agent, for the app structure, editor wiring, sharing rules, tests, and these notes
- The project test runner and a browser pass against `npm run dev`, for correctness

I did not use a hosted database, a design generator, or an agent that deployed the app on its own.

## Where it sped the work up

The agent was useful for the boilerplate that is tedious and low-risk once the shape is fixed: Next.js route files, the TipTap toolbar, the seeded workspace, and the first draft of the JSON store. That left time to be specific about scope.

The useful prompt was not "build Google Docs." It was the cut: three users, owner / editor / viewer, `.txt` and `.md` only, revision checks instead of realtime, and a file store so a reviewer needs no paid service.

## What I changed or rejected

- Rejected a hosted Postgres or Supabase setup. It is a better long-term store and a worse review setup, because it adds an account and a bill.
- Rejected SQLite native bindings. They are a common Windows install failure, and this machine needed to run the tests on the first pass.
- Rejected `.docx` import. The agent can wire a converter quickly. The result is still an unreviewed HTML pipeline, so the UI says the type is unsupported.
- Rejected silent last-write-wins. The first simple autosave would have let the second saver overwrite the first with no warning.
- Rejected treating **Review as** as a fake client-side role. It calls the login route and replaces the cookie. The server still checks the role on every save and share.
- Narrowed the editor schema. StarterKit also offers code, strike, quotes, and rules. Those controls were not in the brief, and leaving them on would let people create formatting the sanitizer then deletes.
- Kept the markdown parser small and tested, instead of adding a general markdown package and trusting its HTML.

## How I checked the work

- `npm test` — 12 tests for login, tampered sessions, owned versus shared lists, editor versus viewer, owner-only delete and share, stale revisions, HTML sanitizing, markdown import, and the seeded workspace
- `npm run build` — production build. The first build failed because TypeScript treated values assigned inside the save callback as unset, and because the production secret check ran during static prerender. Both are fixed: saves return their result directly, and the secret is required when the server handles a request, not while Next is compiling.
- Browser pass on the running app: sign in as Khawer, confirm owned and shared lists, open Product kickoff and see headings, lists, bold, italic, and underline. Sign in as Sam and confirm that document is read-only, with no formatting bar. Open Share as an owner and grant access. A real edit autosaves and keeps the document structure after the server write.
- HTTP checks against the running app: importing `examples/kickoff.md` keeps the heading, bold, and numbered list; a viewer save returns 403; a stale revision returns 409 and does not overwrite the saved draft.

A narrow window showed the access badge sitting on the date line, so the badge now sits next to the title.

## What is still mine to finish before the portal submission

- Record the 3–5 minute walkthrough and put the public URL in `WALKTHROUGH_URL.txt`
- Deploy one long-lived Node process and put that URL in `LIVE_URL.txt`
- Re-read these notes after that deploy and delete anything that is no longer true
