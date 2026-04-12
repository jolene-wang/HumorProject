"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitVote } from "./actions";

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

export default function Home() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const perPage = 60;
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        if (!localStorage.getItem("onboarding_seen")) {
          setShowOnboarding(true);
        }
      }
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
        .select(`id, content, created_datetime_utc, like_count, images(url)`, { count: "exact" })
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleVote = async (captionId: string, voteValue: number) => {
    if (votingId === captionId) return;
    setVotingId(captionId);

    // Optimistic update
    setCaptions(prev => prev.map(c => {
      if (c.id !== captionId) return c;
      const prev_vote = c.userVote ?? 0;
      const new_vote = prev_vote === voteValue ? null : voteValue;
      const delta = (new_vote ?? 0) - prev_vote;
      return { ...c, userVote: new_vote, like_count: c.like_count + delta };
    }));

    const result = await submitVote(captionId, voteValue);
    if (result.error) {
      // Revert on error
      setCaptions(prev => prev.map(c => {
        if (c.id !== captionId) return c;
        const revert_vote = c.userVote;
        const delta = (revert_vote ?? 0) - (result.newVote ?? 0);
        return { ...c, userVote: revert_vote, like_count: c.like_count + delta };
      }));
      setToast("Something went wrong. Try again.");
    } else {
      const msg = result.newVote === null ? "Vote removed" : result.newVote === 1 ? "👍 Upvoted!" : "👎 Downvoted!";
      setToast(msg);
    }
    setVotingId(null);
  };

  const dismissOnboarding = () => {
    localStorage.setItem("onboarding_seen", "1");
    setShowOnboarding(false);
  };

  const totalPages = Math.ceil(total / perPage);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black p-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">😂 Almost Crackd</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Vote on AI-generated meme captions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/upload")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold shadow"
            >
              📸 Create Meme
            </button>
            <button
              onClick={handleSignOut}
              className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Onboarding banner */}
        {showOnboarding && (
          <div className="mb-6 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 flex gap-4 items-start">
            <span className="text-3xl">👋</span>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">Welcome to Almost Crackd!</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Browse AI-generated captions and vote on the funniest ones. Want to add your own?
                Hit <strong>📸 Create Meme</strong> to upload an image and generate captions instantly.
                You can change or remove your vote anytime by clicking again.
              </p>
            </div>
            <button onClick={dismissOnboarding} className="text-indigo-400 hover:text-indigo-600 text-xl leading-none">✕</button>
          </div>
        )}

        <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
          {total} captions · Page {page} of {totalPages}
        </p>

        {loading && <p className="text-center text-zinc-500">Loading...</p>}
        {error && <p className="text-center text-red-600">Error: {error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow flex flex-col"
            >
              {caption.images?.url && (
                <div className="relative w-full h-56 bg-zinc-100 dark:bg-zinc-900">
                  <Image src={caption.images.url} alt={caption.content} fill className="object-contain" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <p className="text-base text-zinc-800 dark:text-zinc-200 mb-4 flex-1">{caption.content}</p>

                {/* Vote bar */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => handleVote(caption.id, 1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                      caption.userVote === 1
                        ? "bg-green-500 text-white shadow-md scale-105 ring-2 ring-green-300"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-green-100 dark:hover:bg-green-900"
                    }`}
                  >
                    👍 {caption.userVote === 1 ? <span className="underline underline-offset-2">Upvoted</span> : "Upvote"}
                  </button>
                  <button
                    onClick={() => handleVote(caption.id, -1)}
                    disabled={votingId === caption.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                      caption.userVote === -1
                        ? "bg-red-500 text-white shadow-md scale-105 ring-2 ring-red-300"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-100 dark:hover:bg-red-900"
                    }`}
                  >
                    👎 {caption.userVote === -1 ? <span className="underline underline-offset-2">Downvoted</span> : "Downvote"}
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500">
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">❤️ {caption.like_count} likes</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            ← Previous
          </button>
          <span className="text-zinc-600 dark:text-zinc-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
