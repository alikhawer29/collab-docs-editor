"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { api } from "@/lib/client";
import type { Permission, PublicUser, Role, ShareGrant } from "@/lib/types";

export function ShareDialog({
  open,
  documentId,
  owner,
  role,
  shares,
  onClose,
  onShares,
}: {
  open: boolean;
  documentId: string;
  owner: PublicUser;
  role: Role;
  shares: ShareGrant[];
  onClose: () => void;
  onShares: (shares: ShareGrant[]) => void;
}) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("edit");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const canManage = role === "owner";

  useEffect(() => {
    if (!open) return;
    if (canManage) emailRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canManage, onClose]);

  if (!open) return null;

  const suggestions = DEMO_ACCOUNTS.filter(
    (account) => account.id !== owner.id && !shares.some((share) => share.user.id === account.id),
  );

  async function saveAccess(nextEmail: string, nextPermission: Permission) {
    setPending(true);
    setMessage("");
    try {
      const result = await api<{ shares: ShareGrant[] }>(`/api/documents/${documentId}/share`, {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, permission: nextPermission }),
      });
      onShares(result.shares);
      setEmail("");
      setMessage("Access updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update access.");
    } finally {
      setPending(false);
    }
  }

  async function removeAccess(userId: string) {
    setPending(true);
    setMessage("");
    try {
      const result = await api<{ shares: ShareGrant[] }>(`/api/documents/${documentId}/share/${userId}`, {
        method: "DELETE",
      });
      onShares(result.shares);
      setMessage("Access removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove access.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink/30 px-4 py-12" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-line bg-sheet p-5 shadow-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="share-title" className="font-display text-3xl">
              {canManage ? "Share" : "Access"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {canManage
                ? "Owners choose who can edit and who can only read."
                : "Only the owner can change this list."}
            </p>
          </div>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </div>

        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          <li className="flex items-center justify-between gap-3 px-3 py-3">
            <span>
              <span className="block font-semibold">{owner.name}</span>
              <span className="block text-sm text-muted">{owner.email}</span>
            </span>
            <span className="text-sm font-semibold text-pine-800">Owner</span>
          </li>
          {shares.map((share) => (
            <li key={share.user.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{share.user.name}</span>
                <span className="block truncate text-sm text-muted">{share.user.email}</span>
              </span>
              {canManage ? (
                <span className="flex items-center gap-2">
                  <select
                    aria-label={`Access for ${share.user.name}`}
                    className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
                    value={share.permission}
                    disabled={pending}
                    onChange={(event) => void saveAccess(share.user.email, event.target.value as Permission)}
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                  </select>
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger"
                    disabled={pending}
                    onClick={() => void removeAccess(share.user.id)}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <span className="text-sm font-semibold">{share.permission === "edit" ? "Can edit" : "Can view"}</span>
              )}
            </li>
          ))}
          {shares.length === 0 && <li className="px-3 py-3 text-sm text-muted">Only the owner can see this document.</li>}
        </ul>

        {canManage && (
          <>
            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="btn btn-secondary"
                    disabled={pending}
                    onClick={() => void saveAccess(account.email, "edit")}
                  >
                    Give {account.name.split(" ")[0]} edit access
                  </button>
                ))}
              </div>
            )}
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void saveAccess(email, permission);
              }}
            >
              <div>
                <label htmlFor="share-email" className="mb-1 block text-sm font-semibold">
                  Email
                </label>
                <input
                  id="share-email"
                  ref={emailRef}
                  data-testid="share-email"
                  className="field"
                  placeholder="alex.chen@ajaia.test"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="share-permission" className="text-sm font-semibold">
                  Access
                </label>
                <select
                  id="share-permission"
                  data-testid="share-permission"
                  className="rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  value={permission}
                  onChange={(event) => setPermission(event.target.value as Permission)}
                >
                  <option value="edit">Can edit</option>
                  <option value="view">Can view</option>
                </select>
                <button type="submit" className="btn btn-primary" data-testid="share-submit" disabled={pending || !email.trim()}>
                  {pending ? "Saving…" : "Share"}
                </button>
              </div>
            </form>
          </>
        )}

        {message && (
          <p className="mt-3 text-sm" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
