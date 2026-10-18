"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "./Header";
import { api } from "@/lib/client";
import { importProblem } from "@/lib/files";
import type { DocumentSummary, PublicUser } from "@/lib/types";

function accessLabel(document: DocumentSummary) {
  if (document.role !== "owner") return `From ${document.owner.name}`;
  if (document.shareCount === 0) return "Only you";
  if (document.shareCount === 1) return "Shared with 1 person";
  return `Shared with ${document.shareCount} people`;
}

function DocumentRow({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      data-testid={`document-${document.id}`}
      className="flex items-center gap-4 rounded-2xl border border-line bg-sheet px-4 py-3 shadow-sm transition hover:border-pine-700"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine-50 font-display text-pine-800">
        {document.title.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{document.title}</span>
          {document.role === "edit" && (
            <span className="rounded-full bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-800">Can edit</span>
          )}
          {document.role === "view" && (
            <span className="rounded-full bg-[#f6e7dc] px-2.5 py-1 text-xs font-semibold text-clay">Can view</span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {accessLabel(document)}
          {" · "}
          <time dateTime={document.updatedAt} suppressHydrationWarning>
            {new Date(document.updatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </span>
      </span>
    </Link>
  );
}

export function DocumentHome({
  user,
  owned,
  shared,
}: {
  user: PublicUser;
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function createDocument() {
    setCreating(true);
    setError("");
    try {
      const payload = await api<{ document: { id: string } }>("/api/documents", { method: "POST" });
      router.push(`/documents/${payload.document.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the document.");
      setCreating(false);
    }
  }

  async function importFile(file: File) {
    const problem = importProblem(file.name, file.size);
    if (problem) {
      setError(problem);
      return;
    }
    setImporting(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const payload = await api<{ document: { id: string } }>("/api/documents/import", {
        method: "POST",
        body,
      });
      router.push(`/documents/${payload.document.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import that file.");
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main
        id="main"
        className={`mx-auto max-w-3xl px-4 py-8 ${dragging ? "outline outline-2 outline-offset-8 outline-pine-700" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const files = [...event.dataTransfer.files];
          if (files.length > 1) {
            setError("Import one file at a time.");
            return;
          }
          if (files[0]) void importFile(files[0]);
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Documents</h1>
            <p className="mt-2 max-w-xl text-muted">
              Create a draft, import a text file, or open something a teammate shared. Edits save automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <label className={`btn btn-secondary cursor-pointer ${importing ? "opacity-50" : ""}`}>
              {importing ? "Importing…" : "Import"}
              <input
                id="import-file"
                data-testid="import-file"
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="sr-only"
                disabled={importing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importFile(file);
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              data-testid="new-document"
              onClick={createDocument}
              disabled={creating}
            >
              {creating ? "Creating…" : "New document"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-[#efc7c7] bg-[#fff6f6] px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your documents</h2>
          <div className="mt-3 grid gap-3">
            {owned.length === 0 && <p className="text-muted">No documents yet. Create one, or import a .txt or .md file.</p>}
            {owned.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Shared with you</h2>
          <div className="mt-3 grid gap-3">
            {shared.length === 0 && <p className="text-muted">Nothing has been shared with you yet.</p>}
            {shared.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        </section>

        <p className="mt-8 text-sm text-muted">
          Import accepts .txt and .md files up to 200 KB. Word documents and other types are not supported. A sample
          file is at <span className="font-semibold">examples/kickoff.md</span>.
        </p>
      </main>
    </div>
  );
}
