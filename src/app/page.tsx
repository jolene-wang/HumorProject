"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import Image from "next/image";

interface Caption {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
  images: {
    url: string;
  } | null;
}

export default function Home() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 60;

  useEffect(() => {
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
        setCaptions(data as any);
        setTotal(count || 0);
      }
      setLoading(false);
    };
    fetchCaptions();
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 text-zinc-900 dark:text-zinc-50">
          Captions from Supabase
        </h1>
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
                <div className="flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400">
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                  <span>❤️ {caption.like_count} likes</span>
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
