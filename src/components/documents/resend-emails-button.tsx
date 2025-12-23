"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ResendEmailsButtonProps {
  documentId: string;
}

export function ResendEmailsButton({ documentId }: ResendEmailsButtonProps) {
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    setIsSending(true);

    try {
      const response = await fetch(`/api/envelopes/${documentId}/resend`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend emails");
      }

      toast({
        title: "Emails resent!",
        description: `${data.emailsSent} email(s) sent successfully`,
      });
    } catch (error) {
      console.error("Resend error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend emails",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleResend} disabled={isSending}>
      {isSending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Resend Emails
        </>
      )}
    </Button>
  );
}
