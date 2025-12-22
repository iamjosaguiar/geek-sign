import { auth } from "@/lib/auth";
import { db, envelopes, envelopeRecipients } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EnvelopeEditor } from "./EnvelopeEditor";

interface EnvelopeEditPageProps {
  params: { id: string };
}

export default async function EnvelopeEditPage({ params }: EnvelopeEditPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Fetch envelope
  const [envelope] = await db
    .select()
    .from(envelopes)
    .where(and(eq(envelopes.id, params.id), eq(envelopes.userId, session.user.id)))
    .limit(1);

  if (!envelope) {
    notFound();
  }

  // Fetch existing recipients
  const recipients = await db
    .select()
    .from(envelopeRecipients)
    .where(eq(envelopeRecipients.envelopeId, params.id))
    .orderBy(envelopeRecipients.routingOrder);

  return (
    <EnvelopeEditor
      envelopeId={envelope.id}
      envelopeName={envelope.name}
      initialRecipients={recipients.map((r) => ({
        id: r.id,
        name: r.name || "",
        email: r.email,
        routingOrder: r.routingOrder,
      }))}
    />
  );
}
