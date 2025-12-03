import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipients, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Find recipient by signing token
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

    // Get IP address and user agent
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Update recipient with consent info
    await db
      .update(recipients)
      .set({
        consentGiven: true,
        consentTimestamp: new Date(),
        consentIpAddress: ipAddress,
        userAgent,
      })
      .where(eq(recipients.id, recipient.id));

    // Log the consent action
    await db.insert(auditLogs).values({
      documentId: recipient.documentId,
      recipientId: recipient.id,
      action: "esign_consent_given",
      ipAddress,
      details: {
        recipientEmail: recipient.email,
        userAgent,
        consentVersion: "1.0",
        disclosuresAccepted: [
          "ESIGN Act disclosure",
          "Electronic signature consent",
          "Terms of Service",
          "Privacy Policy",
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Consent recorded",
    });
  } catch (error) {
    console.error("Record consent error:", error);
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 }
    );
  }
}
