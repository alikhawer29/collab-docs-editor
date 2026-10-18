import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { MAX_IMPORT_BYTES } from "@/lib/files";
import { errorResponse } from "@/lib/http";
import { importDocument } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      throw new HttpError("Choose a .txt or .md file.", 400);
    }
    const upload = file as File;
    if (upload.size > MAX_IMPORT_BYTES) {
      throw new HttpError("Files need to be 200 KB or smaller.", 400);
    }
    const document = importDocument(user.id, upload.name || "import.md", Buffer.from(await upload.arrayBuffer()));
    return NextResponse.json({ document: { id: document.id, title: document.title } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
