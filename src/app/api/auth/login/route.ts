import { NextResponse } from "next/server";
import { z } from "zod";
import { startSession } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { authenticate } from "@/lib/store";

const LoginSchema = z.object({
  email: z.string({ required_error: "Enter your email." }).trim().email("Enter a valid email."),
  password: z.string({ required_error: "Enter your password." }).min(1, "Enter your password."),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }
    const input = LoginSchema.parse(json);
    const user = authenticate(input.email, input.password);
    await startSession(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
