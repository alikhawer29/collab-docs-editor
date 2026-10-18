"use client";

import { useState } from "react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { api } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

export function UserMenu({ user }: { user: PublicUser }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function reviewAs(email: string) {
    setPending(email);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: DEMO_PASSWORD }),
      });
      window.location.href = "/documents";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not switch accounts.");
      setPending(null);
    }
  }

  async function signOut() {
    setPending("signout");
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-full border border-line bg-sheet px-3 py-1.5 text-sm font-semibold">
        {user.name}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-sheet p-3 shadow-sheet">
        <p className="px-2 text-sm font-semibold">{user.name}</p>
        <p className="px-2 pb-2 text-xs text-muted">{user.email}</p>
        <div className="border-t border-line pt-2">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Review as</p>
          {DEMO_ACCOUNTS.filter((account) => account.id !== user.id).map((account) => (
            <button
              key={account.id}
              type="button"
              className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-paper disabled:opacity-50"
              onClick={() => reviewAs(account.email)}
              disabled={pending !== null}
            >
              {pending === account.email ? "Switching…" : account.name}
            </button>
          ))}
        </div>
        {error && (
          <p className="px-2 pt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold hover:bg-paper"
          onClick={signOut}
          disabled={pending !== null}
        >
          Sign out
        </button>
      </div>
    </details>
  );
}
