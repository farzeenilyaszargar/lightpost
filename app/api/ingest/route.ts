import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** ---- config ---- */
const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.reuters.com/world/rss",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://feeds.npr.org/1004/rss.xml",                 // NPR World
  "https://www.theguardian.com/world/rss",
  "https://www.economist.com/international/rss.xml",

  // Business / Markets
  "https://www.reuters.com/finance/rss",                // Reuters business (often works)
  "https://www.marketwatch.com/rss/topstories",         // MarketWatch Top
  "https://www.ft.com/world/rss",                       // FT World (some articles paywalled)

  // Technology
  "https://www.reuters.com/technology/rss",
  "https://www.theverge.com/rss/index.xml",
  "https://techcrunch.com/feed/",
  "https://arstechnica.com/feed/",
  "https://www.wired.com/feed/rss",

  // Science / Health
  "https://www.nature.com/subjects/science/rss",
  "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science", // AAAS
  "https://www.who.int/feeds/entity/csr/don/en/rss.xml",                   // WHO disease outbreaks

];

// use service role on the server so upserts never fail due to RLS
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE!;
const db = () => createClient(url, service);

/** ---- helpers ---- */
function stripHtml(input?: string | null): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function limitWords(text: string, min: number, max: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const take = Math.min(words.length, max);
  const atleast = Math.max(min, take);
  return words.slice(0, atleast).join(" ");
}
function buildSummary(raw?: string | null): string | null {
  const clean = stripHtml(raw);
  if (!clean) return null;
  return limitWords(clean, 150, 200);
}
function hostFromUrl(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; }
}
function extractImageFromItemXml(itemXml: string): string | null {
  const m1 = itemXml.match(/<media:content[^>]*\burl="([^"]+)"/i)?.[1];
  if (m1) return m1;
  const m2 = itemXml.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*\btype="image\//i)?.[1];
  if (m2) return m2;
  const m3 = itemXml.match(/<media:thumbnail[^>]*\burl="([^"]+)"/i)?.[1];
  if (m3) return m3;
  const m4 = itemXml.match(/<img[^>]*\bsrc="([^"]+)"/i)?.[1];
  if (m4) return m4;
  return null;
}
// last-resort: fetch page og:image & og:description (slower but better fill rates)
async function fetchOgMeta(url: string): Promise<{ image?: string|null; desc?: string|null }> {
  try {
    const html = await (await fetch(url, { headers: { "user-agent": "news-anon/1.0" } })).text();
    const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ?? null;
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] ?? null;
    return { image: ogImg, desc: ogDesc };
  } catch { return { image: null, desc: null }; }
}

/** ---- handler ---- */
export async function GET() {
  const client = db();
  let inserted = 0, updated = 0, skipped = 0;

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed, { headers: { "user-agent": "news-anon/1.0" } });
      const xml = await res.text();

      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(m => m[1]);

      for (const it of items) {
        const title =
          it.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ??
          it.match(/<title>(.*?)<\/title>/i)?.[1] ?? "";
        const link =
          it.match(/<link>(.*?)<\/link>/i)?.[1]?.trim() ??
          it.match(/<guid[^>]*>(.*?)<\/guid>/i)?.[1]?.trim() ?? "";
        if (!title || !link) { skipped++; continue; }

        const pub =
          it.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1] ??
          it.match(/<updated>(.*?)<\/updated>/i)?.[1] ?? null;

        // collect description from several places
        const desc =
          it.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i)?.[1] ??
          it.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ??
          it.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/i)?.[1] ??
          it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1] ?? null;

        // images
        let imageUrl = extractImageFromItemXml(it);
        let longDesc = desc;

        // fallback: og meta (slower; comment out if you prefer speed)
        if (!imageUrl || !longDesc) {
          const og = await fetchOgMeta(link);
          if (!imageUrl && og.image) imageUrl = og.image;
          if (!longDesc && og.desc) longDesc = og.desc;
        }

        // upsert source
        const host = hostFromUrl(link) ?? "unknown";
        const { data: src } = await client
          .from("sources")
          .upsert({ name: host, url: host ? `https://${host}` : null }, { onConflict: "url" })
          .select().single();

        const summary = buildSummary(longDesc);

        // pre-check to count updated vs inserted
        const existing = await client.from("articles").select("id").eq("url", link.trim()).maybeSingle();

        const { error } = await client.from("articles").upsert(
          {
            title: title.trim(),
            url: link.trim(),
            source_id: src?.id ?? null,
            summary,
            image_url: imageUrl ?? null,
            published_at: pub ? new Date(pub) : null,
          },
          { onConflict: "url", ignoreDuplicates: false }
        );

        if (error) {
          console.error("upsert error:", error.message);
          skipped++;
        } else {
          if (existing.data?.id) updated++; else inserted++;
        }
      }
    } catch (e: any) {
      console.error("feed error", feed, e?.message ?? e);
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, skipped });
}
