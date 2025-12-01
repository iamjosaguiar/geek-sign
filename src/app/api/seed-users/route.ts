import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const password = await bcrypt.hash("GeekSign2024!", 12);

    const usersToCreate = [
      {
        email: "jos@profitgeeks.com.au",
        name: "Jos",
        password,
        plan: "free",
      },
      {
        email: "admin@ambrit.com.au",
        name: "Admin",
        password,
        plan: "free",
      },
    ];

    const results = [];
    for (const user of usersToCreate) {
      try {
        await db.insert(users).values(user).onConflictDoNothing();
        results.push({ email: user.email, status: "created" });
      } catch (error) {
        results.push({ email: user.email, status: "error", error: String(error) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
