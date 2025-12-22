import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  documents,
  recipients,
  documentFields,
  envelopes,
  envelopeRecipients,
  envelopeFields,
  envelopeDocuments,
  users,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  sendSignerCompletedEmail,
  sendSenderDocumentSignedEmail,
  sendSenderDocumentCompletedEmail,
} from "@/lib/email";
import { advanceEnvelopeRouting } from "@/lib/envelope-routing";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sign.houseofgeeks.online";

interface FieldUpdate {
  id: string;
  value: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { fields } = await request.json() as { fields: FieldUpdate[] };

    // Try to find recipient in envelopes first (new system)
    const [envelopeRecipient] = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.signingToken, params.token));

    if (envelopeRecipient) {
      // NEW: Envelope-based signing with routing
      return await handleEnvelopeSigning(request, envelopeRecipient, fields);
    }

    // Fall back to old document system (for backward compatibility)
    const [recipient] = await db
      .select()
      .from(recipients)
      .where(eq(recipients.signingToken, params.token));

    if (!recipient) {
      return NextResponse.json(
        { error: "Invalid signing link" },
        { status: 404 }
      );
    }

    if (recipient.status === "signed") {
      return NextResponse.json(
        { error: "Document has already been signed" },
        { status: 400 }
      );
    }

    // Verify ESIGN consent was given
    if (!recipient.consentGiven) {
      return NextResponse.json(
        { error: "ESIGN consent is required before signing" },
        { status: 400 }
      );
    }

    // Get document
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, recipient.documentId));

    if (!document || document.status === "draft") {
      return NextResponse.json(
        { error: "Document not available for signing" },
        { status: 400 }
      );
    }

    // Get IP address and user agent for audit log
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Update field values
    for (const field of fields) {
      if (field.value) {
        await db
          .update(documentFields)
          .set({ value: field.value })
          .where(
            and(
              eq(documentFields.id, field.id),
              eq(documentFields.recipientId, recipient.id)
            )
          );
      }
    }

    // Update recipient status
    await db
      .update(recipients)
      .set({
        status: "signed",
        signedAt: new Date(),
        ipAddress,
      })
      .where(eq(recipients.id, recipient.id));

    // Log the signing with full audit trail
    await db.insert(auditLogs).values({
      documentId: document.id,
      recipientId: recipient.id,
      action: "document_signed",
      ipAddress,
      details: {
        recipientEmail: recipient.email,
        fieldsCompleted: fields.filter((f) => f.value).length,
        userAgent,
        consentTimestamp: recipient.consentTimestamp,
        signedAt: new Date().toISOString(),
      },
    });

    // Check if all recipients have signed
    const allRecipients = await db
      .select()
      .from(recipients)
      .where(eq(recipients.documentId, document.id));

    const unsignedRecipients = allRecipients.filter((r) => r.status !== "signed");
    const allSigned = unsignedRecipients.length === 0;

    // Get sender info
    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, document.userId));

    const documentUrl = `${APP_URL}/dashboard/documents/${document.id}`;

    // Send confirmation to signer
    await sendSignerCompletedEmail({
      signerName: recipient.name,
      signerEmail: recipient.email,
      documentTitle: document.title,
    });

    if (sender) {
      if (allSigned) {
        // All recipients have signed - mark document as completed
        await db
          .update(documents)
          .set({
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(documents.id, document.id));

        // Log completion
        await db.insert(auditLogs).values({
          documentId: document.id,
          action: "document_completed",
          details: {
            totalRecipients: allRecipients.length,
          },
        });

        // Send completion email to sender
        await sendSenderDocumentCompletedEmail({
          senderName: sender.name || sender.email,
          senderEmail: sender.email,
          documentTitle: document.title,
          documentUrl,
        });
      } else {
        // Notify sender that this recipient signed
        await sendSenderDocumentSignedEmail({
          senderName: sender.name || sender.email,
          senderEmail: sender.email,
          documentTitle: document.title,
          signerName: recipient.name,
          signerEmail: recipient.email,
          remainingSigners: unsignedRecipients.length,
          documentUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Document signed successfully",
      documentCompleted: allSigned,
    });
  } catch (error) {
    console.error("Complete signing error:", error);
    return NextResponse.json(
      { error: "Failed to complete signing" },
      { status: 500 }
    );
  }
}

// NEW: Handle envelope-based signing with DocuSign-style routing
async function handleEnvelopeSigning(
  request: NextRequest,
  recipient: typeof envelopeRecipients.$inferSelect,
  fields: FieldUpdate[]
) {
  if (recipient.status === "completed") {
    return NextResponse.json(
      { error: "Envelope has already been signed" },
      { status: 400 }
    );
  }

  if (!recipient.consentGiven) {
    return NextResponse.json(
      { error: "ESIGN consent is required before signing" },
      { status: 400 }
    );
  }

  // Get envelope
  const [envelope] = await db
    .select()
    .from(envelopes)
    .where(eq(envelopes.id, recipient.envelopeId));

  if (!envelope || envelope.status === "draft" || envelope.status === "voided") {
    return NextResponse.json(
      { error: "Envelope not available for signing" },
      { status: 400 }
    );
  }

  // Check routing order - recipient can only sign if it's their turn
  if (recipient.routingOrder !== envelope.currentRoutingOrder) {
    return NextResponse.json(
      { error: "It's not your turn to sign yet. Please wait for previous signers to complete." },
      { status: 403 }
    );
  }

  // Get IP address and user agent for audit log
  const ipAddress = request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Update field values
  for (const field of fields) {
    if (field.value) {
      await db
        .update(envelopeFields)
        .set({ value: field.value })
        .where(
          and(
            eq(envelopeFields.id, field.id),
            eq(envelopeFields.recipientId, recipient.id)
          )
        );
    }
  }

  // Update recipient status
  await db
    .update(envelopeRecipients)
    .set({
      status: "completed",
      completedAt: new Date(),
      ipAddress,
    })
    .where(eq(envelopeRecipients.id, recipient.id));

  // Log the signing
  await db.insert(auditLogs).values({
    envelopeId: envelope.id,
    envelopeRecipientId: recipient.id,
    action: "envelope_signed",
    ipAddress,
    details: {
      recipientEmail: recipient.email,
      routingOrder: recipient.routingOrder,
      fieldsCompleted: fields.filter((f) => f.value).length,
      userAgent,
      consentTimestamp: recipient.consentTimestamp,
      signedAt: new Date().toISOString(),
    },
  });

  // Send confirmation to signer
  await sendSignerCompletedEmail({
    signerName: recipient.name,
    signerEmail: recipient.email,
    documentTitle: envelope.name,
  });

  // CRITICAL: Advance routing order (DocuSign-style automatic progression)
  const routingResult = await advanceEnvelopeRouting(envelope.id);

  // Get sender info for notification
  const [sender] = await db
    .select()
    .from(users)
    .where(eq(users.id, envelope.userId));

  const envelopeUrl = `${APP_URL}/dashboard/envelopes/${envelope.id}`;

  if (sender) {
    if (routingResult.completed) {
      // Envelope fully completed
      await sendSenderDocumentCompletedEmail({
        senderName: sender.name || sender.email,
        senderEmail: sender.email,
        documentTitle: envelope.name,
        documentUrl: envelopeUrl,
      });
    } else {
      // This recipient signed, but more recipients remain
      await sendSenderDocumentSignedEmail({
        senderName: sender.name || sender.email,
        senderEmail: sender.email,
        documentTitle: envelope.name,
        signerName: recipient.name,
        signerEmail: recipient.email,
        remainingSigners: routingResult.newRoutingOrder
          ? `Routing order ${routingResult.newRoutingOrder} notified`
          : "unknown",
        documentUrl: envelopeUrl,
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Envelope signed successfully",
    envelopeCompleted: routingResult.completed || false,
    routingAdvanced: routingResult.success,
    nextRoutingOrder: routingResult.newRoutingOrder,
  });
}
