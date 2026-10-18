"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";
import { UserMenu } from "./UserMenu";
import { Mark } from "./Mark";
import { ApiError, api } from "@/lib/client";
import { htmlToMarkdown } from "@/lib/markdown";
import { filenameFromTitle, normalizeTitle, titleError } from "@/lib/title";
import type { DocumentDetail, PublicUser, ShareGrant } from "@/lib/types";

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    strike: false,
    code: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Underline,
  Placeholder.configure({
    placeholder: "Start writing. Formatting stays with the document.",
  }),
];

type SaveState = "saved" | "saving" | "unsaved" | "conflict" | "error";

type SaveResponse = {
  document: { id: string; title: string; revision: number; updatedAt: string };
};

const statusText: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved",
  conflict: "Out of date",
  error: "Not saved",
};

export function DocumentEditor({ document, currentUser }: { document: DocumentDetail; currentUser: PublicUser }) {
  const role = document.role;
  const [title, setTitle] = useState(document.title);
  const [titleMessage, setTitleMessage] = useState("");
  const [shares, setShares] = useState<ShareGrant[]>(document.shares);
  const [status, setStatus] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [conflicted, setConflicted] = useState(false);
  const [savedAt, setSavedAt] = useState(document.updatedAt);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tick, setTick] = useState(0);

  const latest = useRef({ title: document.title, html: document.content });
  const saved = useRef({ title: document.title, content: document.content });
  const revisionRef = useRef(document.revision);
  const ready = useRef(false);
  const conflictRef = useRef(false);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const statusRef = useRef<SaveState>("saved");
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions,
    content: document.content,
    immediatelyRender: false,
    editable: role !== "view",
    editorProps: {
      attributes: {
        class: "folio-editor",
        "aria-label": "Document body",
        "data-testid": "editor",
      },
    },
    onCreate: ({ editor: created }) => {
      const html = created.getHTML();
      saved.current = { ...saved.current, content: html };
      latest.current = { title: saved.current.title, html };
      ready.current = true;
    },
    onUpdate: ({ editor: current }) => {
      setTick((value) => value + 1);
      schedule(latest.current.title, current.getHTML());
    },
    onSelectionUpdate: () => setTick((value) => value + 1),
  });

  editorRef.current = editor;
  statusRef.current = status;

  function setIfMounted(update: () => void) {
    if (mounted.current) update();
  }

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (role === "view" || conflictRef.current) return;
    const snapshot = latest.current;
    const problem = titleError(snapshot.title);
    const body: { revision: number; title?: string; content?: string } = { revision: revisionRef.current };
    if (!problem && normalizeTitle(snapshot.title) !== normalizeTitle(saved.current.title)) {
      body.title = normalizeTitle(snapshot.title);
    }
    if (snapshot.html !== saved.current.content) body.content = snapshot.html;
    if (!body.title && !body.content) {
      setIfMounted(() => setStatus(conflictRef.current ? "conflict" : "saved"));
      return;
    }
    if (inFlight.current) {
      queued.current = true;
      return;
    }

    inFlight.current = true;
    setIfMounted(() => {
      setStatus("saving");
      setSaveError("");
    });
    try {
      const result = await api<SaveResponse>(`/api/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        keepalive: true,
      });
      revisionRef.current = result.document.revision;
      saved.current = {
        title: result.document.title,
        content: body.content ?? saved.current.content,
      };
      setIfMounted(() => {
        if (normalizeTitle(latest.current.title) === normalizeTitle(result.document.title)) {
          setTitle(result.document.title);
        }
        setSavedAt(result.document.updatedAt);
        setStatus("saved");
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        conflictRef.current = true;
        editorRef.current?.setEditable(false);
        setIfMounted(() => {
          setConflicted(true);
          setStatus("conflict");
          setSaveError(
            "A newer version is saved. Reload before editing so you do not overwrite it. Reloading discards the unsaved changes on this screen.",
          );
        });
        return;
      }
      setIfMounted(() => {
        setStatus("error");
        setSaveError(error instanceof Error ? error.message : "Could not save this document.");
      });
    } finally {
      inFlight.current = false;
      if (queued.current && !conflictRef.current) {
        queued.current = false;
        void flushRef.current();
      }
    }
  }

  function schedule(titleValue: string, html: string) {
    latest.current = { title: titleValue, html };
    if (!ready.current || role === "view" || conflictRef.current) return;
    const titleChanged = !titleError(titleValue) && normalizeTitle(titleValue) !== normalizeTitle(saved.current.title);
    const contentChanged = html !== saved.current.content;
    if (!titleChanged && !contentChanged) {
      if (timer.current) clearTimeout(timer.current);
      if (!inFlight.current) setIfMounted(() => setStatus("saved"));
      return;
    }
    setIfMounted(() => setStatus("unsaved"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), 700);
  }

  flushRef.current = flush;

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (statusRef.current === "unsaved" || queued.current) void flushRef.current();
    };
  }, []);

  useEffect(() => {
    editor?.setEditable(role !== "view" && !conflicted);
  }, [editor, role, conflicted]);

  useEffect(() => {
    if (document.title !== "Untitled document") return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [document.title]);

  useEffect(() => {
    document.title = `${normalizeTitle(title) || "Untitled"} · Folio`;
  }, [title]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (status === "unsaved" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  const words = (() => {
    const text = editor?.getText().trim() ?? "";
    if (!text) return 0;
    return text.split(/\s+/).length;
  })();
  void tick;

  function download() {
    const html = editor?.getHTML() ?? latest.current.html;
    const blob = new Blob([htmlToMarkdown(html)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filenameFromTitle(title);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function removeDocument() {
    setDeleting(true);
    try {
      if (timer.current) clearTimeout(timer.current);
      await api(`/api/documents/${document.id}`, { method: "DELETE" });
      window.location.href = "/documents";
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not delete this document.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const readOnly = role === "view" || conflicted;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/documents" className="flex shrink-0 items-center gap-2 font-display text-xl" onClick={() => void flush()}>
            <Mark />
            <span className="sr-only">Back to documents</span>
            <span aria-hidden="true">Folio</span>
          </Link>
          <div className="min-w-[12rem] flex-1 border-l border-line pl-3">
            <label htmlFor="document-title" className="sr-only">
              Document title
            </label>
            <input
              id="document-title"
              ref={titleRef}
              data-testid="document-title"
              value={title}
              readOnly={role === "view"}
              maxLength={140}
              className="w-full bg-transparent font-display text-2xl outline-none read-only:cursor-default"
              onChange={(event) => {
                const value = event.target.value;
                setTitle(value);
                setTitleMessage(titleError(value) ?? "");
                schedule(value, editor?.getHTML() ?? latest.current.html);
              }}
              onBlur={() => void flush()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  editor?.commands.focus();
                }
              }}
            />
          </div>
          <p className="text-sm text-muted" data-testid="save-status" aria-live="polite">
            {statusText[status]}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={download}
            title="Downloads headings, lists, bold, and italic. Underline becomes plain text."
          >
            Download .md
          </button>
          <button type="button" className="btn btn-secondary" data-testid="share-open" onClick={() => setShareOpen(true)}>
            {role === "owner" ? "Share" : "Access"}
          </button>
          {role === "owner" && !confirmDelete && (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          {role === "owner" && confirmDelete && (
            <>
              <button type="button" className="btn btn-danger" onClick={() => void removeDocument()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete document"}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </>
          )}
          <UserMenu user={currentUser} />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        <p className="mb-4 text-sm text-muted">
          {role === "owner" && "You own this document."}
          {role === "edit" && `Shared by ${document.owner.name}. You can edit. Only the owner can change access.`}
          {role === "view" && `Shared by ${document.owner.name}. You can read it. Ask ${document.owner.name} for edit access.`}
          {" · "}
          <time dateTime={savedAt} suppressHydrationWarning>
            Updated{" "}
            {new Date(savedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </p>

        {(saveError || titleMessage) && (
          <div className="mb-4 rounded-2xl border border-[#efc7c7] bg-[#fff6f6] px-4 py-3 text-sm text-danger" role="alert">
            <p>{titleMessage || saveError}</p>
            {conflicted && (
              <button type="button" className="btn btn-primary mt-3" data-testid="reload-latest" onClick={() => window.location.reload()}>
                Reload latest
              </button>
            )}
          </div>
        )}

        <article className="overflow-hidden rounded-2xl border border-line bg-sheet shadow-sheet">
          {role !== "view" && editor && <Toolbar editor={editor} disabled={readOnly} />}
          {role !== "view" && (
            <p className="px-6 pt-4 text-xs text-muted md:px-12">Ctrl or Cmd + B, I, U, and Z. Headings and lists are in the bar above.</p>
          )}
          <div className="px-6 py-6 md:px-12 md:py-10">
            {editor ? <EditorContent editor={editor} /> : <div className="folio-editor text-muted">Opening the editor…</div>}
          </div>
          <footer className="flex justify-between border-t border-line px-6 py-3 text-xs text-muted md:px-12">
            <span>{words === 1 ? "1 word" : `${words} words`}</span>
            <span>{role === "owner" ? "Owner" : role === "edit" ? "Can edit" : "Can view"}</span>
          </footer>
        </article>
      </main>

      <ShareDialog
        open={shareOpen}
        documentId={document.id}
        owner={document.owner}
        role={role}
        shares={shares}
        onClose={() => setShareOpen(false)}
        onShares={setShares}
      />
    </div>
  );
}
