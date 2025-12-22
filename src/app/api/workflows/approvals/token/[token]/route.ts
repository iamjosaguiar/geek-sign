// API route for token-based approval
import { NextResponse } from "next/server";
import { db, approvalTokens, approvalRequests, workflowSteps, workflowExecutions, workflows, documents } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { workflowExecutor } from "@/lib/workflow";

// POST /api/workflows/approvals/token/[token] - Process approval via email token
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Find the approval token
    const tokenResult = await db
      .select()
      .from(approvalTokens)
      .where(eq(approvalTokens.token, params.token))
      .limit(1);

    if (tokenResult.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired approval link" },
        { status: 404 }
      );
    }

    const token = tokenResult[0];

    // Check if token is already used
    if (token.used) {
      return NextResponse.json(
        { error: "This approval link has already been used" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > token.expiresAt) {
      return NextResponse.json(
        { error: "This approval link has expired" },
        { status: 400 }
      );
    }

    // Get approval request details
    const approvalRequest = await db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.id, token.requestId),
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 }
      );
    }

    // Check if approval request is still pending
    if (approvalRequest.status !== "pending") {
      return NextResponse.json(
        { error: `This approval request is already ${approvalRequest.status}` },
        { status: 400 }
      );
    }

    // Get workflow and document details for response
    const step = await db.query.workflowSteps.findFirst({
      where: eq(workflowSteps.id, approvalRequest.stepId),
    });

    if (!step) {
      return NextResponse.json(
        { error: "Step not found" },
        { status: 404 }
      );
    }

    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, step.executionId),
    });

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, execution.workflowId),
    });

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, execution.documentId),
    });

    // Process the approval response
    await workflowExecutor.processApprovalResponse(
      token.requestId,
      token.approverId,
      token.decision as "approved" | "rejected",
      "Approved via email"
    );

    // Mark token as used
    await db
      .update(approvalTokens)
      .set({ used: true })
      .where(eq(approvalTokens.id, token.id));

    return NextResponse.json({
      message: `You have ${token.decision} this request`,
      decision: token.decision,
      workflowName: workflow?.name || "Unknown Workflow",
      documentTitle: document?.title || "Unknown Document",
    });
  } catch (error) {
    console.error("Error processing token approval:", error);

    if (error instanceof Error) {
      if (error.message.includes("already responded")) {
        return NextResponse.json(
          { error: "You have already responded to this approval request" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
