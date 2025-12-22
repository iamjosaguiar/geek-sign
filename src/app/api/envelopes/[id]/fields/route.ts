import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeFields, envelopeRecipients, envelopeDocuments } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify envelope ownership
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, params.id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    // Get all envelope documents
    const documents = await db
      .select({ id: envelopeDocuments.id })
      .from(envelopeDocuments)
      .where(eq(envelopeDocuments.envelopeId, params.id));

    if (documents.length === 0) {
      return NextResponse.json({ fields: [] });
    }

    // Get all fields for all documents in this envelope
    const fields = await db
      .select()
      .from(envelopeFields)
      .where(
        inArray(
          envelopeFields.envelopeDocumentId,
          documents.map((d) => d.id)
        )
      );

    return NextResponse.json({ fields });
  } catch (error) {
    console.error("Get fields error:", error);
    return NextResponse.json(
      { error: "Failed to get fields" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify envelope ownership
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, params.id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      envelopeDocumentId,
      recipientId,
      type,
      page,
      xPosition,
      yPosition,
      width,
      height,
      required,
    } = body;

    if (!recipientId || !type) {
      return NextResponse.json(
        { error: "Recipient ID and type are required" },
        { status: 400 }
      );
    }

    // If no envelopeDocumentId provided, use the first document
    let documentId = envelopeDocumentId;
    if (!documentId) {
      const [firstDoc] = await db
        .select()
        .from(envelopeDocuments)
        .where(eq(envelopeDocuments.envelopeId, params.id))
        .limit(1);

      if (!firstDoc) {
        return NextResponse.json(
          { error: "No documents in envelope" },
          { status: 400 }
        );
      }
      documentId = firstDoc.id;
    }

    // Verify envelope document belongs to this envelope
    const [envelopeDoc] = await db
      .select()
      .from(envelopeDocuments)
      .where(
        and(
          eq(envelopeDocuments.id, documentId),
          eq(envelopeDocuments.envelopeId, params.id)
        )
      );

    if (!envelopeDoc) {
      return NextResponse.json(
        { error: "Document not found in envelope" },
        { status: 404 }
      );
    }

    // Verify recipient belongs to this envelope
    const [recipient] = await db
      .select()
      .from(envelopeRecipients)
      .where(
        and(
          eq(envelopeRecipients.id, recipientId),
          eq(envelopeRecipients.envelopeId, params.id)
        )
      );

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const [field] = await db
      .insert(envelopeFields)
      .values({
        envelopeDocumentId: documentId,
        recipientId,
        type,
        page: page ?? 1,
        xPosition: xPosition ?? 100,
        yPosition: yPosition ?? 100,
        width: width ?? 200,
        height: height ?? 60,
        required: required ?? true,
      })
      .returning();

    return NextResponse.json({ field });
  } catch (error) {
    console.error("Create field error:", error);
    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 }
    );
  }
}
