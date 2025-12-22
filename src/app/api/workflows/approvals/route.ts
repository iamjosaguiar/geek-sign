// API route for fetching user's approval requests
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvalRequests, workflowSteps, workflowExecutions, workflows, documents } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/workflows/approvals - Get current user's pending approval requests
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Find approval requests where user's email is in the approvers list
    // This requires checking the step config
    const requests = await db
      .select({
        approval: approvalRequests,
        step: {
          id: workflowSteps.id,
          stepType: workflowSteps.stepType,
          stepIndex: workflowSteps.stepIndex,
        },
        execution: {
          id: workflowExecutions.id,
          status: workflowExecutions.status,
          currentStepIndex: workflowExecutions.currentStepIndex,
        },
        workflow: {
          id: workflows.id,
          name: workflows.name,
          definition: workflows.definition,
        },
        document: {
          id: documents.id,
          title: documents.title,
        },
      })
      .from(approvalRequests)
      .innerJoin(workflowSteps, eq(approvalRequests.stepId, workflowSteps.id))
      .innerJoin(workflowExecutions, eq(workflowSteps.executionId, workflowExecutions.id))
      .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .innerJoin(documents, eq(workflowExecutions.documentId, documents.id))
      .where(eq(approvalRequests.status, status))
      .orderBy(sql`${approvalRequests.createdAt} DESC`);

    // Filter by user email in approvers list
    const userEmail = session.user.email;
    const filteredRequests = requests.filter((req) => {
      // Get step config from workflow definition
      const definition = req.workflow.definition as any;
      const steps = definition?.steps || [];
      const stepDef = steps[req.step.stepIndex];
      const approvers = stepDef?.config?.approvers || [];
      return approvers.includes(userEmail);
    });

    return NextResponse.json({
      approvals: filteredRequests,
      count: filteredRequests.length,
    });
  } catch (error) {
    console.error("Error fetching approval requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval requests" },
      { status: 500 }
    );
  }
}
