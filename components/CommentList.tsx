"use client";

import useSWR from "swr";
import { supa } from "@/lib/supabase";
import { useEffect } from "react";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
};

async function fetchComments(articleId: string): Promise<Comment[]> {
  const { data, error } = await supa()
    .from("comments")
    .select("id,body,created_at,author_id")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function CommentList({ articleId }: { articleId: string }) {
  const { data: comments, isLoading, error, mutate } = useSWR(
    ["comments", articleId],
    () => fetchComments(articleId),
    {
      refreshInterval: 3000,   // poll every 3 seconds
      revalidateOnFocus: true, // also refresh when tab refocuses
    }
  );

  // Optional: refresh immediately after a post (from CommentBox)
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.articleId === articleId) mutate();
    };
    window.addEventListener("comments:refresh", handler);
    return () => window.removeEventListener("comments:refresh", handler);
  }, [articleId, mutate]);

  if (error) return <div className="text-sm text-red-600">Failed to load comments.</div>;
  if (isLoading) return <div className="text-sm opacity-60">Loading comments…</div>;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => mutate()}
          className="rounded-xl border px-3 py-1 text-sm hover:shadow"
          title="Refresh now"
        >
          Refresh
        </button>
        <span className="text-xs opacity-60">{comments?.length ?? 0} comments</span>
      </div>

      <ul className="space-y-3">
        {(comments ?? []).map((c) => (
          <li key={c.id} className="rounded-xl border p-3">
            <p>{c.body}</p>
            <div className="mt-1 text-xs opacity-60">
              {new Date(c.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
