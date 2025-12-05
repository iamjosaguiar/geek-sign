import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, documents } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { isSuperAdmin } from "@/lib/plan-limits";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const isAdmin = await isSuperAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all users with document counts
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        isSuperAdmin: users.isSuperAdmin,
        companyName: users.companyName,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get document counts for each user
    const userDocCounts = await db
      .select({
        userId: documents.userId,
        totalDocs: count(documents.id),
      })
      .from(documents)
      .groupBy(documents.userId);

    const docCountMap = new Map(
      userDocCounts.map((d) => [d.userId, d.totalDocs])
    );

    const usersWithStats = allUsers.map((user) => ({
      ...user,
      documentCount: docCountMap.get(user.id) || 0,
    }));

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
