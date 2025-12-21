// API route for executing workflows
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { db, workflows, documents } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { workflowExecutor } from "@/lib/workflow";

// POST /api/workflows/[id]/execute - Start workflow execution
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, variables = {} } = body;

    // Validate required fields
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Check if workflow exists and belongs to user
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, params.id),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.status !== "active") {
      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to user
    const document = await db.query.documents.findFirst({
      where: and(
        eq(documents.id, documentId),
        eq(documents.userId, session.user.id)
      ),
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Start workflow execution
    const executionId = await workflowExecutor.startExecution(
      params.id,
      documentId,
      session.user.id,
      variables
    );

    return NextResponse.json({
      executionId,
      message: "Workflow execution started",
    });
  } catch (error) {
    console.error("Error executing workflow:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute workflow" },
      { status: 500 }
    );
  }
}
