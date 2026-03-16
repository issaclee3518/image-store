import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Image Store",
  description: "Image Store terms of service and use.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="text-2xl font-semibold text-zinc-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: March 2025</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">1. Acceptance</h2>
            <p className="mt-2">
              By using Image Store (“Service”), you agree to these Terms of
              Service. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">2. Use of the Service</h2>
            <p className="mt-2">
              You may use the Service to upload, store, organize, and share
              images in accordance with these terms and our Privacy Policy. You
              are responsible for the content you upload and must not use the
              Service for illegal or infringing material, or in a way that
              harms others or the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">3. Your Content</h2>
            <p className="mt-2">
              You retain ownership of the content you upload. By uploading, you
              grant us the rights necessary to operate the Service (e.g.,
              storing, displaying, and delivering your images to you and to
              those you choose to share with). We do not sell your content to
              third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">4. Acceptable Use</h2>
            <p className="mt-2">
              You may not use the Service to distribute malware, spam, or
              content that violates laws or third-party rights. We may suspend
              or terminate access if we reasonably believe you have violated
              these terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">5. Availability and Changes</h2>
            <p className="mt-2">
              We strive to keep the Service available but do not guarantee
              uninterrupted access. We may change features or these terms with
              notice where appropriate. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">6. Limitation of Liability</h2>
            <p className="mt-2">
              The Service is provided “as is.” To the extent permitted by law,
              we are not liable for indirect, incidental, or consequential
              damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">7. Contact</h2>
            <p className="mt-2">
              For questions about these terms, please see our{" "}
              <Link href="/contact" className="text-zinc-900 underline hover:no-underline">
                Contact
              </Link>{" "}
              page.
            </p>
          </section>
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
