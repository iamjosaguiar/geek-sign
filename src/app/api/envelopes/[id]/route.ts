import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeDocuments, envelopeRecipients, envelopeFields } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    // Get envelope documents
    const documents = await db
      .select()
      .from(envelopeDocuments)
      .where(eq(envelopeDocuments.envelopeId, id))
      .orderBy(envelopeDocuments.orderIndex);

    // Get recipients
    const recipients = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.envelopeId, id))
      .orderBy(envelopeRecipients.routingOrder);

    // Get fields for all documents
    const fields = await db
      .select()
      .from(envelopeFields)
      .where(
        eq(
          envelopeFields.envelopeDocumentId,
          db.select({ id: envelopeDocuments.id })
            .from(envelopeDocuments)
            .where(eq(envelopeDocuments.envelopeId, id))
            .limit(1)
        )
      );

    return NextResponse.json({
      envelope,
      documents,
      recipients,
      fields,
    });
  } catch (error) {
    console.error("Get envelope error:", error);
    return NextResponse.json(
      { error: "Failed to get envelope" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, status, emailSubject, emailMessage } = body;

    const [envelope] = await db
      .update(envelopes)
      .set({
        ...(name && { name }),
        ...(status && { status }),
        ...(emailSubject !== undefined && { emailSubject }),
        ...(emailMessage !== undefined && { emailMessage }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      )
      .returning();

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    return NextResponse.json({ envelope });
  } catch (error) {
    console.error("Update envelope error:", error);
    return NextResponse.json(
      { error: "Failed to update envelope" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [envelope] = await db
      .delete(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      )
      .returning();

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete envelope error:", error);
    return NextResponse.json(
      { error: "Failed to delete envelope" },
      { status: 500 }
    );
  }
}
