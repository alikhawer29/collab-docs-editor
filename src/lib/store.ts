import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, normalizeEmail } from "./demo-accounts";
import { ConflictError, HttpError } from "./errors";
import { basename, importProblem, titleFromFilename } from "./files";
import { sanitizeDocumentHtml } from "./html";
import { markdownToHtml, textToHtml } from "./markdown";
import { NOTES_MARKDOWN, RUBRIC_MARKDOWN, WELCOME_EXTRA_HTML, WELCOME_MARKDOWN } from "./seed-content";
import { titleError, normalizeTitle } from "./title";
import type { DocumentDetail, DocumentRecord, Permission, PublicUser, Role, ShareGrant } from "./types";

/**
 * Single-process JSON store.
 * Each change clones the database, mutates the copy, then replaces the file.
 * A thrown error leaves the previous file in place. Do not point two server
 * processes at the same file.
 */

type UserRow = PublicUser & { passwordHash: string };

type DocumentRow = DocumentRecord & { ownerId: string };

type ShareRow = {
  documentId: string;
  userId: string;
  permission: Permission;
  createdAt: string;
};

type Database = {
  users: UserRow[];
  documents: DocumentRow[];
  shares: ShareRow[];
};

let cached: { path: string; data: Database } | null = null;

function databasePath() {
  return process.env.FOLIO_DATA_PATH || path.join(process.cwd(), "data", "folio.json");
}

export function resetStoreCache() {
  cached = null;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

const dummyPasswordHash = hashPassword("not-a-real-password");

function toPublic(user: UserRow): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

function requireTitle(title: string) {
  const message = titleError(title);
  if (message) throw new HttpError(message, 400);
  return normalizeTitle(title);
}

function seed(): Database {
  const now = new Date().toISOString();
  const users: UserRow[] = DEMO_ACCOUNTS.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    passwordHash: hashPassword(DEMO_PASSWORD),
  }));

  if (process.env.FOLIO_SKIP_DEMO === "1") {
    return { users, documents: [], shares: [] };
  }

  const documents: DocumentRow[] = [
    {
      id: "doc_welcome",
      ownerId: "user_khawer",
      title: "Product kickoff",
      content: sanitizeDocumentHtml(markdownToHtml(WELCOME_MARKDOWN) + WELCOME_EXTRA_HTML),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    },
    {
      id: "doc_rubric",
      ownerId: "user_alex",
      title: "Hiring rubric",
      content: sanitizeDocumentHtml(markdownToHtml(RUBRIC_MARKDOWN)),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    },
    {
      id: "doc_interviews",
      ownerId: "user_sam",
      title: "Interview notes",
      content: sanitizeDocumentHtml(markdownToHtml(NOTES_MARKDOWN)),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    },
  ];

  const shares: ShareRow[] = [
    { documentId: "doc_welcome", userId: "user_alex", permission: "edit", createdAt: now },
    { documentId: "doc_welcome", userId: "user_sam", permission: "view", createdAt: now },
    { documentId: "doc_rubric", userId: "user_khawer", permission: "edit", createdAt: now },
  ];

  return { users, documents, shares };
}

function persist(data: Database) {
  const destination = databasePath();
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporaryPath = `${destination}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  try {
    if (fs.existsSync(destination)) fs.rmSync(destination);
    fs.renameSync(temporaryPath, destination);
  } catch {
    fs.copyFileSync(temporaryPath, destination);
    fs.rmSync(temporaryPath, { force: true });
  }
  cached = { path: destination, data };
}

function load(): Database {
  const file = databasePath();
  if (cached?.path === file) return cached.data;
  if (!fs.existsSync(file)) {
    const fresh = seed();
    persist(fresh);
    return fresh;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error("Folio could not read its data file. Delete data/folio.json and start the app again.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Folio could not read its data file. Delete data/folio.json and start the app again.");
  }
  const candidate = parsed as Partial<Database>;
  if (!Array.isArray(candidate.users) || !Array.isArray(candidate.documents) || !Array.isArray(candidate.shares)) {
    throw new Error("Folio could not read its data file. Delete data/folio.json and start the app again.");
  }
  const data = candidate as Database;
  cached = { path: file, data };
  return data;
}

function read() {
  return structuredClone(load());
}

function commit<T>(mutator: (draft: Database) => T) {
  const draft = structuredClone(load());
  const result = mutator(draft);
  persist(draft);
  return result;
}

function mustUser(data: Database, userId: string) {
  const user = data.users.find((item) => item.id === userId);
  if (!user) throw new Error("Folio data is missing a user referenced by a document.");
  return user;
}

function access(data: Database, documentId: string, userId: string) {
  const document = data.documents.find((item) => item.id === documentId);
  if (!document) throw new HttpError("This document does not exist.", 404);
  if (document.ownerId === userId) return { document, role: "owner" as const };
  const share = data.shares.find((item) => item.documentId === documentId && item.userId === userId);
  if (!share) throw new HttpError("You do not have access to this document.", 403);
  return { document, role: share.permission };
}

function listShares(data: Database, documentId: string): ShareGrant[] {
  return data.shares
    .filter((share) => share.documentId === documentId)
    .flatMap((share) => {
      const user = data.users.find((item) => item.id === share.userId);
      if (!user) return [];
      return [{ user: toPublic(user), permission: share.permission }];
    })
    .sort((a, b) => a.user.name.localeCompare(b.user.name));
}

function toRecord(document: DocumentRow): DocumentRecord {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    revision: document.revision,
  };
}

function toDetail(data: Database, document: DocumentRow, role: Role): DocumentDetail {
  return {
    ...toRecord(document),
    role,
    owner: toPublic(mustUser(data, document.ownerId)),
    shares: listShares(data, document.id),
  };
}

function summarize(data: Database, document: DocumentRow, role: Role) {
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    role,
    owner: toPublic(mustUser(data, document.ownerId)),
    shareCount: data.shares.filter((share) => share.documentId === document.id).length,
  };
}

export function getUserById(userId: string): PublicUser | null {
  const user = read().users.find((item) => item.id === userId);
  return user ? toPublic(user) : null;
}

export function authenticate(email: string, password: string): PublicUser {
  const user = read().users.find((item) => item.email === normalizeEmail(email));
  const matches = user ? verifyPassword(password, user.passwordHash) : false;
  if (!user) verifyPassword(password, dummyPasswordHash);
  if (!user || !matches) {
    throw new HttpError("Those credentials don't match a Folio account.", 401);
  }
  return toPublic(user);
}

export function listDocuments(userId: string) {
  const data = read();
  if (!data.users.some((user) => user.id === userId)) {
    throw new HttpError("Sign in to continue.", 401);
  }
  const byRecent = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt);
  const owned = data.documents
    .filter((document) => document.ownerId === userId)
    .map((document) => summarize(data, document, "owner"))
    .sort(byRecent);
  const shared = data.shares
    .filter((share) => share.userId === userId)
    .flatMap((share) => {
      const document = data.documents.find((item) => item.id === share.documentId);
      if (!document || document.ownerId === userId) return [];
      return [summarize(data, document, share.permission)];
    })
    .sort(byRecent);
  return { owned, shared };
}

export function getDocument(userId: string, documentId: string) {
  const data = read();
  const { document, role } = access(data, documentId, userId);
  return toDetail(data, document, role);
}

export function createDocument(userId: string, input?: { title?: string; content?: string }) {
  return commit((data) => {
    if (!data.users.some((user) => user.id === userId)) {
      throw new HttpError("Sign in to continue.", 401);
    }
    const now = new Date().toISOString();
    const document: DocumentRow = {
      id: crypto.randomUUID(),
      ownerId: userId,
      title: input?.title === undefined ? "Untitled document" : requireTitle(input.title),
      content: sanitizeDocumentHtml(input?.content ?? "<p></p>"),
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    data.documents.push(document);
    return toRecord(document);
  });
}

export function updateDocument(
  userId: string,
  documentId: string,
  patch: { title?: string; content?: string; revision: number },
) {
  return commit((data) => {
    const { document, role } = access(data, documentId, userId);
    if (role === "view") {
      throw new HttpError("You have view access, so this document is read-only.", 403);
    }
    if (document.revision !== patch.revision) {
      throw new ConflictError(toRecord(document));
    }
    if (patch.title !== undefined) document.title = requireTitle(patch.title);
    if (patch.content !== undefined) {
      if (patch.content.length > 400_000) {
        throw new HttpError("This document is too large to save.", 400);
      }
      document.content = sanitizeDocumentHtml(patch.content);
    }
    document.revision += 1;
    document.updatedAt = new Date().toISOString();
    return toRecord(document);
  });
}

export function deleteDocument(userId: string, documentId: string) {
  commit((data) => {
    const { role } = access(data, documentId, userId);
    if (role !== "owner") throw new HttpError("Only the owner can delete this document.", 403);
    data.documents = data.documents.filter((document) => document.id !== documentId);
    data.shares = data.shares.filter((share) => share.documentId !== documentId);
  });
}

export function grantAccess(userId: string, documentId: string, email: string, permission: Permission) {
  return commit((data) => {
    const { document, role } = access(data, documentId, userId);
    if (role !== "owner") throw new HttpError("Only the owner can change who has access.", 403);
    const target = data.users.find((user) => user.email === normalizeEmail(email));
    if (!target) {
      throw new HttpError("No Folio account uses that email. This demo shares only with existing users.", 400);
    }
    if (target.id === document.ownerId) throw new HttpError("You already own this document.", 400);
    const existing = data.shares.find((share) => share.documentId === documentId && share.userId === target.id);
    if (existing) existing.permission = permission;
    else {
      data.shares.push({
        documentId,
        userId: target.id,
        permission,
        createdAt: new Date().toISOString(),
      });
    }
    return listShares(data, documentId);
  });
}

export function revokeAccess(userId: string, documentId: string, targetUserId: string) {
  return commit((data) => {
    const { document, role } = access(data, documentId, userId);
    if (role !== "owner") throw new HttpError("Only the owner can change who has access.", 403);
    if (targetUserId === document.ownerId) throw new HttpError("The owner always keeps access.", 400);
    const hadAccess = data.shares.some((share) => share.documentId === documentId && share.userId === targetUserId);
    if (!hadAccess) throw new HttpError("That person does not have access.", 404);
    data.shares = data.shares.filter((share) => !(share.documentId === documentId && share.userId === targetUserId));
    return listShares(data, documentId);
  });
}

export function importDocument(userId: string, filename: string, bytes: Buffer) {
  const problem = importProblem(filename, bytes.length);
  if (problem) throw new HttpError(problem, 400);
  const text = bytes.toString("utf8");
  if (text.includes("\0")) throw new HttpError("That file does not look like plain text.", 400);
  if (!text.trim()) throw new HttpError("That file is empty.", 400);
  const html = basename(filename).toLowerCase().endsWith(".md") ? markdownToHtml(text) : textToHtml(text);
  return createDocument(userId, { title: titleFromFilename(filename), content: html });
}
