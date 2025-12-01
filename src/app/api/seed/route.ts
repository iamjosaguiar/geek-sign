import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

// This is a one-time seed endpoint - should be removed after use
export async function GET(request: Request) {
  // Simple security - require a secret key
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== process.env.NEXTAUTH_SECRET?.slice(0, 16)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const password = await bcrypt.hash("GeekSign2024!", 12);

    const usersToCreate = [
      {
        email: "jos@profitgeeks.com.au",
        name: "Jos",
        password,
        plan: "free" as const,
      },
      {
        email: "admin@ambrit.com.au",
        name: "Admin",
        password,
        plan: "free" as const,
      },
    ];

    const results = [];

    for (const user of usersToCreate) {
      try {
        const result = await db
          .insert(users)
          .values(user)
          .onConflictDoNothing()
          .returning({ id: users.id, email: users.email });

        if (result.length > 0) {
          results.push({ email: user.email, status: "created" });
        } else {
          results.push({ email: user.email, status: "already exists" });
        }
      } catch (error) {
        results.push({ email: user.email, status: "error", error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: "Users seeded. Default password: GeekSign2024!"
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
