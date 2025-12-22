import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeFields, envelopeDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fieldId } = await params;

    // Verify envelope ownership
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    // Get field and verify it belongs to a document in this envelope
    const [field] = await db
      .select({
        id: envelopeFields.id,
        envelopeDocumentId: envelopeFields.envelopeDocumentId,
        recipientId: envelopeFields.recipientId,
        type: envelopeFields.type,
        page: envelopeFields.page,
        xPosition: envelopeFields.xPosition,
        yPosition: envelopeFields.yPosition,
        width: envelopeFields.width,
        height: envelopeFields.height,
        required: envelopeFields.required,
        value: envelopeFields.value,
        createdAt: envelopeFields.createdAt,
      })
      .from(envelopeFields)
      .innerJoin(
        envelopeDocuments,
        eq(envelopeFields.envelopeDocumentId, envelopeDocuments.id)
      )
      .where(
        and(
          eq(envelopeFields.id, fieldId),
          eq(envelopeDocuments.envelopeId, id)
        )
      );

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json({ field });
  } catch (error) {
    console.error("Get field error:", error);
    return NextResponse.json(
      { error: "Failed to get field" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fieldId } = await params;

    // Verify envelope ownership
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, page, xPosition, yPosition, width, height, required, value } = body;

    // Verify field belongs to this envelope via join
    const [existingField] = await db
      .select({ id: envelopeFields.id })
      .from(envelopeFields)
      .innerJoin(
        envelopeDocuments,
        eq(envelopeFields.envelopeDocumentId, envelopeDocuments.id)
      )
      .where(
        and(
          eq(envelopeFields.id, fieldId),
          eq(envelopeDocuments.envelopeId, id)
        )
      );

    if (!existingField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const [field] = await db
      .update(envelopeFields)
      .set({
        ...(type && { type }),
        ...(page !== undefined && { page }),
        ...(xPosition !== undefined && { xPosition }),
        ...(yPosition !== undefined && { yPosition }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(required !== undefined && { required }),
        ...(value !== undefined && { value }),
      })
      .where(eq(envelopeFields.id, fieldId))
      .returning();

    return NextResponse.json({ field });
  } catch (error) {
    console.error("Update field error:", error);
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fieldId } = await params;

    // Verify envelope ownership
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    // Verify field belongs to this envelope via join
    const [existingField] = await db
      .select({ id: envelopeFields.id })
      .from(envelopeFields)
      .innerJoin(
        envelopeDocuments,
        eq(envelopeFields.envelopeDocumentId, envelopeDocuments.id)
      )
      .where(
        and(
          eq(envelopeFields.id, fieldId),
          eq(envelopeDocuments.envelopeId, id)
        )
      );

    if (!existingField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const [field] = await db
      .delete(envelopeFields)
      .where(eq(envelopeFields.id, fieldId))
      .returning();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete field error:", error);
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    );
  }
}
