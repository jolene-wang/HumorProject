"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "../components/Nav";
import { submitVote } from "../actions";

interface Caption {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
  images: { url: string } | null;
  userVote?: number | null;
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium z-50 animate-fade-in">
      {message}
    </div>
  );
}

export default function VotePage() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const perPage = 60;
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("captions-likes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "captions" }, (payload) => {
        setCaptions(prev => prev.map(c =>
          c.id === payload.new.id ? { ...c, like_count: payload.new.like_count } : c
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCaptions = async () => {
      setLoading(true);
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, error, count } = await supabase
        .from("captions")
        .select("id, content, created_datetime_utc, like_count, images(url)", { count: "exact" })
        .range(from, to);
      if (error) {
        setError(error.message);
      } else if (data) {
        const captionIds = data.map(c => c.id);
        const { data: votes } = await supabase
          .from("caption_votes")
          .select("caption_id, vote_value")
          .eq("profile_id", user.id)
          .in("caption_id", captionIds);
        setCaptions(data.map(caption => ({
          ...caption,
          userVote: votes?.find(v => v.caption_id === caption.id)?.vote_value ?? null,
        })) as any);
        setTotal(count || 0);
      }
      setLoading(false);
    };
    fetchCaptions();
  }, [page, user]);

  const handleVote = async (captionId: string, voteValue: number) => {
    if (votingId === captionId) return;
    setVotingId(captionId);

    // Optimistic update
    setCaptions(prev => prev.map(c => {
      if (c.id !== captionId) return c;
      const prevVote = c.userVote ?? 0;
      const newVote = prevVote === voteValue ? null : voteValue;
      return { ...c, userVote: newVote, like_count: c.like_count + (newVote ?? 0) - prevVote };
    }));

    const result = await submitVote(captionId, voteValue);
    if (result.error) {
      setToast("Something went wrong. Try again.");
      // revert
      setCaptions(prev => prev.map(c => {
        if (c.id !== captionId) return c;
        const revert = c.userVote === null ? voteValue : null;
        return { ...c, userVote: revert };
      }));
    } else {
      setToast(result.newVote === null ? "Vote removed" : result.newVote === 1 ? "👍 Upvoted!" : "👎 Downvoted!");
    }
    setVotingId(null);
  };

  const totalPages = Math.ceil(total / perPage);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Nav />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">🗳️ Vote on Captions</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{total} captions · click again to change or remove your vote</p>
        </div>

        {loading && <p className="text-center text-zinc-500 py-20">Loading...</p>}
        {error && <p className="text-center text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col border border-zinc-100 dark:border-zinc-700"
            >
              {caption.images?.url && (
                <div className="relative w-full h-52 bg-zinc-100 dark:bg-zinc-900 rounded-t-xl overflow-hidden">
                  <Image src={caption.images.url} alt={caption.content} fill className="object-contain" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 flex-1 leading-relaxed">{caption.content}</p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => handleVote(caption.id, 1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      caption.userVote === 1
                        ? "bg-green-500 text-white ring-2 ring-green-300 scale-105"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-green-100 dark:hover:bg-green-900/40"
                    }`}
                  >
                    👍 {caption.userVote === 1 ? "Upvoted" : "Upvote"}
                  </button>
                  <button
                    onClick={() => handleVote(caption.id, -1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      caption.userVote === -1
                        ? "bg-red-500 text-white ring-2 ring-red-300 scale-105"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-100 dark:hover:bg-red-900/40"
                    }`}
                  >
                    👎 {caption.userVote === -1 ? "Downvoted" : "Downvote"}
                  </button>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                  <span>❤️ {caption.like_count} likes</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
