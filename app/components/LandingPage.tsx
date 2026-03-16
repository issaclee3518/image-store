"use client";

import Link from "next/link";
import { HeroSection } from "./HeroSection";
import { blogPosts } from "@/lib/blog-posts";

export function LandingPage() {
  const recentPosts = [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pt-16 pb-10 md:px-10 md:pt-24 md:pb-16">
      {/* 1. Hero — 서비스 소개 (아래 섹션은 스크롤해야 보임) */}
      <div className="min-h-[85vh] flex flex-col justify-center">
        <HeroSection />
      </div>

      {/* 2. 서비스 설명 */}
      <section className="mt-20 border-t border-zinc-100 pt-14">
        <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl">
          Image Store란?
        </h2>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-700 md:text-base">
          <p>
            Image Store는 웹 브라우저만 있으면 누구나 사용할 수 있는 무료 이미지 저장·호스팅 서비스입니다.
            스마트폰으로 찍은 사진, 작업용 스크린샷, 블로그나 SNS에 올릴 이미지를 한곳에 모아 두고
            카테고리별로 정리할 수 있습니다. 별도 앱 설치 없이 로그인 후 바로 업로드하고,
            언제 어디서나 내 사진에 접근할 수 있습니다.
          </p>
          <p>
            개인 사용자부터 블로거, 소규모 팀까지, 이미지를 안전하게 보관하고 필요할 때 빠르게 꺼내 쓰고 싶은 분들을 위해 만들었습니다.
            원본 해상도를 유지한 채 저장할 수 있으며, 업로드한 사진으로 슬라이드 영상을 만드는 워크플로우 기능도 제공합니다.
          </p>
          <p>
            서비스 이용을 위해 회원가입(이메일 또는 소셜 로그인)이 필요합니다. 가입 후 제공되는 저장 공간 안에서
            자유롭게 사진을 업로드·정리·다운로드할 수 있고, 외부에 공개되지 않으며 본인만 접근할 수 있습니다.
          </p>
        </div>
      </section>

      {/* 3. 기능 설명 */}
      <section className="mt-20 border-t border-zinc-100 pt-14">
        <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl">
          제공 기능
        </h2>
        <ul className="mt-8 space-y-10">
          <li>
            <h3 className="text-base font-semibold text-zinc-900">
              사진 업로드 및 저장
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">
              드래그 앤 드롭 또는 파일 선택으로 여러 장의 사진을 한 번에 업로드할 수 있습니다.
              지원 포맷은 JPG, PNG, WebP 등 일반적인 이미지 형식이며, 원본 해상도로 저장됩니다.
              업로드된 사진은 자동으로 목록에 추가되며, 카테고리를 만들어 폴더처럼 구분해 관리할 수 있습니다.
            </p>
          </li>
          <li>
            <h3 className="text-base font-semibold text-zinc-900">
              카테고리로 정리
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">
              업로드한 이미지를 카테고리(앨범) 단위로 묶어 관리할 수 있습니다.
              여행 사진, 작업 자료, 블로그용 이미지처럼 용도나 주제별로 나누어 두면 나중에 찾기 쉽습니다.
              카테고리는 언제든 추가·수정·삭제할 수 있으며, 한 장의 사진을 여러 카테고리에 넣어 두는 방식도 가능합니다.
            </p>
          </li>
          <li>
            <h3 className="text-base font-semibold text-zinc-900">
              슬라이드 영상 제작(워크플로우)
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">
              저장된 사진을 순서대로 배치해 짧은 슬라이드 영상을 만들 수 있는 워크플로우를 제공합니다.
              노드를 연결해 이미지 순서를 정하고, 전환 효과와 재생 시간을 적용한 뒤 BGM(저작권 프리 음악)을 넣어
              WebM 또는 MP4 파일로 다운로드할 수 있습니다. SNS용 짧은 영상이나 간단한 포트폴리오 영상 제작에 적합합니다.
            </p>
          </li>
          <li>
            <h3 className="text-base font-semibold text-zinc-900">
              안전한 보관 및 접근
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">
              업로드된 이미지는 로그인한 본인만 볼 수 있으며, 외부에 공개되지 않습니다.
              데이터는 안정적인 클라우드 환경에 저장되며, 브라우저가 있는 PC·태블릿·스마트폰 어디서든
              동일한 계정으로 접속해 사진을 확인하거나 다운로드할 수 있습니다.
            </p>
          </li>
        </ul>
      </section>

      {/* 4. 사용 방법 */}
      <section className="mt-20 border-t border-zinc-100 pt-14">
        <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl">
          사용 방법
        </h2>
        <div className="mt-8 space-y-8">
          <div className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              1
            </span>
            <div>
              <h3 className="font-semibold text-zinc-900">회원가입 및 로그인</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                상단의 로그인 버튼을 누른 뒤, 이메일 또는 Google 계정으로 가입·로그인합니다.
                로그인하면 메인 대시보드로 이동하며, 여기서 사진 업로드와 카테고리 관리를 할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              2
            </span>
            <div>
              <h3 className="font-semibold text-zinc-900">카테고리 만들기(선택)</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                대시보드에서 새 카테고리를 만들 수 있습니다. 카테고리 이름을 정한 뒤 생성하면,
                업로드한 사진을 해당 카테고리에 넣어 체계적으로 정리할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              3
            </span>
            <div>
              <h3 className="font-semibold text-zinc-900">사진 업로드</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                메인에서 사진 올리기 버튼을 누르거나, 대시보드의 업로드 기능을 사용해 이미지를 추가합니다.
                선택한 파일이 서버에 업로드되며, 목록에 바로 반영됩니다. 필요하면 카테고리를 지정해 분류할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
              4
            </span>
            <div>
              <h3 className="font-semibold text-zinc-900">영상 제작(선택)</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                저장된 사진으로 슬라이드 영상을 만들려면 영상 제작 버튼을 눌러 워크플로우 화면으로 이동합니다.
                노드에 이미지를 배치하고 순서를 연결한 뒤, BGM을 선택하고 WebM 또는 MP4로 제작·다운로드하면 됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 최근 글 / 가이드 링크 */}
      <section className="mt-20 border-t border-zinc-100 pt-14">
        <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl">
          최근 글 · 가이드
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          이미지 호스팅, 저장, 포맷, 압축, 공유 방법 등에 대한 가이드 글을 블로그에서 확인할 수 있습니다.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-xl border border-zinc-100 p-4 transition hover:border-zinc-200 hover:bg-zinc-50/80"
              >
                <h3 className="font-medium text-zinc-900">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                  {post.description}
                </p>
                <span className="mt-2 inline-block text-xs text-zinc-400">
                  {new Date(post.date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-zinc-700 underline hover:no-underline"
          >
            전체 글 보기 →
          </Link>
        </p>
      </section>
    </main>
  );
}
