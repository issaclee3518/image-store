import { Suspense } from "react";
import { HomePageSwitcher } from "./components/HomePageSwitcher";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><span className="text-zinc-500">로딩 중…</span></div>}>
        <HomePageSwitcher />
      </Suspense>
    </div>
  );
}
