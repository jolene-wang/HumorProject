"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Nav from "../components/Nav";
import { generateCaptions } from "../upload-actions";

interface MyImage {
  id: string;
  url: string;
  created_datetime_utc: string;
  captions: { id: string; content: string; like_count: number }[];
  generating?: boolean;
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

export default function MyMemesPage() {
  const [images, setImages] = useState<MyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("images")
        .select("id, url, created_datetime_utc, captions(id, content, like_count)")
        .eq("profile_id", user.id)
        .order("created_datetime_utc", { ascending: false });

      if (data) setImages(data as any);
      setLoading(false);
    };
    init();
  }, []);

  const handleGenerateMore = async (imageId: string) => {
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, generating: true } : img));

    const result = await generateCaptions(imageId);
    if (result.error) {
      setToast(`Error: ${result.error}`);
      setImages(prev => prev.map(img => img.id === imageId ? { ...img, generating: false } : img));
      return;
    }

    // Re-fetch captions for this image
    const { data: refreshed } = await supabase
      .from("captions")
      .select("id, content, like_count")
      .eq("image_id", imageId);

    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, captions: refreshed ?? img.captions, generating: false } : img
    ));
    // Expand to show new captions
    setExpanded(prev => new Set(prev).add(imageId));
    setToast("✨ New captions generated!");
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-10 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight mb-1">🎨 My Memes</h1>
        <p className="text-purple-200 text-sm">Images you've uploaded and their AI-generated captions</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <p className="text-zinc-500 text-sm">{images.length} image{images.length !== 1 ? "s" : ""} uploaded</p>
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            📸 Upload New Image
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-32">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="text-center py-32">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-zinc-400 text-lg mb-2">No memes yet!</p>
            <p className="text-zinc-600 text-sm mb-6">Upload an image and let AI generate captions for it.</p>
            <button
              onClick={() => router.push("/upload")}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
            >
              Create your first meme →
            </button>
          </div>
        )}

        <div className="space-y-6">
          {images.map((img) => {
            const isExpanded = expanded.has(img.id);
            const visibleCaptions = isExpanded ? img.captions : img.captions.slice(0, 2);

            return (
              <div key={img.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="relative md:w-72 md:flex-shrink-0 bg-zinc-800" style={{ minHeight: "200px" }}>
                    <Image
                      src={img.url}
                      alt="Your meme"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-zinc-300 text-xs px-2 py-1 rounded-full">
                      {new Date(img.created_datetime_utc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>

                  {/* Captions */}
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-zinc-200 font-semibold">
                        {img.captions.length} caption{img.captions.length !== 1 ? "s" : ""} generated
                      </h3>
                      <button
                        onClick={() => handleGenerateMore(img.id)}
                        disabled={img.generating}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {img.generating ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>✨ Generate More</>
                        )}
                      </button>
                    </div>

                    {img.captions.length === 0 ? (
                      <p className="text-zinc-600 text-sm italic">No captions yet. Generate some!</p>
                    ) : (
                      <div className="space-y-2 flex-1">
                        {visibleCaptions.map((caption) => (
                          <div key={caption.id} className="bg-zinc-800 rounded-xl px-4 py-3 flex items-start justify-between gap-3 group">
                            <p className="text-zinc-300 text-sm leading-relaxed">{caption.content}</p>
                            <span className="text-zinc-500 text-xs whitespace-nowrap mt-0.5">❤️ {caption.like_count}</span>
                          </div>
                        ))}

                        {img.captions.length > 2 && (
                          <button
                            onClick={() => toggleExpanded(img.id)}
                            className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors pt-1"
                          >
                            {isExpanded ? "Show less ↑" : `Show ${img.captions.length - 2} more ↓`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
