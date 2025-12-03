import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlanLimits } from "@/lib/plan-limits";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limits = await getUserPlanLimits(session.user.id);

    return NextResponse.json(limits);
  } catch (error) {
    console.error("Error fetching plan limits:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan limits" },
      { status: 500 }
    );
  }
}
