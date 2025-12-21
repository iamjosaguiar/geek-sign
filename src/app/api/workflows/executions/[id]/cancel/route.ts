import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/workflows/executions/[id]/cancel - Cancel execution
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

    if (execution.status === "completed" || execution.status === "failed") {
      return NextResponse.json(
        { error: "Cannot cancel completed or failed executions" },
        { status: 400 }
      );
    }

    // Update status to failed with cancellation message
    await db
      .update(workflowExecutions)
      .set({
        status: "failed",
        errorMessage: "Execution cancelled by user",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, params.id));

    return NextResponse.json({ message: "Execution cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling execution:", error);
    return NextResponse.json(
      { error: "Failed to cancel execution" },
      { status: 500 }
    );
  }
}
