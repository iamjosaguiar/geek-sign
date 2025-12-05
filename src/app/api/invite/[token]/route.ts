import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamInvitations, teams, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

// GET - Get invitation details by token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.token, params.token),
          eq(teamInvitations.status, "pending"),
          gt(teamInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Get team and inviter info
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, invitation.teamId))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, invitation.invitedBy))
      .limit(1);

    return NextResponse.json({
      teamName: team?.name || "Team",
      inviterName: inviter?.name,
      inviterEmail: inviter?.email,
      email: invitation.email,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to load invitation" },
      { status: 500 }
    );
  }
}
