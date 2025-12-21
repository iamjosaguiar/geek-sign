// API routes for workflow management
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, workflows } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

// GET /api/workflows - List all workflows for user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWorkflows = await db.query.workflows.findMany({
      where: eq(workflows.userId, session.user.id),
      orderBy: [desc(workflows.createdAt)],
    });

    return NextResponse.json({
      workflows: userWorkflows,
      count: userWorkflows.length,
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create new workflow
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, definition, teamId } = body;

    // Validate required fields
    if (!name || !definition) {
      return NextResponse.json(
        { error: "Name and definition are required" },
        { status: 400 }
      );
    }

    // Validate definition structure
    if (!definition.steps || !Array.isArray(definition.steps)) {
      return NextResponse.json(
        { error: "Definition must contain steps array" },
        { status: 400 }
      );
    }

    // Create workflow
    const [workflow] = await db
      .insert(workflows)
      .values({
        userId: session.user.id,
        teamId: teamId || null,
        name,
        description: description || null,
        definition,
        status: "active",
        version: "1.0.0",
      })
      .returning();

    return NextResponse.json({
      workflow,
      message: "Workflow created successfully",
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
