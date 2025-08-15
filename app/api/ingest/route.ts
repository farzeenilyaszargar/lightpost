import { NextResponse } from "next/server";
import { supa } from "@/lib/supabase";

const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.reuters.com/world/rss",
];

function stripHtml(html?: string | null) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
function hostFromUrl(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

export async function GET() {
  let inserted = 0, skipped = 0;

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed, { headers: { "user-agent": "news-anon/1.0" } });
      const xml = await res.text();

      // very small RSS parse (good enough)
      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(m => m[1]);
      for (const it of items) {
        const title = it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          ?? it.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
        const link  = it.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
        const pub   = it.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? null;
        const desc  = it.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
          ?? it.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? null;

        if (!title || !link) continue;

        const host = hostFromUrl(link) ?? "unknown";
        const { data: src } = await supa().from("sources")
          .upsert({ name: host, url: `https://${host}` }, { onConflict: "url" })
          .select().single();

        const { error } = await supa().from("articles").insert({
          title: title.trim(),
          url: link.trim(),
          source_id: src?.id ?? null,
          summary: stripHtml(desc)?.slice(0, 600) ?? null,
          published_at: pub ? new Date(pub) : null,
        });

        if (error) {
          const msg = String(error.message).toLowerCase();
          if (msg.includes("duplicate") || msg.includes("unique")) skipped++;
          else console.error("insert error:", error.message);
        } else {
          inserted++;
        }
      }
    } catch (e: any) {
      console.error("feed error", feed, e?.message ?? e);
    }
  }

  return NextResponse.json({ inserted, skipped });
}
