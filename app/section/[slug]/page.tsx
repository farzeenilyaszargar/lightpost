// app/section/[slug]/page.tsx
export const dynamic = "force-dynamic";

import { supa } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

function sourceFromUrl(url?: string | null) {
  if (!url) return "Unknown source";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Unknown source"; }
}

type Article = {
  id: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  url: string;
  image_url: string | null;
  topics: string[] | null;
};


export default async function SectionPage({ params }: { params: { slug: string } }) {
  const section = params.slug.toLowerCase();

  const { data: articles, error } = await (supa() as any)
    .from("articles")
    // .contains matches array includes all items in the provided array (we pass one tag)
    .contains("topics", [section])
    .order("published_at", { ascending: false })
    .limit(50)
    .select("id,title,summary,published_at,url,image_url,topics");

  if (error) return <main className="p-6">Failed: {error.message}</main>;

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm underline opacity-80">← Home</Link>
        <h1 className="text-2xl font-bold capitalize">{section}</h1>
      </div>

      {(articles ?? []).map((a:Article) => {
        const preview = (a.summary ?? "").split(/\s+/).slice(0, 35).join(" ");
        return (
          <Link key={a.id} href={`/article/${a.id}`} className="block overflow-hidden rounded-2xl border hover:shadow transition">
            {a.image_url && (
              <div className="relative w-full aspect-[16/9]">
                <Image
                  src={a.image_url}
                  alt={a.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 700px"
                  unoptimized
                />
              </div>
            )}
            <div className="p-4">
              <div className="text-xs uppercase tracking-wide opacity-60">{a.topics?.join(" • ")}</div>
              <h2 className="text-xl font-semibold mt-1">{a.title}</h2>
              {preview && <p className="text-sm opacity-80 mt-1">{preview}…</p>}
              <div className="text-xs opacity-60 mt-2">
                {sourceFromUrl(a.url)} • {a.published_at && new Date(a.published_at).toLocaleString()}
              </div>
            </div>
          </Link>
        );
      })}

      {!articles?.length && <p className="opacity-70">No {section} stories yet. Run /api/ingest.</p>}
    </main>
  );
}
