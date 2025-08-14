// supabase/functions/ingest_news/index.ts
// Deno (Edge Functions) runtime

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";

// 1) Add/modify your feeds here:
const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.reuters.com/world/rss",
];

// Helper: strip HTML tags (basic)
function stripHtml(html?: string | null) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Helper: get hostname for source table
function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  let inserted = 0;
  let skipped = 0;

  // Pull each feed, parse, and insert items
  for (const feedUrl of FEEDS) {
    try {
      const res = await fetch(feedUrl, { headers: { "user-agent": "news-anon/1.0" } });
      const text = await res.text();

      // parseFeed supports RSS/Atom
      const feed = await parseFeed(text);

      for (const item of feed.entries) {
        const title = (item.title?.value ?? item.title ?? "").toString().trim();
        const link = (item.links?.[0]?.href ?? item.id ?? "").toString().trim();
        const published = item.published ?? item.updated ?? null;
        const desc = item.description?.value ?? item.description ?? item.content?.value ?? null;

        if (!title || !link) {
          continue; // missing essentials
        }

        // Upsert source
        const host = hostFromUrl(link) ?? "unknown";
        const sourceUrl = host ? `https://${host}` : null;
        const { data: source } = await db
          .from("sources")
          .upsert({ name: host, url: sourceUrl }, { onConflict: "url" })
          .select()
          .single();

        // Insert article (skip if url already exists due to UNIQUE constraint)
        const { error } = await db.from("articles").insert({
          title,
          url: link,
          source_id: source?.id ?? null,
          summary: stripHtml(desc)?.slice(0, 600) ?? null,
          published_at: published ? new Date(published) : null,
        });

        if (error) {
          // If it's a duplicate constraint error, we count as skipped; otherwise log it
          if (String(error.message).toLowerCase().includes("duplicate") ||
              String(error.message).toLowerCase().includes("unique")) {
            skipped++;
          } else {
            console.error("insert error:", error.message);
          }
        } else {
          inserted++;
        }
      }
    } catch (e) {
      console.error("feed error:", feedUrl, e?.message ?? e);
    }
  }

  return new Response(JSON.stringify({ inserted, skipped }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
});
