import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeRecipients, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendSignerInviteEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sign.houseofgeeks.online";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info for email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify envelope ownership and status
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, params.id), eq(envelopes.userId, session.user.id))
      );

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    if (envelope.status !== "sent" && envelope.status !== "in_progress") {
      return NextResponse.json(
        { error: "Can only resend emails for sent or in-progress envelopes" },
        { status: 400 }
      );
    }

    // DOCUSIGN-STYLE: Only resend to recipients at current routing order who haven't completed
    const recipientsToResend = await db
      .select()
      .from(envelopeRecipients)
      .where(
        and(
          eq(envelopeRecipients.envelopeId, params.id),
          eq(envelopeRecipients.routingOrder, envelope.currentRoutingOrder)
        )
      );

    // Filter to only those who haven't completed
    const pendingRecipients = recipientsToResend.filter(
      (r) => r.status !== "completed" && r.status !== "declined"
    );

    if (pendingRecipients.length === 0) {
      return NextResponse.json(
        { error: "All recipients at current routing order have already completed or declined" },
        { status: 400 }
      );
    }

    // Send email invitations to pending recipients
    const senderName = user.name || user.email;
    const emailPromises = pendingRecipients.map((recipient) => {
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

    // Wait for all emails to be sent
    const emailResults = await Promise.allSettled(emailPromises);
    const successfulEmails = emailResults.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const failedEmails = emailResults.length - successfulEmails;

    if (failedEmails > 0) {
      console.warn(`${failedEmails} emails failed to send for envelope ${params.id}`);
    }

    return NextResponse.json({
      message: `Emails resent to routing order ${envelope.currentRoutingOrder}`,
      currentRoutingOrder: envelope.currentRoutingOrder,
      emailsSent: successfulEmails,
      emailsFailed: failedEmails,
    });
  } catch (error) {
    console.error("Resend emails error:", error);
    return NextResponse.json(
      { error: "Failed to resend emails" },
      { status: 500 }
    );
  }
}
