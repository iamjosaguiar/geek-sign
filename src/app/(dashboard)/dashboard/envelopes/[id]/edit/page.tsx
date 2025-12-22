import { auth } from "@/lib/auth";
import { db, envelopes, envelopeDocuments, envelopeRecipients } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface EnvelopeEditPageProps {
  params: { id: string };
}

export default async function EnvelopeEditPage({ params }: EnvelopeEditPageProps) {
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

  // Only allow editing draft envelopes
  if (envelope.status !== "draft") {
    redirect(`/dashboard/envelopes/${envelope.id}`);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/dashboard/envelopes/${envelope.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Envelope
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Envelope</h1>
          <p className="text-muted-foreground">
            Configure recipients and signing fields for {envelope.name}
          </p>
        </div>
      </div>

      {/* Temporary Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> The envelope edit page is being migrated to the new envelope system.
          For now, please use the original document edit page at{" "}
          <Link
            href={`/dashboard/documents/${envelope.id}/edit`}
            className="underline font-medium"
          >
            /dashboard/documents/{envelope.id}/edit
          </Link>
          {" "}to make changes. This page will be fully functional after the migration is complete.
        </AlertDescription>
      </Alert>

      {/* Document Info */}
      <Card>
        <CardHeader>
          <CardTitle>Envelope Information</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""},{" "}
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Documents</h3>
              {documents.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {documents.map((doc, idx) => (
                    <li key={doc.id}>
                      Document {idx + 1}: {doc.fileName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No documents yet</p>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Recipients</h3>
              {recipients.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {recipients.map((recipient) => (
                    <li key={recipient.id}>
                      Routing Order {recipient.routingOrder}: {recipient.name || recipient.email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recipients yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            To add recipients, configure routing order, and place signature fields, please use the
            original document edit interface during the migration period.
          </p>
          <Button asChild>
            <Link href={`/dashboard/documents/${envelope.id}/edit`}>
              Go to Document Edit Page
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
