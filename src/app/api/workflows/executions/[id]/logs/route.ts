import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowSteps, workflowExecutions, workflows } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/workflows/executions/[id]/logs - Get execution logs
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify execution ownership
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

    // Get workflow steps for this execution
    const steps = await db.query.workflowSteps.findMany({
      where: eq(workflowSteps.executionId, params.id),
      orderBy: [desc(workflowSteps.createdAt)],
    });

    // Format steps as logs - using template literals
    const logs = steps.map((step) => {
      const level = step.status === "failed" ? "error" : step.status === "completed" ? "info" : "info";
      const message = "Step " + (step.stepIndex + 1) + ": " + step.stepType + " - " + step.status;

      return {
        id: step.id,
        executionId: step.executionId,
        stepIndex: step.stepIndex,
        stepId: step.stepType,
        level: level,
        message: message,
        data: step.result,
        createdAt: step.createdAt,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching execution logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution logs" },
      { status: 500 }
    );
  }
}
