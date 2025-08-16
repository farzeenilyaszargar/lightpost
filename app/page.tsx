// app/page.tsx
import { supa } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

function sourceFromUrl(url?: string | null) {
  if (!url) return "Unknown source";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Unknown source"; }
}

export const dynamic = "force-dynamic"; // avoid caching old results

export default async function Home() {
  const { data: articles, error } = await supa()
    .from("articles")
    .select("id,title,summary,published_at,url,image_url")
    .order("published_at", { ascending: false })
    .limit(40);

  if (error) return <main className="p-6">Failed to load: {error.message}</main>;

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-4">
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
  {["world","business","tech","science","health","sports"].map(s => (
    <Link key={s} href={`/section/${s}`} className="rounded-full border px-3 py-1 hover:shadow capitalize">
      {s}
    </Link>
  ))}
</nav>
      <h1 className="text-2xl font-bold mb-4">Latest news</h1>

      {(articles ?? []).map((a) => {
        const preview = (a.summary ?? "").split(/\s+/).slice(0, 35).join(" ");
        return (
          <Link
            key={a.id}
            href={`/article/${a.id}`}
            className="block overflow-hidden rounded-2xl border hover:shadow transition"
          >
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
              <h2 className="text-xl font-semibold">{a.title}</h2>
              {preview && <p className="text-sm opacity-80 mt-1">{preview}…</p>}
              <div className="text-xs opacity-60 mt-2">
                {sourceFromUrl(a.url)} • {a.published_at && new Date(a.published_at).toLocaleString()}
              </div>
            </div>
          </Link>
        );
      })}

      {!articles?.length && <p className="opacity-70">No articles yet. Run /api/ingest to add some.</p>}
    </main>
  );
}
