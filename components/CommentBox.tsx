"use client";

import { useState } from "react";

export default function CommentBox({ articleId }: { articleId: string }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    const text = body.trim();
    if (!text) return;

    setLoading(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId, body: text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");

      setBody("");
      setMsg("Posted!");
      // tell CommentList to refresh immediately
      window.dispatchEvent(new CustomEvent("comments:refresh", { detail: { articleId } }));
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-3">
      <textarea
        className="w-full resize-none outline-none"
        rows={3}
        placeholder="Share your view (anonymous)…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl border px-3 py-1 hover:shadow"
        >
          {loading ? "Posting…" : "Post"}
        </button>
        {msg && <span className="text-xs opacity-70">{msg}</span>}
      </div>
    </div>
  );
}
