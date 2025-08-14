// app/page.tsx
import { supa } from "@/lib/supabase";

function sourceFromUrl(url?: string | null) {
  if (!url) return "Unknown source";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Unknown source";
  } catch {
    return "Unknown source";
  }
}

export default async function Home() {
  const { data: articles, error } = await supa()
    .from("articles")
    .select("id,title,summary,published_at,url") // ← no join for now
    .order("published_at", { ascending: false })
    .limit(40);

  if (error) {
    return <main className="p-6">Failed to load articles: {error.message}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Latest news</h1>

      {(articles ?? []).map((a) => (
        <a
          key={a.id}
          href={`/article/${a.id}`}
          className="block rounded-2xl border p-4 hover:shadow transition"
        >
          <h2 className="text-xl font-semibold">{a.title}</h2>
          {a.summary && <p className="text-sm opacity-80 mt-1">{a.summary}</p>}
          <div className="text-xs opacity-60 mt-2">
            {sourceFromUrl(a.url)} •{" "}
            {a.published_at && new Date(a.published_at).toLocaleString()}
          </div>
        </a>
      ))}

      {!articles?.length && (
        <p className="opacity-70">No articles yet. Add one in Supabase as in Step 4E.</p>
      )}
    </main>
  );
}
