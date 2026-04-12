"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "./components/Nav";

interface Caption {
  id: string;
  content: string;
  like_count: number;
  images: { url: string } | null;
}

export default function Home() {
  const [recent, setRecent] = useState<Caption[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("captions")
        .select("id, content, like_count, images(url)")
        .order("like_count", { ascending: false })
        .limit(3);
      if (data) setRecent(data as any);
    };
    init();
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Nav />

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="text-6xl mb-4">😂</div>
          <h1 className="text-5xl font-black text-zinc-900 dark:text-zinc-50 mb-4 tracking-tight">
            Almost Crackd
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            AI-generated meme captions. Vote on the funniest ones or create your own.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {/* Vote card */}
          <button
            onClick={() => router.push("/vote")}
            className="group text-left bg-white dark:bg-zinc-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 p-8 border border-zinc-100 dark:border-zinc-700 hover:-translate-y-1"
          >
            <div className="text-5xl mb-4">🗳️</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Vote on Memes
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Browse hundreds of AI-generated captions and vote on the ones that actually make you laugh. Upvote the gems, downvote the duds.
            </p>
            <span className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-semibold text-sm group-hover:bg-zinc-700 dark:group-hover:bg-zinc-300 transition-colors">
              Start Voting →
            </span>
          </button>

          {/* Create card */}
          <button
            onClick={() => router.push("/upload")}
            className="group text-left bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 p-8 hover:-translate-y-1"
          >
            <div className="text-5xl mb-4">📸</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Create Your Own
            </h2>
            <p className="text-green-100 mb-6 leading-relaxed">
              Upload any image and let AI generate hilarious captions for it. Your meme joins the feed for everyone to vote on.
            </p>
            <span className="inline-flex items-center gap-2 bg-white text-green-700 px-5 py-2.5 rounded-xl font-semibold text-sm group-hover:bg-green-50 transition-colors">
              Create a Meme →
            </span>
          </button>
        </div>

        {/* Recent top memes */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">🔥 Top Memes Right Now</h3>
              <button
                onClick={() => router.push("/vote")}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                See all →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recent.map((caption) => (
                <div
                  key={caption.id}
                  onClick={() => router.push("/vote")}
                  className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-zinc-100 dark:border-zinc-700 hover:-translate-y-0.5"
                >
                  {caption.images?.url && (
                    <div className="relative w-full h-44 bg-zinc-100 dark:bg-zinc-900">
                      <Image src={caption.images.url} alt={caption.content} fill className="object-contain" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2 mb-2">{caption.content}</p>
                    <span className="text-xs text-zinc-400">❤️ {caption.like_count} likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
