"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LoginModal } from "./LoginModal";
import { InteractiveHoverButton } from "./InteractiveHoverButton";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <>
      <header className="border-b border-zinc-100 bg-white/100 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-6 md:px-14">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.18em] uppercase text-zinc-900 hover:text-zinc-700"
            >
              Image Store
            </Link>
            <nav className="hidden gap-6 md:flex">
              <Link href="/about" className="text-sm text-zinc-600 hover:text-zinc-900">
                소개
              </Link>
              <Link href="/blog" className="text-sm text-zinc-600 hover:text-zinc-900">
                최근 글
              </Link>
              <Link href="/contact" className="text-sm text-zinc-600 hover:text-zinc-900">
                Contact
              </Link>
            </nav>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600">{user.email}</span>
              <InteractiveHoverButton
                type="button"
                onClick={handleLogout}
                text="로그아웃"
                className="min-w-[6rem] px-4 py-1.5"
              />
            </div>
          ) : (
            <InteractiveHoverButton
              type="button"
              onClick={() => setLoginOpen(true)}
              text="로그인"
              className="min-w-[6rem] px-5 py-2"
            />
          )}
        </div>
      </header>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => setLoginOpen(false)}
      />
    </>
  );
}
