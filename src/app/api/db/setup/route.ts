import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// One-time database setup endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== "geeksign-setup-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        email_verified TIMESTAMP,
        image TEXT,
        password TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        company_name TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create accounts table (for OAuth)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounts (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        PRIMARY KEY (provider, provider_account_id)
      )
    `);

    // Create sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP NOT NULL
      )
    `);

    // Create verification_tokens table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMP NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `);

    // Create teams table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create team_members table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create documents table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id),
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        page_count INTEGER,
        status TEXT NOT NULL DEFAULT 'draft',
        custom_message TEXT,
        expires_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create recipients table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        signing_token UUID NOT NULL DEFAULT gen_random_uuid(),
        signed_at TIMESTAMP,
        viewed_at TIMESTAMP,
        ip_address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create document_fields table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        page INTEGER NOT NULL DEFAULT 1,
        x_position INTEGER NOT NULL,
        y_position INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        required BOOLEAN NOT NULL DEFAULT true,
        value TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create templates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id),
        name TEXT NOT NULL,
        description TEXT,
        file_url TEXT,
        fields JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create audit_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES recipients(id),
        action TEXT NOT NULL,
        ip_address TEXT,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully!",
    });
  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
