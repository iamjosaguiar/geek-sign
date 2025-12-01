import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find team where user is owner
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.ownerId, session.user.id))
      .limit(1);

    if (!team) {
      // Return empty members if no team exists
      return NextResponse.json({ members: [] });
    }

    // Fetch team members with user details
    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        user: {
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, team.id));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
