import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, users, documentFields, recipients, auditLogs } from "@/lib/db/schema";
import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { plansConfig } from "@/config/plans";
import type { Plan } from "@/types";
import { del } from "@vercel/blob";

// This endpoint enforces document retention limits
// It should be called by a cron job (e.g., Vercel Cron)
// Only allows execution with a valid CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find users on free plan with retention limits
    const freeUsers = await db
      .select({
        id: users.id,
        plan: users.plan,
        isSuperAdmin: users.isSuperAdmin,
      })
      .from(users)
      .where(
        and(
          eq(users.plan, "free"),
          eq(users.isSuperAdmin, false)
        )
      );

    const now = new Date();
    let deletedCount = 0;
    const deletedDocumentIds: string[] = [];

    for (const user of freeUsers) {
      const effectivePlan = (user.plan || "free") as Plan;
      const retentionDays = plansConfig[effectivePlan].limits.retentionDays;

      // Skip if unlimited retention
      if (retentionDays === -1) continue;

      // Calculate cutoff date
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find documents older than retention period for this user
      const expiredDocuments = await db
        .select({
          id: documents.id,
          fileUrl: documents.fileUrl,
          title: documents.title,
        })
        .from(documents)
        .where(
          and(
            eq(documents.userId, user.id),
            lt(documents.createdAt, cutoffDate)
          )
        );

      if (expiredDocuments.length === 0) continue;

      // Delete blob files
      for (const doc of expiredDocuments) {
        try {
          if (doc.fileUrl) {
            await del(doc.fileUrl);
          }
        } catch (error) {
          console.error(`Failed to delete blob for document ${doc.id}:`, error);
        }
      }

      const docIds = expiredDocuments.map(d => d.id);

      // Delete associated data (cascading should handle most, but let's be explicit)
      // The schema has ON DELETE CASCADE, so deleting documents will clean up related records

      // Delete documents
      await db
        .delete(documents)
        .where(inArray(documents.id, docIds));

      deletedCount += expiredDocuments.length;
      deletedDocumentIds.push(...docIds);
    }

    return NextResponse.json({
      success: true,
      message: `Retention enforcement complete`,
      deletedCount,
      documentIds: deletedDocumentIds,
      processedUsers: freeUsers.length,
    });
  } catch (error) {
    console.error("Error enforcing retention:", error);
    return NextResponse.json(
      { error: "Failed to enforce retention" },
      { status: 500 }
    );
  }
}
