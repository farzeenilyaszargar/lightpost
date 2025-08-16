// app/article/[id]/page.tsx
export const dynamic = "force-dynamic";

import { supa } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import CommentBox from "@/components/CommentBox";
import CommentList from "@/components/CommentList";

function sourceFromUrl(url?: string | null) {
  if (!url) return "Unknown source";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Unknown source"; }
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { data: article, error } = await supa()
    .from("articles")
    .select("id,title,summary,published_at,url,image_url")
    .eq("id", params.id)
    .single();

  if (error || !article) return <main className="p-6">Article not found.</main>;

  const long = article.summary ?? "";

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link href="/" className="text-sm underline opacity-80">← Back</Link>

      <h1 className="text-2xl font-bold mt-2">{article.title}</h1>

      {article.image_url && (
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl my-4">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized
          />
        </div>
      )}

      <p className="opacity-80 mt-2">{long}</p>

      <div className="text-xs opacity-60 mt-3">
        {sourceFromUrl(article.url)} • {article.published_at && new Date(article.published_at).toLocaleString()}
      </div>

      <hr className="my-6" />
      <CommentBox articleId={article.id} />
      <CommentList articleId={article.id} />
    </main>
  );
}
