// app/api/comments/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// tiny input validator
function validBody(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.length <= 2000;
}

export async function POST(req: NextRequest) {
  try {
    const { article_id, body } = await req.json();

    // pull anon id from the httpOnly cookie set by middleware
    const visitorId = req.cookies.get("visitor_id")?.value;
    if (!visitorId) {
      return NextResponse.json({ error: "visitor not identified" }, { status: 401 });
    }
    if (!article_id || !validBody(body)) {
      return NextResponse.json({ error: "invalid input" }, { status: 400 });
    }

    // Optional: rate limit here (e.g., Upstash) using `visitorId`
    // if (!await allow(`comment:${visitorId}`, 5, 60)) return NextResponse.json({ error: "slow down" }, { status: 429 });

    const db = supabaseAdmin();

    // We’ll store the visitor hash in the comment.
    // Update your table to allow this field (Step 6E below).
    const { error } = await db.from("comments").insert({
      article_id,
      author_id: null,       // we won’t use Supabase Auth users
      body,
      is_flagged: false,
      // @ts-ignore: make sure the column exists (see 6E)
      author_hash: visitorId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
