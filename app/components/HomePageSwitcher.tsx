"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Dashboard } from "./Dashboard";
import { LandingPage } from "./LandingPage";

export function HomePageSwitcher() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="text-zinc-500">로딩 중…</span>
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
}
