import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";
import { HttpError } from "@/lib/errors";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown";
import { createSessionToken, readSessionToken } from "@/lib/session";
import {
  authenticate,
  createDocument,
  deleteDocument,
  getDocument,
  grantAccess,
  importDocument,
  listDocuments,
  resetStoreCache,
  revokeAccess,
  updateDocument,
} from "@/lib/store";

let directory = "";

function expectStatus(run: () => unknown, status: number) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
    return;
  }
  throw new Error(`Expected status ${status}`);
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "folio-"));
  process.env.FOLIO_DATA_PATH = path.join(directory, "folio.json");
  process.env.FOLIO_SKIP_DEMO = "1";
  process.env.SESSION_SECRET = "test-secret";
  process.env.NODE_ENV = "test";
  resetStoreCache();
});

afterEach(() => {
  resetStoreCache();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("accounts and sessions", () => {
  it("accepts seeded accounts and rejects unknown credentials", () => {
    const user = authenticate("  Khawer.Ali@ajaia.test ", DEMO_PASSWORD);
    expect(user.name).toBe("Khawer Ali");
    expect(JSON.stringify(user)).not.toContain("passwordHash");
    expectStatus(() => authenticate("khawer.ali@ajaia.test", "wrong-password"), 401);
    expectStatus(() => authenticate("nobody@ajaia.test", DEMO_PASSWORD), 401);
  });

  it("rejects tampered and expired session tokens", () => {
    const user = authenticate("alex.chen@ajaia.test", DEMO_PASSWORD);
    const token = createSessionToken(user.id);
    expect(readSessionToken(token)).toBe(user.id);

    const [body, signature] = token.split(".");
    const flipped = signature.slice(0, -1) + (signature.endsWith("a") ? "b" : "a");
    expect(readSessionToken(`${body}.${flipped}`)).toBeNull();
    expect(readSessionToken(createSessionToken(user.id, Date.now() - 8 * 24 * 60 * 60 * 1000))).toBeNull();

    process.env.SESSION_SECRET = "a-different-secret";
    expect(readSessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = "test-secret";
  });

  it("refuses to sign sessions in production without a secret", () => {
    delete process.env.SESSION_SECRET;
    process.env.NODE_ENV = "production";
    expect(() => createSessionToken("user_khawer")).toThrow(/SESSION_SECRET/);
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "test-secret";
  });
});

describe("ownership and sharing", () => {
  it("separates owned documents from documents shared with you", () => {
    const owner = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const editor = authenticate("alex.chen@ajaia.test", DEMO_PASSWORD);
    const document = createDocument(owner.id, { title: "Launch brief", content: "<p>Hello</p>" });
    grantAccess(owner.id, document.id, editor.email, "edit");

    const ownerLists = listDocuments(owner.id);
    const editorLists = listDocuments(editor.id);

    expect(ownerLists.owned.map((item) => item.id)).toContain(document.id);
    expect(ownerLists.shared.map((item) => item.id)).not.toContain(document.id);
    expect(ownerLists.owned.find((item) => item.id === document.id)?.shareCount).toBe(1);
    expect(editorLists.shared.map((item) => item.title)).toContain("Launch brief");
    expect(editorLists.owned.map((item) => item.id)).not.toContain(document.id);
    expect(editorLists.shared[0]?.role).toBe("edit");
    expect(ownerLists.owned[0]).not.toHaveProperty("content");
    expect(JSON.stringify(ownerLists)).not.toContain("passwordHash");
  });

  it("lets editors change a draft and keeps viewers read-only", () => {
    const owner = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const editor = authenticate("alex.chen@ajaia.test", DEMO_PASSWORD);
    const viewer = authenticate("sam.okafor@ajaia.test", DEMO_PASSWORD);
    const document = createDocument(owner.id, { title: "Brief", content: "<p>Start</p>" });

    grantAccess(owner.id, document.id, editor.email, "edit");
    grantAccess(owner.id, document.id, viewer.email, "view");

    const renamed = updateDocument(editor.id, document.id, { title: "  Renamed   brief ", revision: document.revision });
    expect(renamed.title).toBe("Renamed brief");
    expect(renamed.revision).toBe(2);

    expectStatus(
      () => updateDocument(viewer.id, document.id, { content: "<p>Viewer edit</p>", revision: renamed.revision }),
      403,
    );
    expectStatus(() => deleteDocument(editor.id, document.id), 403);
    expectStatus(() => grantAccess(editor.id, document.id, viewer.email, "edit"), 403);

    const shares = grantAccess(owner.id, document.id, viewer.email, "edit");
    expect(shares.find((share) => share.user.email === viewer.email)?.permission).toBe("edit");
    const editable = getDocument(viewer.id, document.id);
    const changed = updateDocument(viewer.id, document.id, { content: "<p>Now editing</p>", revision: editable.revision });
    expect(changed.content).toContain("Now editing");

    grantAccess(owner.id, document.id, viewer.email, "view");
    expectStatus(
      () => updateDocument(viewer.id, document.id, { content: "<p>Blocked</p>", revision: changed.revision }),
      403,
    );

    revokeAccess(owner.id, document.id, viewer.id);
    expectStatus(() => getDocument(viewer.id, document.id), 403);
    deleteDocument(owner.id, document.id);
    expectStatus(() => getDocument(owner.id, document.id), 404);
  });

  it("rejects sharing with an unknown person or with yourself", () => {
    const owner = authenticate("sam.okafor@ajaia.test", DEMO_PASSWORD);
    const document = createDocument(owner.id, { title: "Private notes" });
    expectStatus(() => grantAccess(owner.id, document.id, "nobody@ajaia.test", "view"), 400);
    expectStatus(() => grantAccess(owner.id, document.id, owner.email, "edit"), 400);
    expectStatus(() => updateDocument(owner.id, document.id, { title: "   ", revision: document.revision }), 400);
    expect(getDocument(owner.id, document.id).revision).toBe(1);
  });

  it("keeps the saved draft when a stale revision is written", () => {
    const owner = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const document = createDocument(owner.id, { title: "Draft", content: "<p>One</p>" });
    const saved = updateDocument(owner.id, document.id, { content: "<p>Two</p>", revision: document.revision });
    expectStatus(
      () => updateDocument(owner.id, document.id, { content: "<p>Three</p>", revision: document.revision }),
      409,
    );
    const current = getDocument(owner.id, document.id);
    expect(current.content).toContain("Two");
    expect(current.content).not.toContain("Three");
    expect(current.revision).toBe(saved.revision);
  });

  it("strips scripts and event handlers from saved content", () => {
    const owner = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const document = createDocument(owner.id, { title: "Notes", content: "<p>Hi</p>" });
    const saved = updateDocument(owner.id, document.id, {
      content: '<p onclick="alert(1)">Hi</p><script>alert(1)</script>',
      revision: document.revision,
    });
    expect(saved.content.toLowerCase()).not.toContain("<script");
    expect(saved.content).not.toContain("onclick");
    expect(saved.content).toContain("Hi");
  });
});

describe("import and markdown", () => {
  it("turns markdown into an owned editable document", () => {
    const owner = authenticate("alex.chen@ajaia.test", DEMO_PASSWORD);
    const source = "# Hello\n\nA **bold** and *italic* line\n\n- One\n- Two\n\n1. First\n";
    const document = importDocument(owner.id, "C:\\docs\\Quarterly Brief.md", Buffer.from(source));
    expect(document.title).toBe("Quarterly Brief");
    expect(document.content).toContain("<h1>Hello</h1>");
    expect(document.content).toContain("<strong>bold</strong>");
    expect(document.content).toContain("<em>italic</em>");
    expect(document.content).toContain("<ul>");
    expect(document.content).toContain("<ol>");
    expect(listDocuments(owner.id).owned.map((item) => item.id)).toContain(document.id);

    const exported = htmlToMarkdown(document.content);
    expect(exported).toContain("# Hello");
    expect(exported).toContain("**bold**");
    expect(exported).toContain("- One");
    expect(exported).toContain("1. First");
  });

  it("escapes plain text and rejects unsupported files", () => {
    const owner = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const document = importDocument(
      owner.id,
      "plain.TXT",
      Buffer.from("Hello <script>alert(1)</script>\n\nNext paragraph"),
    );
    expect(document.title).toBe("plain");
    expect(document.content.toLowerCase()).not.toContain("<script");
    expect(document.content).toContain("alert(1)");
    expect(document.content).toContain("&lt;");
    expectStatus(() => importDocument(owner.id, "slides.pptx", Buffer.from("nope")), 400);
    expectStatus(() => importDocument(owner.id, "empty.md", Buffer.from("   \n")), 400);
  });

  it("round-trips the supported markdown subset", () => {
    const html = markdownToHtml("# Title\n\n## Section\n\n- Alpha\n- Beta\n");
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("# Title");
    expect(markdown).toContain("## Section");
    expect(markdown).toContain("- Alpha");
  });
});

describe("seeded review workspace", () => {
  it("opens with owned and shared documents for each reviewer", () => {
    fs.rmSync(process.env.FOLIO_DATA_PATH!, { force: true });
    delete process.env.FOLIO_SKIP_DEMO;
    resetStoreCache();

    const khawer = authenticate("khawer.ali@ajaia.test", DEMO_PASSWORD);
    const khawerLists = listDocuments(khawer.id);
    expect(khawerLists.owned.map((item) => item.title)).toContain("Product kickoff");
    expect(khawerLists.shared.map((item) => item.title)).toContain("Hiring rubric");

    const sam = authenticate("sam.okafor@ajaia.test", DEMO_PASSWORD);
    const welcome = getDocument(sam.id, "doc_welcome");
    expect(welcome.role).toBe("view");
    expect(welcome.content).toContain("<h1>");
    expect(welcome.content).toContain("<strong>");
    expect(welcome.content).toContain("<ul>");
    expect(welcome.content).toContain("<ol>");
    expect(welcome.content).toContain("<u>underline</u>");

    const alex = authenticate("alex.chen@ajaia.test", DEMO_PASSWORD);
    expect(getDocument(alex.id, "doc_welcome").role).toBe("edit");
    expect(listDocuments(sam.id).owned.map((item) => item.title)).toContain("Interview notes");
  });
});
