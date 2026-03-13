"use client";

import { useEffect, useState } from "react";
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
          <div className="text-sm font-semibold tracking-[0.18em] uppercase text-zinc-900">
            Image Store
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
