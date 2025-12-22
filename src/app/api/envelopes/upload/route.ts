import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envelopes, envelopeDocuments } from "@/lib/db/schema";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "No name provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Upload file to Vercel Blob
    const blob = await put(`envelopes/${session.user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: "application/pdf",
    });

    // Create envelope record in database
    const [envelope] = await db
      .insert(envelopes)
      .values({
        userId: session.user.id,
        name: name.trim(),
        status: "draft",
      })
      .returning();

    // Create envelope document record
    const [envelopeDocument] = await db
      .insert(envelopeDocuments)
      .values({
        envelopeId: envelope.id,
        fileUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
        orderIndex: 1, // First document in envelope
      })
      .returning();

    return NextResponse.json({
      envelope,
      document: envelopeDocument,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
