import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Image Store",
  description: "Image Store 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-zinc-500">최종 업데이트: 2025년 3월</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">1. 수집하는 정보</h2>
            <p className="mt-2">
              Image Store는 서비스 제공을 위해 로그인 시 이메일 주소, 프로필 정보를 수집할 수 있으며, 업로드한 사진은 저장 및 표시 목적으로 처리됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">2. Google 광고 및 데이터 수집</h2>
            <p className="mt-2">
              본 사이트에는 Google 애드센스(Google AdSense)를 통해 제3자 광고가 게재될 수 있습니다. Google 및 파트너사는 방문자에게 맞춤 광고를 제공하기 위해 쿠키를 사용할 수 있습니다.
            </p>
            <p className="mt-2">
              웹사이트에 게재된 광고로 인해 제3자(Google 등)가 사용자의 브라우저에 쿠키를 삽입하거나 읽을 수 있으며, 웹 비콘 또는 IP 주소 등을 통해 정보를 수집할 수 있습니다. Google에서 데이터를 사용하는 방식은{" "}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-900 underline hover:no-underline"
              >
                Google 파트너 사이트의 데이터 사용
              </a>
              에서 확인할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">3. 쿠키</h2>
            <p className="mt-2">
              쿠키, 웹 비콘, IP 주소 또는 기타 식별자의 사용과 같이 이용된 기술에 대한 정보를 포함하여, Google 제품 및 서비스를 사용한 결과로 발생하는 데이터 수집·공유·이용에 대해 위 내용을 공개합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">4. 정보 이용</h2>
            <p className="mt-2">
              수집된 정보는 서비스 제공, 개선, 고객 지원 및 법적 의무 이행에 사용됩니다. Google 광고 관련 데이터는 Google의 개인정보처리방침에 따라 처리됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">5. 문의</h2>
            <p className="mt-2">
              개인정보처리방침에 대한 문의는 사이트 운영자에게 연락해 주세요.
            </p>
          </section>
        </div>

        <p className="mt-12">
          <Link href="/" className="text-sm font-medium text-zinc-600 underline hover:no-underline">
            ← 메인으로
          </Link>
        </p>
      </div>
    </div>
  );
}
