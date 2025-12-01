"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Loader2,
  FileText,
  Pen,
  Calendar,
  Type,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";

interface EditorPageProps {
  params: { id: string };
}

interface Document {
  id: string;
  title: string;
  fileName: string | null;
  fileUrl: string | null;
  status: string;
}

interface Recipient {
  id: string;
  documentId: string;
  email: string;
  name: string | null;
  status: string;
  orderIndex: number;
}

interface DocumentField {
  id: string;
  documentId: string;
  recipientId: string;
  type: string;
  page: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  required: boolean;
  value: string | null;
}

const fieldTypes = [
  { type: "signature", label: "Signature", icon: Pen },
  { type: "initials", label: "Initials", icon: Type },
  { type: "date", label: "Date", icon: Calendar },
  { type: "text", label: "Text", icon: Type },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
];

export default function DocumentEditorPage({ params }: EditorPageProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<string>("signature");
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchDocument = async () => {
      if (status === "loading") return;

      if (!session?.user) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch(`/api/documents/${params.id}`);
        if (!response.ok) {
          router.push("/dashboard/documents");
          return;
        }

        const data = await response.json();
        setDocument(data.document);
        setRecipients(data.recipients || []);
        setFields(data.fields || []);
      } catch (error) {
        router.push("/dashboard/documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [params.id, router, session, status]);

  const addRecipient = async () => {
    if (!newRecipientEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/documents/${params.id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newRecipientEmail.trim(),
          name: newRecipientName.trim() || null,
          orderIndex: recipients.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to add recipient");

      const data = await response.json();
      setRecipients([...recipients, data.recipient]);
      setNewRecipientEmail("");
      setNewRecipientName("");

      toast({
        title: "Recipient added",
        description: `${newRecipientEmail} has been added.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add recipient.",
        variant: "destructive",
      });
    }
  };

  const removeRecipient = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${params.id}/recipients/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove recipient");

      setRecipients(recipients.filter((r) => r.id !== id));

      toast({
        title: "Recipient removed",
        description: "The recipient has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove recipient.",
        variant: "destructive",
      });
    }
  };

  const addField = async (recipientId: string) => {
    try {
      const response = await fetch(`/api/documents/${params.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          type: selectedFieldType,
          page: 1,
          xPosition: 100,
          yPosition: 100,
          width: selectedFieldType === "signature" ? 200 : 150,
          height: selectedFieldType === "signature" ? 60 : 30,
        }),
      });

      if (!response.ok) throw new Error("Failed to add field");

      const data = await response.json();
      setFields([...fields, data.field]);

      toast({
        title: "Field added",
        description: `${selectedFieldType} field has been added.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add field.",
        variant: "destructive",
      });
    }
  };

  const removeField = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${params.id}/fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove field");

      setFields(fields.filter((f) => f.id !== id));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove field.",
        variant: "destructive",
      });
    }
  };

  const sendForSigning = async () => {
    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/documents/${params.id}/send`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to send document");

      toast({
        title: "Document sent",
        description: "The document has been sent for signing.",
      });

      router.push(`/dashboard/documents/${params.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find((f) => f.type === type);
    return fieldType?.icon || Type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/dashboard/documents/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Document
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit: {document.title}
            </h1>
            <p className="text-muted-foreground">
              Add recipients and signature fields
            </p>
          </div>

          <Button onClick={sendForSigning} disabled={isSending || recipients.length === 0}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send for Signing
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>
                Click on the document to place signature fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[8.5/11] rounded-lg border bg-white">
                {/* PDF Preview placeholder */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p>PDF Preview</p>
                    <p className="text-sm">Drag and drop fields onto the document</p>
                  </div>
                </div>

                {/* Placed Fields */}
                {fields.map((field) => {
                  const recipient = recipients.find((r) => r.id === field.recipientId);
                  const FieldIcon = getFieldIcon(field.type);
                  return (
                    <div
                      key={field.id}
                      className="absolute border-2 border-primary bg-primary/10 rounded cursor-move flex items-center justify-center group"
                      style={{
                        left: field.xPosition,
                        top: field.yPosition,
                        width: field.width,
                        height: field.height,
                      }}
                    >
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <FieldIcon className="h-4 w-4" />
                        <span className="capitalize">{field.type}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Add Recipient */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>
                Add people who need to sign this document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Name (optional)</Label>
                  <Input
                    id="recipientName"
                    placeholder="John Doe"
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                  />
                </div>
                <Button onClick={addRecipient} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recipient
                </Button>
              </div>

              {recipients.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  {recipients.map((recipient, index) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecipient(recipient.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field Types */}
          <Card>
            <CardHeader>
              <CardTitle>Signature Fields</CardTitle>
              <CardDescription>
                Select a field type and assign to a recipient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Field Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                {fieldTypes.map((field) => (
                  <Button
                    key={field.type}
                    variant={selectedFieldType === field.type ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => setSelectedFieldType(field.type)}
                  >
                    <field.icon className="mr-2 h-4 w-4" />
                    {field.label}
                  </Button>
                ))}
              </div>

              {/* Add Field to Recipient */}
              {recipients.length > 0 ? (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Add to recipient:</Label>
                  {recipients.map((recipient) => (
                    <Button
                      key={recipient.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => addField(recipient.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {recipient.name || recipient.email}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add recipients first to assign fields
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fields Summary */}
          {fields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Added Fields</CardTitle>
                <CardDescription>
                  {fields.length} field(s) added
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fields.map((field) => {
                    const recipient = recipients.find((r) => r.id === field.recipientId);
                    const FieldIcon = getFieldIcon(field.type);
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <FieldIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {field.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recipient?.name || recipient?.email || "Unassigned"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
