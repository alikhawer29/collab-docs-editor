import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConflictError, HttpError } from "./errors";

export function errorResponse(error: unknown) {
  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message, document: error.current }, { status: 409 });
  }
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
