import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, recipients, documentFields } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify document ownership
    const [document] = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.id, params.id), eq(documents.userId, session.user.id))
      );

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if document has recipients
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

    // Check if document has fields
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

    // Update document status to pending
    const [updatedDocument] = await db
      .update(documents)
      .set({
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id))
      .returning();

    // TODO: Send email notifications to recipients
    // For now, we'll just update the status
    // In a real implementation, you would:
    // 1. Generate unique signing links for each recipient
    // 2. Send email notifications with the signing links
    // 3. Track email delivery status

    return NextResponse.json({
      document: updatedDocument,
      recipients: documentRecipients,
      message: "Document sent for signing",
    });
  } catch (error) {
    console.error("Send document error:", error);
    return NextResponse.json(
      { error: "Failed to send document" },
      { status: 500 }
    );
  }
}
