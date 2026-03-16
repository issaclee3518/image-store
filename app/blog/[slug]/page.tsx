import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/lib/blog-posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post | Image Store" };
  return {
    title: `${post.title} | Image Store`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{post.description}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700">
          {post.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <p className="mt-12">
          <Link
            href="/blog"
            className="text-sm font-medium text-zinc-600 underline hover:no-underline"
          >
            ← All posts
          </Link>
        </p>
      </article>
    </div>
  );
}
