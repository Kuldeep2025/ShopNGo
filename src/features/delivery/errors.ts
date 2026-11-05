import { NextResponse } from "next/server";

export function errorResponse(err: unknown) {
  const status = (err as Error & { status?: number }).status ?? 500;
  if (status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (status === 403) return NextResponse.json({ error: "You need to be an approved delivery partner" }, { status: 403 });
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
