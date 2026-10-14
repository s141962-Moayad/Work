import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const POST = handler({}, async () => {
  const res = NextResponse.json({ ok: true, data: null });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
});
