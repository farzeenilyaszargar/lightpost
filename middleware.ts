// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function randomId() {
  // simple UUID-ish; good enough for anon identity
  return crypto.randomUUID();
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // if visitor_id not present, set it
  const cookie = req.cookies.get("visitor_id");
  if (!cookie) {
    res.cookies.set("visitor_id", randomId(), {
      httpOnly: true,   // not readable by JS
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return res;
}

// run for everything except static assets
export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.ico).*)"],
};
