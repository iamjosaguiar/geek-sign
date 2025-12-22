import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  envelopes,
  envelopeDocuments,
  envelopeRecipients,
  envelopeFields,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

    // Get the envelope
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(
        and(eq(envelopes.id, id), eq(envelopes.userId, session.user.id))
      )
      .limit(1);

    if (!envelope) {
      return NextResponse.json({ error: "Envelope not found" }, { status: 404 });
    }

    // Check if envelope is completed
    if (envelope.status !== "completed") {
      return NextResponse.json(
        { error: "Envelope is not fully signed yet" },
        { status: 400 }
      );
    }

    // Get all documents in the envelope
    const documents = await db
      .select()
      .from(envelopeDocuments)
      .where(eq(envelopeDocuments.envelopeId, id))
      .orderBy(envelopeDocuments.orderIndex);

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No documents in envelope" },
        { status: 404 }
      );
    }

    // Get all recipients and fields
    const recipients = await db
      .select()
      .from(envelopeRecipients)
      .where(eq(envelopeRecipients.envelopeId, id));

    const fields = await db
      .select()
      .from(envelopeFields)
      .where(
        inArray(
          envelopeFields.envelopeDocumentId,
          documents.map((d) => d.id)
        )
      );

    // For now, handle single document case
    // TODO: Add ZIP file support for multiple documents
    if (documents.length > 1) {
      return NextResponse.json(
        { error: "Multi-document download not yet supported. Please download documents individually." },
        { status: 501 }
      );
    }

    const document = documents[0];

    // Get fields for this document
    const documentFields = fields.filter(
      (f) => f.envelopeDocumentId === document.id
    );

    // Fetch the original PDF
    const pdfResponse = await fetch(document.fileUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch original document" },
        { status: 500 }
      );
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // PDF dimensions helper
    const getPageDimensions = (pageIndex: number) => {
      const page = pages[pageIndex];
      return {
        width: page.getWidth(),
        height: page.getHeight(),
      };
    };

    // Process each field and add to PDF
    for (const field of documentFields) {
      if (!field.value) continue;

      const pageIndex = (field.page || 1) - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { height: pageHeight } = getPageDimensions(pageIndex);

      // Convert from top-left coordinates (UI) to bottom-left (PDF)
      const pdfY = pageHeight - field.yPosition - field.height;

      if (field.type === "signature" || field.type === "initial") {
        // Draw signature/initial as image (base64 data URL)
        try {
          if (field.value.startsWith("data:image/png;base64,")) {
            const imageData = field.value.split(",")[1];
            const imageBytes = Uint8Array.from(atob(imageData), (c) =>
              c.charCodeAt(0)
            );
            const image = await pdfDoc.embedPng(imageBytes);

            page.drawImage(image, {
              x: field.xPosition,
              y: pdfY,
              width: field.width,
              height: field.height,
            });
          }
        } catch (error) {
          console.error("Error embedding signature:", error);
        }
      } else if (field.type === "date" || field.type === "text") {
        // Draw text field
        const fontSize = Math.min(field.height * 0.6, 14);
        page.drawText(field.value, {
          x: field.xPosition + 5,
          y: pdfY + field.height / 2 - fontSize / 3,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      } else if (field.type === "checkbox") {
        // Draw checkbox
        const isChecked = field.value === "true" || field.value === "checked";
        if (isChecked) {
          // Draw checkmark
          page.drawText("✓", {
            x: field.xPosition + 2,
            y: pdfY + 2,
            size: field.height * 0.8,
            font: helveticaBold,
            color: rgb(0, 0, 0),
          });
        }
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Log download action
    await db.insert(auditLogs).values({
      envelopeId: id,
      action: "envelope_downloaded",
      details: {
        documentCount: documents.length,
        recipientCount: recipients.length,
      },
    });

    // Return the PDF as a download
    return new NextResponse(Buffer.from(modifiedPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${envelope.name}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download envelope" },
      { status: 500 }
    );
  }
}
