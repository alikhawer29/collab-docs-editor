import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { grantAccess } from "@/lib/store";

export const dynamic = "force-dynamic";

const ShareSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  permission: z.enum(["edit", "view"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const json = await request.json().catch(() => null);
    const input = ShareSchema.parse(json);
    const shares = grantAccess(user.id, id, input.email, input.permission);
    return NextResponse.json({ shares });
  } catch (error) {
    return errorResponse(error);
  }
}
