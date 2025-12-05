import { db } from "@/lib/db";
import { users, templates, documents } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { plansConfig, type PlanConfig } from "@/config/plans";
import type { Plan } from "@/types";

export interface PlanLimits {
  plan: Plan;
  planConfig: PlanConfig;
  isSuperAdmin: boolean;
  templates: {
    used: number;
    limit: number;
    canCreate: boolean;
  };
  teamMembers: {
    limit: number;
    canInvite: boolean;
  };
  features: {
    smsEnabled: boolean;
    customBranding: boolean;
    resizeFields: boolean;
    notifyOnOpen: boolean;
    customMessages: boolean;
  };
  retention: {
    days: number;
    unlimited: boolean;
  };
}

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  // Get user with plan
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const isSuperAdmin = user.isSuperAdmin ?? false;
  // Super admins get team plan features for free
  const effectivePlan = isSuperAdmin ? "team" : (user.plan || "free") as Plan;
  const planConfig = plansConfig[effectivePlan];

  // Count user's templates
  const userTemplates = await db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId));

  const templateCount = userTemplates.length;
  const templateLimit = planConfig.limits.templates;

  return {
    plan: effectivePlan,
    planConfig,
    isSuperAdmin,
    templates: {
      used: templateCount,
      limit: templateLimit,
      canCreate: templateLimit === -1 || templateCount < templateLimit,
    },
    teamMembers: {
      limit: planConfig.limits.teamMembers,
      canInvite: planConfig.limits.teamMembers !== 0,
    },
    features: {
      smsEnabled: planConfig.limits.smsEnabled,
      customBranding: planConfig.limits.customBranding,
      resizeFields: planConfig.limits.resizeFields,
      notifyOnOpen: planConfig.limits.notifyOnOpen,
      customMessages: planConfig.limits.customMessages,
    },
    retention: {
      days: planConfig.limits.retentionDays,
      unlimited: planConfig.limits.retentionDays === -1,
    },
  };
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.isSuperAdmin ?? false;
}

export async function canUseFeature(
  userId: string,
  feature: keyof PlanConfig["limits"]
): Promise<boolean> {
  const limits = await getUserPlanLimits(userId);

  switch (feature) {
    case "templates":
      return limits.templates.canCreate;
    case "teamMembers":
      return limits.teamMembers.canInvite;
    case "smsEnabled":
      return limits.features.smsEnabled;
    case "customBranding":
      return limits.features.customBranding;
    case "resizeFields":
      return limits.features.resizeFields;
    case "notifyOnOpen":
      return limits.features.notifyOnOpen;
    case "customMessages":
      return limits.features.customMessages;
    case "retentionDays":
      return true; // Always allowed, just different limits
    default:
      return false;
  }
}

export async function enforceDocumentRetention(userId: string): Promise<void> {
  const limits = await getUserPlanLimits(userId);

  if (limits.retention.unlimited) {
    return; // No retention limit
  }

  const retentionDays = limits.retention.days;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Get documents older than retention period
  // Note: In a real implementation, you might want to archive or notify
  // before deleting. This is just marking them as expired.
  const expiredDocuments = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.status, "completed")
        // For now, we're not actually deleting - just logging
      )
    );

  // Log expired documents for monitoring
  const oldDocs = expiredDocuments.filter(
    (doc) => doc.completedAt && doc.completedAt < cutoffDate
  );

  if (oldDocs.length > 0) {
    console.log(
      `User ${userId} has ${oldDocs.length} documents past retention period`
    );
  }
}

export function formatPlanFeature(
  feature: keyof PlanConfig["limits"],
  value: number | boolean
): string {
  if (typeof value === "boolean") {
    return value ? "Included" : "Not included";
  }

  if (value === -1) {
    return "Unlimited";
  }

  return value.toString();
}
