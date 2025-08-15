// app/article/[id]/page.tsx
import { supa } from "@/lib/supabase";
import CommentBox from "@/components/CommentBox";
import CommentList from "@/components/CommentList";
import Link from "next/link";

function sourceFromUrl(url?: string | null) {
  if (!url) return "Unknown source";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Unknown source";
  } catch {
    return "Unknown source";
  }
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { data: article, error } = await supa()
    .from("articles")
    .select("id,title,summary,published_at,url") // ← no join here
    .eq("id", params.id)
    .single();

  if (error || !article) {
    return <main className="p-6">Article not found.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link href="/" className="text-sm underline opacity-80">← Back</Link>

      <h1 className="text-2xl font-bold mt-2">{article.title}</h1>

      {article.summary && <p className="opacity-80 mt-2">{article.summary}</p>}

      <div className="text-xs opacity-60 mt-2">
        {sourceFromUrl(article.url)} •{" "}
        {article.published_at && new Date(article.published_at).toLocaleString()}
      </div>

      <hr className="my-6" />

      {/* Commenting UI (posting works after Step 6: anonymous session) */}
      <CommentBox articleId={article.id} />

      {/* Polling comments (no replication needed) */}
      <CommentList articleId={article.id} />
    </main>
  );
}
