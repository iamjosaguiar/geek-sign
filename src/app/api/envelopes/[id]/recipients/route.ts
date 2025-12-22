import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeRecipients } from "@/lib/db/schema";
import { eq, and, max } from "drizzle-orm";

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

    const recipients = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.envelopeId, params.id))
      .orderBy(envelopeRecipients.routingOrder);

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("Get recipients error:", error);
    return NextResponse.json(
      { error: "Failed to get recipients" },
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
    const { email, name, routingOrder, action } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // If routingOrder not provided, add to end
    let finalRoutingOrder = routingOrder;
    if (!finalRoutingOrder) {
      const [result] = await db
        .select({ maxOrder: max(envelopeRecipients.routingOrder) })
        .from(envelopeRecipients)
        .where(eq(envelopeRecipients.envelopeId, params.id));

      finalRoutingOrder = (result?.maxOrder ?? 0) + 1;
    }

    const [recipient] = await db
      .insert(envelopeRecipients)
      .values({
        envelopeId: params.id,
        email: email.trim(),
        name: name?.trim() || null,
        routingOrder: finalRoutingOrder,
        action: action || "needs_to_sign",
        status: "pending",
      })
      .returning();

    return NextResponse.json({ recipient });
  } catch (error) {
    console.error("Create recipient error:", error);
    return NextResponse.json(
      { error: "Failed to create recipient" },
      { status: 500 }
    );
  }
}
