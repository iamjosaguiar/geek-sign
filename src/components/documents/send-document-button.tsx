"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SendDocumentButtonProps {
  documentId: string;
  hasRecipients: boolean;
  hasFields: boolean;
}

export function SendDocumentButton({
  documentId,
  hasRecipients,
  hasFields,
}: SendDocumentButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!hasRecipients) {
      toast({
        title: "Cannot send document",
        description: "Please add at least one recipient before sending",
        variant: "destructive",
      });
      return;
    }

    if (!hasFields) {
      toast({
        title: "Cannot send document",
        description: "Please add at least one signature field before sending",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send document");
      }

      toast({
        title: "Document sent!",
        description: `${data.emailsSent} email(s) sent successfully`,
      });

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send document",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button onClick={handleSend} disabled={isSending}>
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
  );
}
