import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows, documents } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/workflows/executions - List all workflow executions for user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all executions with workflow and document details
    const userExecutions = await db
      .select({
        execution: workflowExecutions,
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
      .from(workflowExecutions)
      .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .innerJoin(documents, eq(workflowExecutions.documentId, documents.id))
      .where(eq(workflows.userId, session.user.id))
      .orderBy(desc(workflowExecutions.createdAt));

    // Format the response
    const executions = userExecutions.map((row) => ({
      ...row.execution,
      workflow: row.workflow,
      document: row.document,
    }));

    return NextResponse.json({
      executions,
      count: executions.length,
    });
  } catch (error) {
    console.error("Error fetching workflow executions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow executions" },
      { status: 500 }
    );
  }
}
