"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Pen,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Type,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SignPageProps {
  params: { token: string };
}

interface Field {
  id: string;
  type: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  page: number;
  value: string | null;
  required: boolean;
}

interface DocumentData {
  id: string;
  title: string;
  file_url: string;
  status: string;
}

interface RecipientData {
  id: string;
  name: string | null;
  email: string;
  status: string;
}

export default function SignPage({ params }: SignPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [recipient, setRecipient] = useState<RecipientData | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureValue, setSignatureValue] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchSigningData = async () => {
      try {
        // Fetch recipient by token
        const { data: recipientData, error: recipientError } = await supabase
          .from("recipients")
          .select("*, documents(*)")
          .eq("signing_token", params.token)
          .single();

        if (recipientError || !recipientData) {
          setError("Invalid or expired signing link. Please contact the sender for a new link.");
          setIsLoading(false);
          return;
        }

        if (recipientData.status === "signed") {
          setIsComplete(true);
          setDocument(recipientData.documents);
          setRecipient(recipientData);
          setIsLoading(false);
          return;
        }

        // Fetch fields for this recipient
        const { data: fieldsData } = await supabase
          .from("document_fields")
          .select("*")
          .eq("document_id", recipientData.document_id)
          .eq("recipient_id", recipientData.id);

        setDocument(recipientData.documents);
        setRecipient(recipientData);
        setFields(fieldsData || []);
        setIsLoading(false);

        // Log document opened
        await supabase.from("audit_logs").insert({
          document_id: recipientData.document_id,
          recipient_id: recipientData.id,
          action: "document_opened",
          ip_address: null, // Would need server-side to get real IP
        });
      } catch (err) {
        setError("An error occurred while loading the document.");
        setIsLoading(false);
      }
    };

    fetchSigningData();
  }, [params.token, supabase]);

  const handleFieldClick = (index: number) => {
    setCurrentFieldIndex(index);
    const field = fields[index];

    if (field.type === "signature" || field.type === "initials") {
      setShowSignatureModal(true);
    }
  };

  const handleSignatureSubmit = () => {
    if (!signatureValue.trim()) {
      toast({
        title: "Signature required",
        description: "Please type your signature.",
        variant: "destructive",
      });
      return;
    }

    const updatedFields = [...fields];
    updatedFields[currentFieldIndex] = {
      ...updatedFields[currentFieldIndex],
      value: signatureValue,
    };
    setFields(updatedFields);
    setShowSignatureModal(false);
    setSignatureValue("");

    // Move to next unsigned field
    const nextUnsigned = updatedFields.findIndex(
      (f, i) => i > currentFieldIndex && !f.value
    );
    if (nextUnsigned !== -1) {
      setCurrentFieldIndex(nextUnsigned);
    }
  };

  const handleTextFieldChange = (index: number, value: string) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], value };
    setFields(updatedFields);
  };

  const handleDateFieldClick = (index: number) => {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], value: today };
    setFields(updatedFields);
  };

  const allFieldsComplete = fields.every(
    (f) => !f.required || (f.value && f.value.trim() !== "")
  );

  const handleComplete = async () => {
    if (!allFieldsComplete) {
      toast({
        title: "Incomplete fields",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);

    try {
      // Update field values
      for (const field of fields) {
        if (field.value) {
          await supabase
            .from("document_fields")
            .update({ value: field.value })
            .eq("id", field.id);
        }
      }

      // Update recipient status
      await supabase
        .from("recipients")
        .update({ status: "signed", signed_at: new Date().toISOString() })
        .eq("id", recipient?.id);

      // Log signing
      await supabase.from("audit_logs").insert({
        document_id: document?.id,
        recipient_id: recipient?.id,
        action: "document_signed",
        details: { fields_completed: fields.length },
      });

      // Check if all recipients have signed
      const { data: allRecipients } = await supabase
        .from("recipients")
        .select("status")
        .eq("document_id", document?.id);

      const allSigned = allRecipients?.every((r) => r.status === "signed");

      if (allSigned) {
        await supabase
          .from("documents")
          .update({ status: "completed" })
          .eq("id", document?.id);
      }

      setIsComplete(true);
      toast({
        title: "Document signed!",
        description: "Thank you for signing. The sender will be notified.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Document</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Document Signed!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for signing &ldquo;{document?.title}&rdquo;. The sender has been
              notified and you will receive a copy via email.
            </p>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Copy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{document?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Sent to {recipient?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fields to Complete</CardTitle>
              <CardDescription>
                {fields.filter((f) => f.value).length} of {fields.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(index)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      field.value
                        ? "border-green-200 bg-green-50"
                        : currentFieldIndex === index
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    {field.type === "signature" && <Pen className="h-4 w-4" />}
                    {field.type === "initials" && <Type className="h-4 w-4" />}
                    {field.type === "date" && <Calendar className="h-4 w-4" />}
                    {field.type === "text" && <Type className="h-4 w-4" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{field.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.value ? "Completed" : "Click to fill"}
                      </p>
                    </div>
                    {field.value && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleComplete}
            disabled={!allFieldsComplete || isSigning}
            className="w-full"
            size="lg"
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Signing
              </>
            )}
          </Button>
        </div>

        {/* Document Preview */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-[8.5/11] rounded-lg border bg-white overflow-hidden">
                {/* PDF would be rendered here */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p>Document Preview</p>
                  </div>
                </div>

                {/* Signature Fields Overlay */}
                {fields.map((field, index) => (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(index)}
                    className={cn(
                      "absolute border-2 rounded transition-all cursor-pointer",
                      field.value
                        ? "border-green-500 bg-green-50"
                        : "border-primary bg-primary/10 hover:bg-primary/20"
                    )}
                    style={{
                      left: field.x_position,
                      top: field.y_position,
                      width: field.width,
                      height: field.height,
                    }}
                  >
                    {field.value ? (
                      <span
                        className="text-sm font-medium text-gray-800 p-1"
                        style={{ fontFamily: "cursive" }}
                      >
                        {field.value}
                      </span>
                    ) : (
                      <span className="text-xs text-primary">
                        Click to {field.type}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Signature Modal */}
      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fields[currentFieldIndex]?.type === "signature"
                ? "Add Your Signature"
                : "Add Your Initials"}
            </DialogTitle>
            <DialogDescription>
              Type your {fields[currentFieldIndex]?.type} below. This will be legally binding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signature">
                {fields[currentFieldIndex]?.type === "signature"
                  ? "Full Name"
                  : "Initials"}
              </Label>
              <Input
                id="signature"
                placeholder={
                  fields[currentFieldIndex]?.type === "signature"
                    ? "Type your full name"
                    : "Type your initials"
                }
                value={signatureValue}
                onChange={(e) => setSignatureValue(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <p
                className="text-2xl text-center py-4"
                style={{ fontFamily: "cursive" }}
              >
                {signatureValue || "Your signature will appear here"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSignatureModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSignatureSubmit} className="flex-1">
              Apply {fields[currentFieldIndex]?.type === "signature" ? "Signature" : "Initials"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
