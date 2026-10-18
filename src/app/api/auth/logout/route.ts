import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
