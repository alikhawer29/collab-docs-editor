"use client";

import { useState } from "react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { api } from "@/lib/client";
import { Mark } from "./Mark";

export function LoginScreen({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function signIn(nextEmail: string, nextPassword: string, key: string) {
    setPending(key);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      window.location.href = nextPath;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setPending(null);
    }
  }

  return (
    <main id="main" className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <section className="hidden md:block">
        <div className="mb-6 flex items-center gap-2 font-display text-2xl">
          <Mark />
          Folio
        </div>
        <h1 className="max-w-md font-display text-5xl leading-tight">Shared drafts for a small team.</h1>
        <p className="mt-4 max-w-md text-lg text-muted">
          Write with headings, lists, and basic emphasis. Hand a document to an editor or a viewer, then come back to it
          after a refresh.
        </p>
        <article className="mt-8 max-w-md rounded-2xl border border-line bg-sheet p-8 shadow-sheet">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">A Folio document</p>
          <h2 className="mt-3 font-display text-3xl">Product kickoff</h2>
          <p className="mt-4 font-serif text-lg leading-relaxed">
            A shared draft, with <strong>formatting</strong> that is still there after you reload.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 font-serif text-lg">
            <li>Owned and shared documents stay apart</li>
            <li>Viewers can read without changing the draft</li>
          </ul>
        </article>
      </section>

      <section className="mx-auto w-full max-w-md rounded-3xl border border-line bg-sheet p-6 shadow-sheet md:p-8">
        <div className="mb-6 flex items-center gap-2 font-display text-2xl md:hidden">
          <Mark />
          Folio
        </div>
        <h2 className="font-display text-3xl">Sign in</h2>
        <p className="mt-2 text-sm text-muted">Three seeded accounts share one password so a reviewer can try sharing.</p>

        <div className="mt-5 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              data-testid={`enter-${account.id}`}
              className="rounded-2xl border border-line px-3 py-3 text-left hover:border-pine-700 disabled:opacity-50"
              disabled={pending !== null}
              onClick={() => {
                setEmail(account.email);
                void signIn(account.email, DEMO_PASSWORD, account.id);
              }}
            >
              <span className="block font-semibold">
                {pending === account.id ? "Signing in…" : `Enter as ${account.name}`}
              </span>
              <span className="block text-sm text-muted">{account.email}</span>
            </button>
          ))}
        </div>

        <form
          className="mt-6 grid gap-3 border-t border-line pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(email, password, "form");
          }}
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              data-testid="login-email"
              className="field"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              data-testid="login-password"
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted">Password for every seeded account: {DEMO_PASSWORD}</p>
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" data-testid="login-submit" disabled={pending !== null}>
            {pending === "form" ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
