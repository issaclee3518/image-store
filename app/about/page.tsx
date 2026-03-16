import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Image Store",
  description: "About Image Store: simple, fast photo storage and image hosting for everyone.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">About</h1>
        <p className="mt-2 text-sm text-zinc-500">Image Store</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700">
          <p>
            Image Store is a simple, fast photo storage and image hosting service.
            We help you upload, organize, and access your images from any device
            with a browser—no app required.
          </p>
          <p>
            Our goal is to make it easy to keep your photos in one place and to
            share them when you want. You can create categories, store images at
            full resolution, and use our workflow tool to turn photo slideshows
            into short videos with optional background music.
          </p>
          <p>
            We focus on clarity and reliability: straightforward uploads, clear
            organization, and secure sign-in so your images stay under your
            control. Whether you use Image Store for personal backups, blog
            assets, or small projects, we aim to keep the experience simple and
            dependable.
          </p>
          <p>
            If you have questions or feedback, please see our{" "}
            <Link href="/contact" className="text-zinc-900 underline hover:no-underline">
              Contact
            </Link>{" "}
            page.
          </p>
        </div>

        <p className="mt-12">
          <Link href="/" className="text-sm font-medium text-zinc-600 underline hover:no-underline">
            ← Home
          </Link>
        </p>
      </div>
    </div>
  );
}
