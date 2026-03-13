"use client";

import { HeroSection } from "./HeroSection";

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-10 md:px-12 md:py-16">
      <HeroSection />

      <section className="mt-16 grid gap-8 border-t border-zinc-100 pt-10 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">간편 업로드</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            드래그 앤 드롭으로 한 번에 여러 장의 사진을 업로드할 수 있도록
            설계할 예정이에요.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">정리와 검색</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            앨범과 태그로 사진을 정리하고, 날짜나 키워드로 빠르게 찾아볼 수
            있도록 만들 예정입니다.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">공유 기능</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            링크 한 번으로 가족, 친구와 앨범을 공유할 수 있는 기능도
            준비하고 있어요.
          </p>
        </div>
      </section>
    </main>
  );
}
