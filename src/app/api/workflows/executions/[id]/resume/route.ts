import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/workflows/executions/[id]/resume - Resume execution
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

    if (execution.status !== "paused") {
      return NextResponse.json(
        { error: "Only paused executions can be resumed" },
        { status: 400 }
      );
    }

    // Update status to running
    await db
      .update(workflowExecutions)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(workflowExecutions.id, params.id));

    // TODO: Resume workflow execution in background job

    return NextResponse.json({ message: "Execution resumed successfully" });
  } catch (error) {
    console.error("Error resuming execution:", error);
    return NextResponse.json(
      { error: "Failed to resume execution" },
      { status: 500 }
    );
  }
}
