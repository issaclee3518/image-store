import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog | Image Store",
  description:
    "Guides and tips on image hosting, storage, formats, and sharing. Free image hosting, PNG vs JPG vs WebP, compression, and best practices.",
};

export default function BlogPage() {
  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">Blog</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tips and guides on image hosting, storage, and sharing.
        </p>

        <ul className="mt-10 space-y-6">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-lg border border-zinc-100 p-4 transition hover:border-zinc-200 hover:bg-zinc-50/50"
              >
                <h2 className="font-medium text-zinc-900">{post.title}</h2>
                <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                  {post.description}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 underline hover:no-underline"
          >
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
