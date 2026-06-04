import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, recipients, documentFields, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { documentAccessClause, getUserTeamIds } from "@/lib/db/team-access";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sign.houseofgeeks.online";

/**
 * Activate a document for signing WITHOUT emailing the recipients.
 *
 * Flips the document to "pending" (which makes each recipient's
 * /sign/<token> link live) and returns those links so the sender can
 * share them directly. No invitation emails are sent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify document access (owner or team member)
    const teamIds = await getUserTeamIds(session.user.id);
    const [document] = await db
      .select()
      .from(documents)
      .where(documentAccessClause(params.id, session.user.id, teamIds));

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Must have at least one recipient
    const documentRecipients = await db
      .select()
      .from(recipients)
      .where(eq(recipients.documentId, params.id));

    if (documentRecipients.length === 0) {
      return NextResponse.json(
        { error: "Document must have at least one recipient" },
        { status: 400 }
      );
    }

    // Must have at least one field
    const fields = await db
      .select()
      .from(documentFields)
      .where(eq(documentFields.documentId, params.id));

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "Document must have at least one field" },
        { status: 400 }
      );
    }

    // Only draft documents can be activated; pending docs are already live.
    if (document.status !== "draft" && document.status !== "pending") {
      return NextResponse.json(
        { error: "Only draft documents can be activated for signing" },
        { status: 400 }
      );
    }

    // Flip to pending if it isn't already — this makes the signing links live.
    if (document.status === "draft") {
      await db
        .update(documents)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(documents.id, params.id));

      await db.insert(auditLogs).values({
        documentId: params.id,
        action: "document_sent",
        details: {
          method: "link",
          recipientCount: documentRecipients.length,
          recipientEmails: documentRecipients.map((r) => r.email),
        },
      });
    }

    const links = documentRecipients
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((r) => ({
        recipientId: r.id,
        name: r.name,
        email: r.email,
        url: `${APP_URL}/sign/${r.signingToken}`,
      }));

    return NextResponse.json({
      message: "Document activated for signing",
      links,
    });
  } catch (error) {
    console.error("Activate document error:", error);
    return NextResponse.json(
      { error: "Failed to activate document" },
      { status: 500 }
    );
  }
}
