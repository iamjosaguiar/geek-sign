import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, session.user.id));

    return NextResponse.json({ count: result?.count || 0 });
  } catch (error) {
    console.error("Error counting documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
