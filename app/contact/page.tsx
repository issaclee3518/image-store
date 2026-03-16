import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | Image Store",
  description: "Contact Image Store for support, feedback, or inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">Contact</h1>
        <p className="mt-2 text-sm text-zinc-500">Get in touch</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700">
          <p>
            For support, feedback, or general inquiries about Image Store, please
            reach out via the email address associated with your account or the
            contact method provided in the app or marketing materials.
          </p>
          <p>
            We do our best to respond to messages in a timely manner. If your
            question is about privacy or data handling, you may also refer to our{" "}
            <Link href="/privacy" className="text-zinc-900 underline hover:no-underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            For legal or terms-related matters, see our{" "}
            <Link href="/terms" className="text-zinc-900 underline hover:no-underline">
              Terms of Service
            </Link>
            .
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
