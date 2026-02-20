"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitVote } from "./actions";

interface Caption {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
  images: {
    url: string;
  } | null;
  userVote?: number | null;
}

export default function Home() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<any>(null);
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
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchCaptions = async () => {
      setLoading(true);
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      
      const { data, error, count } = await supabase
        .from("captions")
        .select(`
          id, 
          content, 
          created_datetime_utc, 
          like_count,
          images(url)
        `, { count: 'exact' })
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
        
        const captionsWithVotes = data.map(caption => ({
          ...caption,
          userVote: votes?.find(v => v.caption_id === caption.id)?.vote_value || null
        }));
        
        setCaptions(captionsWithVotes as any);
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
    const result = await submitVote(captionId, voteValue);
    if (result.error) {
      if (result.error.includes('duplicate key')) {
        alert('You have already voted on this caption');
      } else {
        alert(result.error);
      }
    } else {
      setCaptions(prev => prev.map(c => 
        c.id === captionId ? { ...c, userVote: voteValue } : c
      ));
    }
  };

  const totalPages = Math.ceil(total / perPage);

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Captions from Supabase
          </h1>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">
          Showing {captions.length} of {total} captions (Page {page} of {totalPages})
        </p>
        
        {loading && <p className="text-center text-zinc-600">Loading...</p>}
        {error && <p className="text-center text-red-600">Error: {error}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {caption.images?.url && (
                <div className="relative w-full h-64">
                  <Image
                    src={caption.images.url}
                    alt={caption.content}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div className="p-6">
                <p className="text-lg text-zinc-800 dark:text-zinc-200 mb-3">
                  {caption.content}
                </p>
                <div className="flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                  <span>❤️ {caption.like_count} likes</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(caption.id, 1)}
                    className={`flex-1 px-3 py-2 rounded font-semibold transition-all ${
                      caption.userVote === 1 
                        ? 'bg-green-500 text-white ring-4 ring-green-300 scale-105' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    👍 Upvote
                  </button>
                  <button
                    onClick={() => handleVote(caption.id, -1)}
                    className={`flex-1 px-3 py-2 rounded font-semibold transition-all ${
                      caption.userVote === -1 
                        ? 'bg-red-500 text-white ring-4 ring-red-300 scale-105' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    👎 Downvote
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Previous
          </button>
          <span className="text-zinc-900 dark:text-zinc-50">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
