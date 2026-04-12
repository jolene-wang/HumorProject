"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const links = [
    { href: "/", label: "🏠 Home" },
    { href: "/vote", label: "🗳️ Vote" },
    { href: "/upload", label: "📸 Create" },
    { href: "/history", label: "📋 My Votes" },
  ];

  return (
    <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-1">
        <span
          className="text-xl font-black text-zinc-900 dark:text-zinc-50 cursor-pointer mr-6 tracking-tight"
          onClick={() => router.push("/")}
        >
          😂 Almost Crackd
        </span>
        {links.map(({ href, label }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={handleSignOut}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
      >
        Sign out
      </button>
    </nav>
  );
}
