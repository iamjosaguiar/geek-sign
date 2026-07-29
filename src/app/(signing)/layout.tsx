import type { Metadata } from "next";
import Link from "next/link";

// Signing links get pasted straight into iMessage / WhatsApp / email, where the
// preview card is scraped from these tags. This layout wraps every /sign/[token]
// page (a client component, which can't export metadata of its own), so without
// this the deep link inherits the marketing homepage's
// "Free E-Signatures | DocuSign Alternative" title — which reads like spam next
// to a real agreement, and looks disconnected from the link the client pasted.
//
// Kept deliberately generic: the preview card is visible to anyone the link is
// forwarded to, so it names no document, sender, or recipient.
export const metadata: Metadata = {
  // `absolute` bypasses the root "%s | Geek Sign" title template.
  title: { absolute: "You've been sent a document to sign" },
  description:
    "Review and sign your document securely online — no account needed.",
  openGraph: {
    type: "website",
    siteName: "Geek Sign",
    title: "You've been sent a document to sign",
    description:
      "Review and sign your document securely online — no account needed.",
  },
  twitter: {
    card: "summary",
    title: "You've been sent a document to sign",
    description:
      "Review and sign your document securely online — no account needed.",
  },
  // Private, tokenised pages — keep them out of search engines.
  robots: { index: false, follow: false },
};

export default function SigningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Simple Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">G</span>
            </div>
            <span className="text-base font-semibold">Geek Sign</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Secure Document Signing
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Simple Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container py-4">
          <p className="text-xs text-center text-muted-foreground">
            Powered by Geek Sign • Legally Compliant Electronic Signatures •{" "}
            <a href="/terms" className="hover:underline">Terms</a> •{" "}
            <a href="/privacy" className="hover:underline">Privacy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
