import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { deleteDocument, getDocument, updateDocument } from "@/lib/store";

export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().max(400_000, "This document is too large to save.").optional(),
    revision: z.number().int().positive("Save from the open document."),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "Nothing to update.",
  });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return NextResponse.json({ document: getDocument(user.id, id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const json = await request.json().catch(() => null);
    const input = PatchSchema.parse(json);
    const saved = updateDocument(user.id, id, input);
    return NextResponse.json({
      document: {
        id: saved.id,
        title: saved.title,
        revision: saved.revision,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    deleteDocument(user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
