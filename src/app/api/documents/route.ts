import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { createDocument, listDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(listDocuments(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const document = createDocument(user.id);
    return NextResponse.json({ document: { id: document.id, title: document.title } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
