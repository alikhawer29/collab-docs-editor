import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { revokeAccess } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const user = await requireUser();
    const { id, userId } = await context.params;
    const shares = revokeAccess(user.id, id, userId);
    return NextResponse.json({ shares });
  } catch (error) {
    return errorResponse(error);
  }
}
