import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/workflows/executions/[id]/pause - Pause execution
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

    if (execution.status !== "running") {
      return NextResponse.json(
        { error: "Only running executions can be paused" },
        { status: 400 }
      );
    }

    // Update status to paused
    await db
      .update(workflowExecutions)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(workflowExecutions.id, params.id));

    return NextResponse.json({ message: "Execution paused successfully" });
  } catch (error) {
    console.error("Error pausing execution:", error);
    return NextResponse.json(
      { error: "Failed to pause execution" },
      { status: 500 }
    );
  }
}
