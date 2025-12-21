// API routes for individual workflow operations
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { db, workflows } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET /api/workflows/[id] - Get specific workflow
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, params.id),
        eq(workflows.userId, session.user.id)
      ),
      with: {
        executions: {
          limit: 10,
          orderBy: (executions, { desc }) => [desc(executions.createdAt)],
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

// PATCH /api/workflows/[id] - Update workflow
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, definition, status } = body;

    // Check if workflow exists and belongs to user
    const existing = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, params.id),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (definition !== undefined) {
      // Validate definition structure
      if (!definition.steps || !Array.isArray(definition.steps)) {
        return NextResponse.json(
          { error: "Definition must contain steps array" },
          { status: 400 }
        );
      }
      updates.definition = definition;
    }
    if (status !== undefined) {
      if (!["active", "inactive", "deleted"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    // Update workflow
    const [workflow] = await db
      .update(workflows)
      .set(updates)
      .where(eq(workflows.id, params.id))
      .returning();

    return NextResponse.json({
      workflow,
      message: "Workflow updated successfully",
    });
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if workflow exists and belongs to user
    const existing = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, params.id),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting status to deleted
    await db
      .update(workflows)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(workflows.id, params.id));

    return NextResponse.json({
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
