import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeRecipients, envelopeFields } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; recipientId: string } }
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

    const [recipient] = await db
      .select()
      .from(envelopeRecipients)
      .where(
        and(
          eq(envelopeRecipients.id, params.recipientId),
          eq(envelopeRecipients.envelopeId, params.id)
        )
      );

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ recipient });
  } catch (error) {
    console.error("Get recipient error:", error);
    return NextResponse.json(
      { error: "Failed to get recipient" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; recipientId: string } }
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
    const { email, name, routingOrder, action, status } = body;

    const [recipient] = await db
      .update(envelopeRecipients)
      .set({
        ...(email && { email: email.trim() }),
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(routingOrder !== undefined && { routingOrder }),
        ...(action && { action }),
        ...(status && { status }),
      })
      .where(
        and(
          eq(envelopeRecipients.id, params.recipientId),
          eq(envelopeRecipients.envelopeId, params.id)
        )
      )
      .returning();

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ recipient });
  } catch (error) {
    console.error("Update recipient error:", error);
    return NextResponse.json(
      { error: "Failed to update recipient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; recipientId: string } }
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

    // Delete associated fields first (cascade should handle this, but being explicit)
    await db
      .delete(envelopeFields)
      .where(eq(envelopeFields.recipientId, params.recipientId));

    // Delete recipient
    const [recipient] = await db
      .delete(envelopeRecipients)
      .where(
        and(
          eq(envelopeRecipients.id, params.recipientId),
          eq(envelopeRecipients.envelopeId, params.id)
        )
      )
      .returning();

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recipient error:", error);
    return NextResponse.json(
      { error: "Failed to delete recipient" },
      { status: 500 }
    );
  }
}
