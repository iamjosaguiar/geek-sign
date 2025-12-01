import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "jos@profitgeeks.com.au";
  const password = searchParams.get("password") || "GeekSign2024!";

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found", email });
    }

    if (!user.password) {
      return NextResponse.json({ error: "User has no password", userId: user.id });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      userFound: true,
      userId: user.id,
      hasPassword: !!user.password,
      passwordMatch,
      passwordLength: user.password.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
