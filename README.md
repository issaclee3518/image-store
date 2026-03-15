This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Cloudflare Pages

이 프로젝트는 `@cloudflare/next-on-pages`로 Cloudflare Pages에 배포할 수 있습니다. 빌드가 성공하려면 **빌드 시 환경 변수**를 설정하세요.

1. Cloudflare 대시보드 → Pages → 해당 프로젝트 → **Settings** → **Environment variables**
2. **Build** 환경에 다음 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - (선택) `JAMENDO_CLIENT_ID` — 영상 BGM 사용 시

`NEXT_PUBLIC_*` 값은 빌드 시 클라이언트 번들에 포함되므로, 배포 후 로그인·스토리지가 동작하려면 반드시 Build 환경 변수로 설정해야 합니다.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Jamendo BGM (영상 제작)

영상 제작 워크플로에서 BGM을 넣으려면 [Jamendo Developer](https://developer.jamendo.com/)에서 앱을 등록한 뒤 **Client ID**를 발급받아 `.env.local`에 추가하세요:

```bash
JAMENDO_CLIENT_ID=your_client_id
```

설정하지 않으면 BGM 검색/선택은 동작하지 않으며, 영상 다운로드는 기존처럼 음원 없이 가능합니다.
