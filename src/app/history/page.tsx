"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "../components/Nav";
import { submitVote, toggleSave } from "../actions";

interface Caption {
  id: string;
  content: string;
  like_count: number;
  created_datetime_utc: string;
  voted_at: string | null;
  saved_at: string | null;
  images: { url: string } | null;
  vote_value: number | null;
  isSaved: boolean;
}

type Tab = "upvoted" | "downvoted" | "saved";
type SortKey = "recent" | "oldest" | "most_liked" | "least_liked";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_liked", label: "Most Liked" },
  { value: "least_liked", label: "Least Liked" },
];

function sortItems(items: Caption[], sort: SortKey): Caption[] {
  return [...items].sort((a, b) => {
    if (sort === "most_liked") return b.like_count - a.like_count;
    if (sort === "least_liked") return a.like_count - b.like_count;
    const aDate = new Date(a.voted_at ?? a.saved_at ?? 0).getTime();
    const bDate = new Date(b.voted_at ?? b.saved_at ?? 0).getTime();
    return sort === "recent" ? bDate - aDate : aDate - bDate;
  });
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-5 py-3 rounded-full shadow-xl text-sm font-medium z-50 animate-fade-in">
      {message}
    </div>
  );
}

export default function HistoryPage() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upvoted");
  const [sort, setSort] = useState<SortKey>("recent");
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [votesRes, savesRes] = await Promise.all([
        supabase
          .from("caption_votes")
          .select("vote_value, captions(id, content, like_count, created_datetime_utc, images(url))")
          .eq("profile_id", user.id),
        supabase
          .from("caption_saves")
          .select("captions(id, content, like_count, created_datetime_utc, images(url))")
          .eq("profile_id", user.id),
      ]);

      const savedIds = new Set((savesRes.data ?? []).filter((s: any) => s.captions).map((s: any) => s.captions.id));

      // Build a unified map: captionId -> Caption
      const map = new Map<string, Caption>();

      for (const v of (votesRes.data ?? []).filter((v: any) => v.captions)) {
        const c = v.captions as any;
        map.set(c.id, {
          ...c,
          vote_value: v.vote_value,
          voted_at: c.created_datetime_utc,
          saved_at: c.created_datetime_utc ?? null,
          isSaved: savedIds.has(c.id),
        });
      }

      // Add saved-only captions (not voted on)
      for (const s of (savesRes.data ?? []).filter((s: any) => s.captions)) {
        const c = s.captions as any;
        if (!map.has(c.id)) {
          map.set(c.id, {
            ...c,
            vote_value: null,
            voted_at: null,
            saved_at: c.created_datetime_utc,
            isSaved: true,
          });
        }
      }

      setCaptions(Array.from(map.values()));
      setLoading(false);
    };
    init();
  }, []);

  const upvoted = useMemo(() => sortItems(captions.filter(c => c.vote_value === 1), sort), [captions, sort]);
  const downvoted = useMemo(() => sortItems(captions.filter(c => c.vote_value === -1), sort), [captions, sort]);
  const savedList = useMemo(() => sortItems(captions.filter(c => c.isSaved), sort), [captions, sort]);

  const activeItems = tab === "upvoted" ? upvoted : tab === "downvoted" ? downvoted : savedList;

  const handleVote = async (captionId: string, voteValue: number) => {
    const prev = captions.find(c => c.id === captionId);
    if (!prev) return;
    const prevVote = prev.vote_value ?? 0;
    const newVote = prevVote === voteValue ? null : voteValue;
    const delta = (newVote ?? 0) - prevVote;

    setCaptions(cs => cs.map(c => c.id === captionId
      ? { ...c, vote_value: newVote, like_count: c.like_count + delta }
      : c
    ));

    const result = await submitVote(captionId, voteValue);
    if (result.error) {
      setCaptions(cs => cs.map(c => c.id === captionId ? prev : c));
      setToast("Something went wrong.");
    } else {
      setToast(result.newVote === null ? "Vote removed" : result.newVote === 1 ? "👍 Upvoted!" : "👎 Downvoted!");
    }
  };

  const handleSave = async (captionId: string) => {
    setCaptions(cs => cs.map(c => c.id === captionId ? { ...c, isSaved: !c.isSaved } : c));
    const result = await toggleSave(captionId);
    if (result.error) {
      setCaptions(cs => cs.map(c => c.id === captionId ? { ...c, isSaved: !c.isSaved } : c));
      setToast("Something went wrong.");
    } else {
      setToast(result.saved ? "🔖 Saved!" : "Removed from saved");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-1">📋 My Activity</h1>
        <p className="text-purple-200 text-sm">Your votes and saved memes</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "👍 Upvoted", count: captions.filter(c => c.vote_value === 1).length, color: "text-green-400" },
            { label: "👎 Downvoted", count: captions.filter(c => c.vote_value === -1).length, color: "text-red-400" },
            { label: "🔖 Saved", count: captions.filter(c => c.isSaved).length, color: "text-yellow-400" },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 text-center">
              <div className={`text-3xl font-black ${color}`}>{count}</div>
              <div className="text-sm text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["upvoted", "downvoted", "saved"] as Tab[]).map((t) => {
              const labels = { upvoted: "👍 Upvoted", downvoted: "👎 Downvoted", saved: "🔖 Saved" };
              const activeStyle = { upvoted: "bg-green-500 text-white", downvoted: "bg-red-500 text-white", saved: "bg-yellow-500 text-zinc-900" };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    tab === t ? activeStyle[t] : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && activeItems.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">{tab === "upvoted" ? "👍" : tab === "downvoted" ? "👎" : "🔖"}</div>
            <p className="text-zinc-500">
              {tab === "saved" ? "You haven't saved any memes yet." : `You haven't ${tab} anything yet.`}
            </p>
            <button
              onClick={() => router.push("/vote")}
              className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              Go explore the feed →
            </button>
          </div>
        )}

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all"
            >
              {item.images?.url && (
                <div className="relative w-full bg-zinc-800" style={{ aspectRatio: "4/3" }}>
                  <Image src={item.images.url} alt={item.content} fill className="object-cover" />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    ❤️ {item.like_count}
                  </div>
                </div>
              )}
              <div className="p-4">
                <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3 mb-3">{item.content}</p>

                {/* Vote buttons */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => handleVote(item.id, 1)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      item.vote_value === 1
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/50"
                    }`}
                  >
                    👍 {item.vote_value === 1 ? "Upvoted" : "Upvote"}
                  </button>
                  <button
                    onClick={() => handleVote(item.id, -1)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      item.vote_value === -1
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                    }`}
                  >
                    👎 {item.vote_value === -1 ? "Downvoted" : "Downvote"}
                  </button>
                </div>

                {/* Save button */}
                <button
                  onClick={() => handleSave(item.id)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                    item.isSaved
                      ? "bg-yellow-500 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-yellow-500/20 hover:text-yellow-400 hover:border-yellow-500/50"
                  }`}
                >
                  {item.isSaved ? "🔖 Saved" : "🔖 Save"}
                </button>

                <p className="text-zinc-600 text-xs mt-2">
                  {new Date(item.voted_at ?? item.saved_at ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
