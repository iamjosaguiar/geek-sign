import { auth } from "@/lib/auth";
import { db, envelopes, envelopeDocuments, envelopeRecipients, envelopeFields, auditLogs } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Loader2,
  Files,
} from "lucide-react";
import { formatDate, formatDistanceToNow } from "@/lib/utils";
import { SendDocumentWithWorkflow } from "@/components/documents/send-document-with-workflow";
import { ResendEmailsButton } from "@/components/documents/resend-emails-button";
import { DownloadButton } from "@/components/documents/download-button";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";

// Dynamically import PDF preview to avoid SSR issues
const DocumentPreview = dynamic(
  () => import("@/components/pdf/document-preview").then((mod) => mod.DocumentPreview),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[8.5/11] rounded-lg border bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Signed document preview with signature overlays
const SignedDocumentPreview = dynamic(
  () => import("@/components/pdf/signed-document-preview").then((mod) => mod.SignedDocumentPreview),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[8.5/11] rounded-lg border bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface EnvelopePageProps {
  params: { id: string };
}

export default async function EnvelopePage({ params }: EnvelopePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const [envelope] = await db
    .select()
    .from(envelopes)
    .where(and(eq(envelopes.id, params.id), eq(envelopes.userId, session.user.id)))
    .limit(1);

  if (!envelope) {
    notFound();
  }

  const documents = await db
    .select()
    .from(envelopeDocuments)
    .where(eq(envelopeDocuments.envelopeId, params.id))
    .orderBy(envelopeDocuments.orderIndex);

  const recipients = await db
    .select()
    .from(envelopeRecipients)
    .where(eq(envelopeRecipients.envelopeId, params.id))
    .orderBy(envelopeRecipients.routingOrder);

  // Get all fields for all documents
  const fields = documents.length > 0
    ? await db
        .select()
        .from(envelopeFields)
        .where(inArray(envelopeFields.envelopeDocumentId, documents.map(d => d.id)))
    : [];

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.envelopeId, params.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="text-base px-3 py-1">Draft</Badge>;
      case "sent":
      case "in_progress":
        return <Badge variant="outline" className="border-[#F15C3E] text-[#F15C3E] text-base px-3 py-1">
          {status === "sent" ? "Sent" : "In Progress"}
        </Badge>;
      case "completed":
        return <Badge variant="default" className="bg-[#07AFBA] hover:bg-[#07AFBA]/90 text-base px-3 py-1">Completed</Badge>;
      case "voided":
        return <Badge variant="destructive" className="text-base px-3 py-1">Voided</Badge>;
      default:
        return <Badge variant="secondary" className="text-base px-3 py-1">{status}</Badge>;
    }
  };

  const getRecipientStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-[#07AFBA]" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-[#F15C3E]" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // For preview, show first document or the one with fields
  const previewDocument = documents[0];
  const previewFields = previewDocument
    ? fields.filter(f => f.envelopeDocumentId === previewDocument.id)
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/envelopes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Envelopes
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-muted p-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{envelope.name}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Files className="h-4 w-4" />
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </p>
              <div className="mt-2">
                {getStatusBadge(envelope.status)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {envelope.status === "draft" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/envelopes/${envelope.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <SendDocumentWithWorkflow
                  documentId={envelope.id}
                  documentTitle={envelope.name}
                  hasRecipients={recipients.length > 0}
                  hasFields={fields.length > 0}
                />
              </>
            )}
            {(envelope.status === "sent" || envelope.status === "in_progress") && (
              <ResendEmailsButton documentId={envelope.id} />
            )}
            <DownloadButton
              documentId={envelope.id}
              documentTitle={envelope.name}
              isCompleted={envelope.status === "completed"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              {documents.length > 1 && (
                <CardDescription>Showing first document ({documents.length} total)</CardDescription>
              )}
              {(envelope.status === "completed" || envelope.status === "in_progress") && previewFields.some(f => f.value) && (
                <CardDescription>Showing signed fields as overlays</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {previewDocument ? (
                (envelope.status === "completed" || envelope.status === "in_progress") && previewFields.some(f => f.value) ? (
                  <SignedDocumentPreview
                    fileUrl={previewDocument.fileUrl}
                    fields={previewFields.map(f => ({
                      id: f.id,
                      type: f.type,
                      page: f.page,
                      xPosition: f.xPosition,
                      yPosition: f.yPosition,
                      width: f.width,
                      height: f.height,
                      value: f.value,
                      recipientId: f.recipientId,
                    }))}
                  />
                ) : (
                  <DocumentPreview fileUrl={previewDocument.fileUrl} />
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents in envelope
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent activity for this envelope</CardDescription>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className="rounded-full bg-muted p-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 w-px bg-border" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt))} ago
                        </p>
                        {log.ipAddress && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {log.ipAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Envelope Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(envelope.createdAt)}</p>
              </div>
              {documents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Documents</p>
                    <p className="font-medium">{documents.length}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Size</p>
                    <p className="font-medium">
                      {formatFileSize(documents.reduce((sum, d) => sum + (d.fileSize || 0), 0))}
                    </p>
                  </div>
                </>
              )}
              {envelope.expiresAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">{formatDate(envelope.expiresAt)}</p>
                  </div>
                </>
              )}
              {envelope.currentRoutingOrder && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Routing Order</p>
                    <p className="font-medium">{envelope.currentRoutingOrder}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recipients</CardTitle>
              {envelope.status === "draft" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/envelopes/${envelope.id}/edit`}>
                    Edit
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recipients && recipients.length > 0 ? (
                <div className="space-y-3">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {recipient.routingOrder}
                        </Badge>
                        <div className="rounded-full bg-muted p-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {recipient.name || recipient.email}
                          </p>
                          {recipient.name && (
                            <p className="text-xs text-muted-foreground">
                              {recipient.email}
                            </p>
                          )}
                        </div>
                      </div>
                      {getRecipientStatusIcon(recipient.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recipients added</p>
                  {envelope.status === "draft" && (
                    <Button variant="link" size="sm" asChild className="mt-2">
                      <Link href={`/dashboard/envelopes/${envelope.id}/edit`}>
                        Add recipients
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteDocumentButton
                documentId={envelope.id}
                documentTitle={envelope.name}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
