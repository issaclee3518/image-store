"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { WorkflowBuilder } from "../components/WorkflowBuilder";

export default function WorkflowPage() {
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
  }, [supabase.auth]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-zinc-500">로딩 중…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
        <p className="text-center text-zinc-600">영상 제작을 사용하려면 로그인해 주세요.</p>
        <Link
          href="/"
          className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return <WorkflowBuilder userId={user.id} />;
}
