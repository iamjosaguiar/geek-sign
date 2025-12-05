import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

// POST - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find valid invitation
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

    // Get current user's email
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Check if the invitation email matches the logged-in user
    // (case-insensitive comparison)
    if (
      user?.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
        },
        { status: 403 }
      );
    }

    // Check if user is already a team member
    const [existingMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, invitation.teamId),
          eq(teamMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingMember) {
      // Mark invitation as accepted anyway
      await db
        .update(teamInvitations)
        .set({ status: "accepted" })
        .where(eq(teamInvitations.id, invitation.id));

      return NextResponse.json({ success: true, alreadyMember: true });
    }

    // Add user to team
    await db.insert(teamMembers).values({
      teamId: invitation.teamId,
      userId: session.user.id,
      role: "member",
    });

    // Mark invitation as accepted
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.id, invitation.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
