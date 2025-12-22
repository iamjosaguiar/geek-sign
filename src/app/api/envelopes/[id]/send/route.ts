import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  envelopes,
  envelopeDocuments,
  envelopeRecipients,
  envelopeFields,
  users,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  sendSignerInviteEmail,
  sendSenderDocumentSentEmail,
} from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sign.houseofgeeks.online";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get user info for email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Check if envelope has documents
    const documents = await db
      .select()
      .from(envelopeDocuments)
      .where(eq(envelopeDocuments.envelopeId, id));

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "Envelope must have at least one document" },
        { status: 400 }
      );
    }

    // Check if envelope has recipients
    const recipients = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.envelopeId, id))
      .orderBy(envelopeRecipients.routingOrder);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Envelope must have at least one recipient" },
        { status: 400 }
      );
    }

    // Check if envelope has fields
    const fields = await db
      .select()
      .from(envelopeFields)
      .where(
        eq(
          envelopeFields.envelopeDocumentId,
          documents[0].id
        )
      );

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "Envelope must have at least one field" },
        { status: 400 }
      );
    }

    // Update envelope status
    const [updatedEnvelope] = await db
      .update(envelopes)
      .set({
        status: "sent",
        currentRoutingOrder: 1, // Start with first routing order
        updatedAt: new Date(),
      })
      .where(eq(envelopes.id, id))
      .returning();

    // Log the send action
    await db.insert(auditLogs).values({
      envelopeId: id,
      action: "envelope_sent",
      details: {
        recipientCount: recipients.length,
        recipientEmails: recipients.map((r) => r.email),
        routingOrders: Array.from(new Set(recipients.map(r => r.routingOrder))),
      },
    });

    // DOCUSIGN-STYLE ROUTING: Only send to recipients with routing_order = 1
    // Others will be sent automatically when previous recipients complete
    const firstRoutingOrder = Math.min(...recipients.map(r => r.routingOrder));
    const recipientsToNotify = recipients.filter(
      (r) => r.routingOrder === firstRoutingOrder
    );

    // Update status for recipients being notified
    await Promise.all(
      recipientsToNotify.map((recipient) =>
        db
          .update(envelopeRecipients)
          .set({
            status: "sent",
            sentAt: new Date(),
          })
          .where(eq(envelopeRecipients.id, recipient.id))
      )
    );

    // Send email invitations to first routing order recipients
    const senderName = user.name || user.email;
    const emailPromises = recipientsToNotify.map((recipient) => {
      const signUrl = `${APP_URL}/sign/${recipient.signingToken}`;
      return sendSignerInviteEmail({
        signerName: recipient.name,
        signerEmail: recipient.email,
        senderName,
        documentTitle: envelope.name,
        signUrl,
        message: envelope.emailMessage || undefined,
      });
    });

    // Send confirmation to sender
    const envelopeUrl = `${APP_URL}/dashboard/envelopes/${envelope.id}`;
    emailPromises.push(
      sendSenderDocumentSentEmail({
        senderName,
        senderEmail: user.email,
        documentTitle: envelope.name,
        recipientCount: recipients.length,
        recipientEmails: recipients.map((r) => r.email),
        documentUrl: envelopeUrl,
      })
    );

    // Wait for all emails to be sent (don't fail if emails fail)
    const emailResults = await Promise.allSettled(emailPromises);
    const successfulEmails = emailResults.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const failedEmails = emailResults.length - successfulEmails;

    if (failedEmails > 0) {
      console.warn(`${failedEmails} emails failed to send for envelope ${id}`);
    }

    return NextResponse.json({
      envelope: updatedEnvelope,
      recipients,
      recipientsNotified: recipientsToNotify.length,
      totalRecipients: recipients.length,
      message: recipientsToNotify.length < recipients.length
        ? `Envelope sent - ${recipientsToNotify.length} of ${recipients.length} recipients notified (sequential routing)`
        : "Envelope sent for signing",
      emailsSent: successfulEmails,
      emailsFailed: failedEmails,
    });
  } catch (error) {
    console.error("Send envelope error:", error);
    return NextResponse.json(
      { error: "Failed to send envelope" },
      { status: 500 }
    );
  }
}
