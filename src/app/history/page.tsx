"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "../components/Nav";

interface VotedCaption {
  id: string;
  content: string;
  like_count: number;
  created_datetime_utc: string;
  voted_at: string;
  images: { url: string } | null;
  vote_value: number;
}

interface SavedCaption {
  id: string;
  content: string;
  like_count: number;
  created_datetime_utc: string;
  saved_at: string;
  images: { url: string } | null;
}

type Tab = "upvoted" | "downvoted" | "saved";
type SortKey = "recent" | "oldest" | "most_liked" | "least_liked";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_liked", label: "Most Liked" },
  { value: "least_liked", label: "Least Liked" },
];

export default function HistoryPage() {
  const [votes, setVotes] = useState<VotedCaption[]>([]);
  const [saved, setSaved] = useState<SavedCaption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upvoted");
  const [sort, setSort] = useState<SortKey>("recent");
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
          .select("vote_value, created_datetime_utc, captions(id, content, like_count, created_datetime_utc, images(url))")
          .eq("profile_id", user.id),
        supabase
          .from("caption_saves")
          .select("created_datetime_utc, captions(id, content, like_count, created_datetime_utc, images(url))")
          .eq("profile_id", user.id),
      ]);

      if (votesRes.data) {
        setVotes(
          votesRes.data
            .filter((v: any) => v.captions)
            .map((v: any) => ({ ...v.captions, vote_value: v.vote_value, voted_at: v.created_datetime_utc }))
        );
      }
      if (savesRes.data) {
        setSaved(
          savesRes.data
            .filter((s: any) => s.captions)
            .map((s: any) => ({ ...s.captions, saved_at: s.created_datetime_utc }))
        );
      }
      setLoading(false);
    };
    init();
  }, []);

  const sortItems = <T extends { like_count: number; voted_at?: string; saved_at?: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      if (sort === "most_liked") return b.like_count - a.like_count;
      if (sort === "least_liked") return a.like_count - b.like_count;
      const aDate = new Date(a.voted_at ?? a.saved_at ?? 0).getTime();
      const bDate = new Date(b.voted_at ?? b.saved_at ?? 0).getTime();
      return sort === "recent" ? bDate - aDate : aDate - bDate;
    });
  };

  const upvoted = useMemo(() => sortItems(votes.filter(v => v.vote_value === 1)), [votes, sort]);
  const downvoted = useMemo(() => sortItems(votes.filter(v => v.vote_value === -1)), [votes, sort]);
  const savedSorted = useMemo(() => sortItems(saved as any), [saved, sort]);

  const activeItems = tab === "upvoted" ? upvoted : tab === "downvoted" ? downvoted : savedSorted;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />

      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-1">📋 My Activity</h1>
        <p className="text-purple-200 text-sm">Your votes and saved memes</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "👍 Upvoted", count: votes.filter(v => v.vote_value === 1).length, color: "text-green-400" },
            { label: "👎 Downvoted", count: votes.filter(v => v.vote_value === -1).length, color: "text-red-400" },
            { label: "🔖 Saved", count: saved.length, color: "text-yellow-400" },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 text-center">
              <div className={`text-3xl font-black ${color}`}>{count}</div>
              <div className="text-sm text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Sort row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["upvoted", "downvoted", "saved"] as Tab[]).map((t) => {
              const labels = { upvoted: "👍 Upvoted", downvoted: "👎 Downvoted", saved: "🔖 Saved" };
              const active = {
                upvoted: "bg-green-500 text-white",
                downvoted: "bg-red-500 text-white",
                saved: "bg-yellow-500 text-zinc-900",
              };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    tab === t
                      ? active[t]
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
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
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && activeItems.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">
              {tab === "upvoted" ? "👍" : tab === "downvoted" ? "👎" : "🔖"}
            </div>
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
          {activeItems.map((item: any) => (
            <div
              key={item.id}
              className={`break-inside-avoid bg-zinc-900 rounded-2xl overflow-hidden border transition-all hover:border-zinc-600 ${
                tab === "upvoted"
                  ? "border-green-900/60"
                  : tab === "downvoted"
                  ? "border-red-900/60"
                  : "border-yellow-900/60"
              }`}
            >
              {item.images?.url && (
                <div className="relative w-full bg-zinc-800" style={{ aspectRatio: "4/3" }}>
                  <Image src={item.images.url} alt={item.content} fill className="object-cover" />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    ❤️ {item.like_count}
                  </div>
                  <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                    tab === "upvoted"
                      ? "bg-green-500/90 text-white"
                      : tab === "downvoted"
                      ? "bg-red-500/90 text-white"
                      : "bg-yellow-500/90 text-zinc-900"
                  }`}>
                    {tab === "upvoted" ? "👍 Upvoted" : tab === "downvoted" ? "👎 Downvoted" : "🔖 Saved"}
                  </div>
                </div>
              )}
              <div className="p-4">
                <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">{item.content}</p>
                <p className="text-zinc-600 text-xs mt-2">
                  {new Date(item.voted_at ?? item.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
