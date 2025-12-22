import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { put, del } from "@vercel/blob";

// GET single template
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

    const [template] = await db
      .select()
      .from(templates)
      .where(
        and(eq(templates.id, id), eq(templates.userId, session.user.id))
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [existingTemplate] = await db
      .select()
      .from(templates)
      .where(
        and(eq(templates.id, id), eq(templates.userId, session.user.id))
      )
      .limit(1);

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;
    const fieldsJson = formData.get("fields") as string | null;

    const updates: Partial<typeof templates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description || null;

    if (file) {
      // Delete old file if exists
      // Note: Templates now use documents JSON field, old fileUrl field may not exist
      const templateWithFileUrl = existingTemplate as unknown as { fileUrl?: string };
      if (templateWithFileUrl.fileUrl) {
        try {
          await del(templateWithFileUrl.fileUrl);
        } catch {
          // Ignore delete errors
        }
      }

      // Upload new file
      const blob = await put(`templates/${session.user.id}/${file.name}`, file, {
        access: "public",
      });
      // Note: This updates the old fileUrl field for backward compatibility
      // In the new system, this should update documents JSON instead
      (updates as { fileUrl?: string }).fileUrl = blob.url;
    }

    if (fieldsJson) {
      try {
        // Note: Templates now use documents JSON with embedded fields
        // This updates the old fields property for backward compatibility
        (updates as { fields?: unknown }).fields = JSON.parse(fieldsJson);
      } catch {
        return NextResponse.json(
          { error: "Invalid fields JSON" },
          { status: 400 }
        );
      }
    }

    const [updatedTemplate] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and get template
    const [template] = await db
      .select()
      .from(templates)
      .where(
        and(eq(templates.id, id), eq(templates.userId, session.user.id))
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete file from blob storage if exists
    // Note: Templates now use documents JSON field, old fileUrl field may not exist
    const templateWithFileUrl = template as unknown as { fileUrl?: string };
    if (templateWithFileUrl.fileUrl) {
      try {
        await del(templateWithFileUrl.fileUrl);
      } catch {
        // Ignore delete errors
      }
    }

    // Delete from database
    await db.delete(templates).where(eq(templates.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
