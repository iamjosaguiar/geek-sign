// API routes for workflow execution operations
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { db, workflowExecutions, workflows } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET /api/workflows/executions/[id] - Get execution details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, params.id),
      with: {
        workflow: true,
        document: true,
        steps: {
          orderBy: (steps, { asc }) => [asc(steps.stepIndex)],
          with: {
            approvalRequest: {
              with: {
                responses: {
                  with: {
                    approver: {
                      columns: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Check if user owns the workflow
    if (execution.workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error("Error fetching execution:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution" },
      { status: 500 }
    );
  }
}
