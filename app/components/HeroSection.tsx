"use client";

import { useState } from "react";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { InteractiveHoverButton } from "./InteractiveHoverButton";

export function HeroSection() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <section className="flex flex-1 flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-xl flex-col gap-6 md:max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Simple Photo Storage
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            당신의 사진을
            <br />
            안전하게 보관하세요.
          </h1>
          <p className="text-base leading-relaxed text-zinc-600 md:text-lg">
            어디서 찍었든, 어떤 순간이든 한 곳에 모아보세요.
            <br className="hidden md:block" />
            브라우저만 있으면 언제든지 빠르게 업로드하고 확인할 수 있어요.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <InteractiveHoverButton
              type="button"
              onClick={() => setUploadOpen(true)}
              text="갤러리에서 올리기"
              className="min-w-[10rem] px-7 py-3"
            />
            <button
              type="button"
              className="flex items-center justify-center rounded-full border border-zinc-200 px-7 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100"
            >
              갤러리 둘러보기
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>무료로 시작</span>
            <span className="h-3 w-px bg-zinc-200" />
            <span>원본 해상도 유지</span>
            <span className="h-3 w-px bg-zinc-200" />
            <span>언제 어디서나 접근 가능</span>
          </div>
        </div>

        <div className="mt-10 w-full max-w-lg md:mt-0 md:w-[460px] lg:w-[1000px]">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-1 bg-white/70 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
              <span>최근 업로드</span>
              <span>오늘</span>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-zinc-50 p-3.5">
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-200 to-zinc-300" />
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-200 to-zinc-100" />
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-300 to-zinc-200" />
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200" />
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-200 to-zinc-300" />
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-zinc-300 to-zinc-100" />
            </div>
          </div>
        </div>
      </section>

      <PhotoUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => setUploadOpen(false)}
      />
    </>
  );
}
