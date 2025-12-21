// API route for approval responses
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

import { db, approvalRequests, workflowSteps } from "@/lib/db";
import { eq } from "drizzle-orm";
import { workflowExecutor } from "@/lib/workflow";

// POST /api/workflows/approvals/[id]/respond - Respond to approval request
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
    const { decision, comment } = body;

    // Validate decision
    if (!decision || !["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "Decision must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Check if approval request exists
    const approvalRequest = await db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.id, params.id),
      with: {
        step: {
          with: {
            execution: {
              with: {
                workflow: true,
              },
            },
          },
        },
      },
    });

    if (!approvalRequest) {
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 }
      );
    }

    // Check if approval is still pending
    if (approvalRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Approval request is already ${approvalRequest.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (
      approvalRequest.expiresAt &&
      new Date() > approvalRequest.expiresAt
    ) {
      return NextResponse.json(
        { error: "Approval request has expired" },
        { status: 400 }
      );
    }

    // TODO: Verify user is authorized to approve (check approvers list in step config)
    // For now, allow any authenticated user

    // Process approval response
    await workflowExecutor.processApprovalResponse(
      params.id,
      session.user.id,
      decision,
      comment
    );

    // Get updated approval status
    const status = await workflowExecutor.checkApprovalStatus(params.id);

    return NextResponse.json({
      message: `Approval ${decision}`,
      approvalStatus: status,
    });
  } catch (error) {
    console.error("Error processing approval response:", error);

    // Handle specific error messages
    if (error instanceof Error) {
      if (error.message.includes("already responded")) {
        return NextResponse.json(
          { error: "You have already responded to this approval request" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process approval response" },
      { status: 500 }
    );
  }
}
