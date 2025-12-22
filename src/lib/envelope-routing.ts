import { db } from "@/lib/db";
import { envelopes, envelopeRecipients, users, auditLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSignerInviteEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sign.houseofgeeks.online";

/**
 * DocuSign-style Automatic Routing
 *
 * Checks if all recipients at current routing order have completed.
 * If so, sends notifications to next routing order recipients.
 * If all routing orders complete, marks envelope as completed.
 *
 * @param envelopeId - The envelope to check routing for
 * @returns Object with status and message
 */
export async function advanceEnvelopeRouting(envelopeId: string) {
  try {
    // Get envelope
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(eq(envelopes.id, envelopeId))
      .limit(1);

    if (!envelope) {
      return { success: false, message: "Envelope not found" };
    }

    if (envelope.status === "completed" || envelope.status === "voided") {
      return { success: false, message: "Envelope already completed or voided" };
    }

    // Get all recipients at current routing order
    const currentRecipients = await db
      .select()
      .from(envelopeRecipients)
      .where(
        and(
          eq(envelopeRecipients.envelopeId, envelopeId),
          eq(envelopeRecipients.routingOrder, envelope.currentRoutingOrder)
        )
      );

    if (currentRecipients.length === 0) {
      return { success: false, message: "No recipients at current routing order" };
    }

    // Check if all have completed (or declined)
    const allCompleted = currentRecipients.every(
      (r) => r.status === "completed" || r.status === "declined"
    );

    if (!allCompleted) {
      // Not all recipients at current order have completed
      return {
        success: false,
        message: "Waiting for all recipients at current routing order to complete",
      };
    }

    // Get all recipients to find next routing order
    const allRecipients = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.envelopeId, envelopeId))
      .orderBy(envelopeRecipients.routingOrder);

    // Find next routing order
    const nextRoutingOrder = allRecipients.find(
      (r) => r.routingOrder > envelope.currentRoutingOrder
    )?.routingOrder;

    if (!nextRoutingOrder) {
      // All routing orders complete - mark envelope as completed
      await db
        .update(envelopes)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(envelopes.id, envelopeId));

      // Log completion
      await db.insert(auditLogs).values({
        envelopeId,
        action: "envelope_completed",
        details: {
          allRecipientsCompleted: true,
        },
      });

      return {
        success: true,
        message: "Envelope completed - all recipients have signed",
        completed: true,
      };
    }

    // Get recipients at next routing order
    const nextRecipients = allRecipients.filter(
      (r) => r.routingOrder === nextRoutingOrder
    );

    if (nextRecipients.length === 0) {
      return { success: false, message: "No recipients at next routing order" };
    }

    // Get envelope owner for email
    const [owner] = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, envelope.userId))
      .limit(1);

    if (!owner) {
      return { success: false, message: "Envelope owner not found" };
    }

    // Update envelope to next routing order
    await db
      .update(envelopes)
      .set({
        currentRoutingOrder: nextRoutingOrder,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(envelopes.id, envelopeId));

    // Update recipient statuses
    await Promise.all(
      nextRecipients.map((r) =>
        db
          .update(envelopeRecipients)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(envelopeRecipients.id, r.id))
      )
    );

    // Send email notifications
    const senderName = owner.name || owner.email;
    const emailPromises = nextRecipients.map((recipient) => {
      const signUrl = `${APP_URL}/sign/${recipient.signingToken}`;
      return sendSignerInviteEmail({
        signerEmail: recipient.email,
        signerName: recipient.name,
        senderName,
        documentTitle: envelope.name,
        signUrl,
        message: envelope.emailMessage || undefined,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successfulEmails = emailResults.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    // Log routing advancement
    await db.insert(auditLogs).values({
      envelopeId,
      action: "routing_advanced",
      details: {
        fromRoutingOrder: envelope.currentRoutingOrder,
        toRoutingOrder: nextRoutingOrder,
        recipientsNotified: successfulEmails,
      },
    });

    return {
      success: true,
      message: `Advanced to routing order ${nextRoutingOrder}`,
      newRoutingOrder: nextRoutingOrder,
      recipientsNotified: successfulEmails,
    };
  } catch (error) {
    console.error("Error advancing envelope routing:", error);
    return {
      success: false,
      message: "Failed to advance routing",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a specific recipient can sign based on routing order
 *
 * @param recipientId - The recipient ID
 * @returns boolean - true if recipient can sign now
 */
export async function canRecipientSign(recipientId: string): Promise<boolean> {
  const [recipient] = await db
    .select()
    .from(envelopeRecipients)
    .where(eq(envelopeRecipients.id, recipientId))
    .limit(1);

  if (!recipient) return false;

  const [envelope] = await db
    .select()
    .from(envelopes)
    .where(eq(envelopes.id, recipient.envelopeId))
    .limit(1);

  if (!envelope) return false;

  // Can sign if:
  // 1. Envelope is sent or in_progress
  // 2. Recipient's routing order matches current routing order
  // 3. Recipient status is sent or viewed (not already completed/declined)
  return (
    (envelope.status === "sent" || envelope.status === "in_progress") &&
    recipient.routingOrder === envelope.currentRoutingOrder &&
    (recipient.status === "sent" || recipient.status === "viewed")
  );
}
