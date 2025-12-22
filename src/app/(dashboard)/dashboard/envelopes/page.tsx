import { auth } from "@/lib/auth";
import { db, envelopes, envelopeDocuments, envelopeRecipients, users } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import {
  FileText,
  Upload,
  Search,
  Eye,
  Clock,
  Sparkles,
  Files,
} from "lucide-react";
import { formatDistanceToNow, formatDate } from "@/lib/utils";
import { DocumentActions } from "@/components/documents/document-actions";
import { plansConfig } from "@/config/plans";
import type { Plan } from "@/types";

export default async function EnvelopesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Fetch user to check plan
  const [user] = await db
    .select({
      plan: users.plan,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const effectivePlan = isSuperAdmin ? "team" : ((user?.plan || "free") as Plan);
  const retentionDays = plansConfig[effectivePlan].limits.retentionDays;
  const showRetentionWarning = retentionDays > 0 && !isSuperAdmin;

  // Fetch envelopes with document and recipient counts
  const userEnvelopes = await db
    .select({
      id: envelopes.id,
      name: envelopes.name,
      status: envelopes.status,
      currentRoutingOrder: envelopes.currentRoutingOrder,
      createdAt: envelopes.createdAt,
      completedAt: envelopes.completedAt,
      documentCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${envelopeDocuments}
        WHERE ${envelopeDocuments.envelopeId} = ${envelopes.id}
      )`,
      recipientCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${envelopeRecipients}
        WHERE ${envelopeRecipients.envelopeId} = ${envelopes.id}
      )`,
      completedRecipientCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${envelopeRecipients}
        WHERE ${envelopeRecipients.envelopeId} = ${envelopes.id}
          AND ${envelopeRecipients.status} = 'completed'
      )`,
    })
    .from(envelopes)
    .where(eq(envelopes.userId, session.user.id))
    .orderBy(desc(envelopes.createdAt));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
      case "in_progress":
        return <Badge variant="outline" className="border-[#F15C3E] text-[#F15C3E]">
          {status === "sent" ? "Sent" : "In Progress"}
        </Badge>;
      case "completed":
        return <Badge variant="default" className="bg-[#07AFBA] hover:bg-[#07AFBA]/90">Completed</Badge>;
      case "voided":
        return <Badge variant="destructive">Voided</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecipientStatus = (envelope: typeof userEnvelopes[0]) => {
    if (envelope.recipientCount === 0) return "No recipients";
    return `${envelope.completedRecipientCount}/${envelope.recipientCount} completed`;
  };

  const getDocumentCountBadge = (count: number) => {
    if (count === 0) return null;
    if (count === 1) return <span className="text-muted-foreground">1 document</span>;
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Files className="h-3 w-3" />
        {count} documents
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Retention Warning for Free Users */}
      {showRetentionWarning && (
        <Alert className="border-[#F15C3E]/30 bg-[#F15C3E]/5 dark:border-[#F15C3E]/50 dark:bg-[#F15C3E]/10">
          <Clock className="h-4 w-4 text-[#F15C3E]" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-[#252A61] dark:text-[#F15C3E]/90">
              Envelopes on the Free plan are automatically deleted after {retentionDays} days.
            </span>
            <Button variant="outline" size="sm" asChild className="ml-4 shrink-0">
              <Link href="/dashboard/billing">
                <Sparkles className="mr-2 h-3 w-3" />
                Upgrade for Unlimited
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Envelopes</h1>
          <p className="text-muted-foreground">
            Manage and track all your envelopes
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search envelopes..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                All Status
              </Button>
              <Button variant="outline" size="sm">
                Date Range
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Envelopes List */}
      <Card>
        <CardHeader>
          <CardTitle>Envelopes</CardTitle>
          <CardDescription>
            {userEnvelopes?.length || 0} total envelopes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userEnvelopes && userEnvelopes.length > 0 ? (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">Envelope</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Recipients</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Envelope Rows */}
              {userEnvelopes.map((envelope) => (
                <div
                  key={envelope.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Envelope Info */}
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{envelope.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getDocumentCountBadge(envelope.documentCount)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2">
                    <span className="md:hidden text-sm text-muted-foreground mr-2">Status:</span>
                    {getStatusBadge(envelope.status)}
                  </div>

                  {/* Recipients */}
                  <div className="md:col-span-2 text-sm text-muted-foreground">
                    <span className="md:hidden text-muted-foreground mr-2">Recipients:</span>
                    {getRecipientStatus(envelope)}
                  </div>

                  {/* Created Date */}
                  <div className="md:col-span-2 text-sm text-muted-foreground">
                    <span className="md:hidden mr-2">Created:</span>
                    <span title={formatDate(envelope.createdAt)}>
                      {formatDistanceToNow(new Date(envelope.createdAt))} ago
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/envelopes/${envelope.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    </Button>
                    <DocumentActions
                      documentId={envelope.id}
                      documentTitle={envelope.name}
                      status={envelope.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No envelopes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first document to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
