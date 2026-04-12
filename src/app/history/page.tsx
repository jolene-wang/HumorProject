"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "../components/Nav";

interface VotedCaption {
  id: string;
  content: string;
  like_count: number;
  images: { url: string } | null;
  vote_value: number;
}

export default function HistoryPage() {
  const [votes, setVotes] = useState<VotedCaption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<1 | -1>(1);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("caption_votes")
        .select("vote_value, captions(id, content, like_count, images(url))")
        .eq("profile_id", user.id);

      if (data) {
        const flat = data
          .filter((v: any) => v.captions)
          .map((v: any) => ({ ...v.captions, vote_value: v.vote_value }));
        setVotes(flat);
      }
      setLoading(false);
    };
    init();
  }, []);

  const filtered = votes.filter(v => v.vote_value === tab);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Nav />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">📋 My Voting History</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">All the captions you've weighed in on</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-100 dark:border-zinc-700 text-center">
            <div className="text-3xl font-black text-green-500">{votes.filter(v => v.vote_value === 1).length}</div>
            <div className="text-sm text-zinc-500 mt-1">👍 Upvotes given</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 border border-zinc-100 dark:border-zinc-700 text-center">
            <div className="text-3xl font-black text-red-500">{votes.filter(v => v.vote_value === -1).length}</div>
            <div className="text-sm text-zinc-500 mt-1">👎 Downvotes given</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab(1)}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
              tab === 1
                ? "bg-green-500 text-white"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
          >
            👍 Upvoted ({votes.filter(v => v.vote_value === 1).length})
          </button>
          <button
            onClick={() => setTab(-1)}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
              tab === -1
                ? "bg-red-500 text-white"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
          >
            👎 Downvoted ({votes.filter(v => v.vote_value === -1).length})
          </button>
        </div>

        {loading && <p className="text-center text-zinc-500 py-20">Loading...</p>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{tab === 1 ? "👍" : "👎"}</div>
            <p className="text-zinc-500 dark:text-zinc-400">
              You haven't {tab === 1 ? "upvoted" : "downvoted"} anything yet.
            </p>
            <button
              onClick={() => router.push("/vote")}
              className="mt-4 px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors"
            >
              Go vote on some memes →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((caption) => (
            <div
              key={caption.id}
              className={`bg-white dark:bg-zinc-800 rounded-xl overflow-hidden border transition-shadow hover:shadow-md ${
                tab === 1
                  ? "border-green-200 dark:border-green-900"
                  : "border-red-200 dark:border-red-900"
              }`}
            >
              {caption.images?.url && (
                <div className="relative w-full h-44 bg-zinc-100 dark:bg-zinc-900">
                  <Image src={caption.images.url} alt={caption.content} fill className="object-contain" />
                </div>
              )}
              <div className="p-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed line-clamp-3">
                  {caption.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    tab === 1
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}>
                    {tab === 1 ? "👍 Upvoted" : "👎 Downvoted"}
                  </span>
                  <span className="text-xs text-zinc-400">❤️ {caption.like_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
