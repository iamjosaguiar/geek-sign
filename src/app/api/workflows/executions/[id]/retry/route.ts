import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { workflowExecutor } from "@/lib/workflow/executor";

// POST /api/workflows/executions/[id]/retry - Retry failed execution
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify execution ownership and status
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, params.id),
      with: {
        workflow: {
          columns: { userId: true },
        },
      },
    });

    if (!execution || execution.workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    if (execution.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed executions can be retried" },
        { status: 400 }
      );
    }

    // Start a new execution with the same workflow and document
    const newExecutionId = await workflowExecutor.startExecution(
      execution.workflowId,
      execution.documentId,
      session.user.id,
      execution.context || {}
    );

    return NextResponse.json({
      executionId: newExecutionId,
      message: "Execution retry started successfully",
    });
  } catch (error) {
    console.error("Error retrying execution:", error);
    return NextResponse.json(
      { error: "Failed to retry execution" },
      { status: 500 }
    );
  }
}
