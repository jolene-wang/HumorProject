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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full shadow-xl text-sm font-medium z-50 animate-fade-in flex items-center gap-2">
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
    setCaptions(prev => prev.map(c => {
      if (c.id !== captionId) return c;
      const prevVote = c.userVote ?? 0;
      const newVote = prevVote === voteValue ? null : voteValue;
      return { ...c, userVote: newVote, like_count: c.like_count + (newVote ?? 0) - prevVote };
    }));
    const result = await submitVote(captionId, voteValue);
    if (result.error) {
      setToast("Something went wrong. Try again.");
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
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Hero bar */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-1">🗳️ Caption Feed</h1>
        <p className="text-purple-200 text-sm">
          {total} captions · vote on the funniest ones · click again to change or remove
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">Loading captions...</p>
          </div>
        )}
        {error && <p className="text-center text-red-400 py-10">{error}</p>}

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="break-inside-avoid bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all duration-200 group"
            >
              {caption.images?.url && (
                <div className="relative w-full bg-zinc-800" style={{ aspectRatio: "4/3" }}>
                  <Image
                    src={caption.images.url}
                    alt={caption.content}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {/* Like count badge */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    ❤️ {caption.like_count}
                  </div>
                  {/* Voted badge */}
                  {caption.userVote !== null && caption.userVote !== undefined && (
                    <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                      caption.userVote === 1
                        ? "bg-green-500/90 text-white"
                        : "bg-red-500/90 text-white"
                    }`}>
                      {caption.userVote === 1 ? "👍 Upvoted" : "👎 Downvoted"}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4">
                <p className="text-zinc-200 text-sm leading-relaxed mb-4">{caption.content}</p>

                {/* Vote buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(caption.id, 1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                      caption.userVote === 1
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:bg-green-500/20 hover:text-green-400 border border-zinc-700 hover:border-green-500/50"
                    }`}
                  >
                    👍 {caption.userVote === 1 ? "Upvoted" : "Upvote"}
                  </button>
                  <button
                    onClick={() => handleVote(caption.id, -1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                      caption.userVote === -1
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 hover:border-red-500/50"
                    }`}
                  >
                    👎 {caption.userVote === -1 ? "Downvoted" : "Downvote"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-14">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl disabled:opacity-30 hover:bg-zinc-700 transition-colors text-sm font-medium border border-zinc-700"
            >
              ← Previous
            </button>
            <span className="text-zinc-500 text-sm px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl disabled:opacity-30 hover:bg-zinc-700 transition-colors text-sm font-medium border border-zinc-700"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
