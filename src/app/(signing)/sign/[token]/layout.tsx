import type { Metadata } from "next";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { documents, recipients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// The signing page itself is a client component and can't export metadata, so
// this server layout owns the link-preview card for /sign/[token]. Naming the
// sender ("Why Solar sent you a document to sign") makes the card the recipient
// pastes into iMessage / WhatsApp / email read as theirs, instead of the generic
// Geek Sign marketing card the deep link would otherwise inherit.
//
// It names only the SENDER — never the document title or recipient — because a
// preview is visible to anyone the link is forwarded to.

const GENERIC_TITLE = "You've been sent a document to sign";
const DESCRIPTION =
  "Review and sign your document securely online — no account needed.";

// signing_token is a uuid column; querying it with a non-uuid string throws.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function senderDisplayName(token: string): Promise<string | null> {
  if (!UUID_RE.test(token)) return null;
  try {
    const [recipient] = await db
      .select({ documentId: recipients.documentId })
      .from(recipients)
      .where(eq(recipients.signingToken, token))
      .limit(1);
    if (!recipient) return null;

    const [document] = await db
      .select({ senderDisplayName: documents.senderDisplayName })
      .from(documents)
      .where(eq(documents.id, recipient.documentId))
      .limit(1);

    const name = document?.senderDisplayName?.trim();
    return name ? name : null;
  } catch {
    // A preview lookup must never break the signing page — fall back to generic.
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const sender = await senderDisplayName(params.token);
  const title = sender ? `${sender} sent you a document to sign` : GENERIC_TITLE;

  return {
    // `absolute` bypasses the root "%s | Geek Sign" title template.
    title: { absolute: title },
    description: DESCRIPTION,
    openGraph: {
      type: "website",
      siteName: "Geek Sign",
      title,
      description: DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title,
      description: DESCRIPTION,
    },
    // Private, tokenised page — keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

export default function SignTokenLayout({ children }: { children: ReactNode }) {
  return children;
}
