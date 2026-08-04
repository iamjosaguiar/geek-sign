"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Workflow, Link2, Check, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SendDocumentWithWorkflowProps {
  documentId: string;
  documentTitle: string;
  hasRecipients: boolean;
  hasFields: boolean;
  // The name recipients will see as the sender (email subject + body). Defaults
  // to the document's sender display name, falling back to the signed-in user.
  senderName: string;
  // The email address the message is actually sent from (envelope From),
  // shown read-only so the sender knows the full identity before sending.
  fromAddress: string;
}

interface WorkflowOption {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface SigningLink {
  recipientId: string;
  name: string | null;
  email: string;
  url: string;
}

export function SendDocumentWithWorkflow({
  documentId,
  documentTitle,
  hasRecipients,
  hasFields,
  senderName,
  fromAddress,
}: SendDocumentWithWorkflowProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [sendMethod, setSendMethod] = useState<"normal" | "workflow" | "link" | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [links, setLinks] = useState<SigningLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [senderNameInput, setSenderNameInput] = useState(senderName);
  const router = useRouter();

  useEffect(() => {
    if (sendMethod === "workflow") {
      fetchWorkflows();
    }
  }, [sendMethod]);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch("/api/workflows");
      if (response.ok) {
        const data = await response.json();
        const activeWorkflows = data.workflows.filter(
          (w: WorkflowOption) => w.status === "active"
        );
        setWorkflows(activeWorkflows);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleSendNormally = async () => {
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

    setProcessing(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName: senderNameInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send document");
      }

      toast({
        title: "Document sent!",
        description: `${data.emailsSent} email(s) sent successfully`,
      });

      setShowDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send document",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleGetLink = async () => {
    if (!hasRecipients) {
      toast({
        title: "Cannot create link",
        description: "Please add at least one recipient first",
        variant: "destructive",
      });
      return;
    }

    if (!hasFields) {
      toast({
        title: "Cannot create link",
        description: "Please add at least one signature field first",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`/api/documents/${documentId}/activate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create signing link");
      }

      setLinks(data.links || []);
      setSendMethod("link");
      // Status is now "pending" — refresh so the page reflects it.
      router.refresh();
    } catch (error) {
      console.error("Get link error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create signing link",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyLink = async (link: SigningLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.recipientId);
      toast({
        title: "Link copied!",
        description: "Signing link copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSendViaWorkflow = async () => {
    if (!selectedWorkflowId) {
      toast({
        title: "No workflow selected",
        description: "Please select a workflow to execute",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`/api/workflows/${selectedWorkflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute workflow");
      }

      toast({
        title: "Workflow started!",
        description: `Workflow "${data.execution.workflowName}" is now running for "${documentTitle}"`,
      });

      router.push(`/dashboard/workflows/executions/${data.execution.id}`);
    } catch (error) {
      console.error("Execute error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute workflow",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMethodSelect = (method: "normal" | "workflow" | "link") => {
    if (method === "link") {
      // Activate the document and fetch shareable links (no email sent)
      handleGetLink();
    } else {
      // "normal" shows a sender-review step before emailing; "workflow" shows
      // the workflow picker. Neither sends until the user confirms.
      setSendMethod(method);
    }
  };

  const resetDialog = () => {
    setShowDialog(false);
    setSendMethod(null);
    setSelectedWorkflowId("");
    setLinks([]);
    setCopiedId(null);
    setSenderNameInput(senderName);
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <Send className="mr-2 h-4 w-4" />
        Send for Signing
      </Button>

      <Dialog open={showDialog} onOpenChange={resetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Document</DialogTitle>
            <DialogDescription>
              Choose how you want to send this document for signing
            </DialogDescription>
          </DialogHeader>

          {sendMethod === null ? (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => handleMethodSelect("normal")}
                disabled={processing}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Send className="h-5 w-5" />
                  Send Normally
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Send document directly to recipients for signing
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => handleMethodSelect("link")}
                disabled={processing}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Link2 className="h-5 w-5" />
                  )}
                  Get a shareable link
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Activate signing without emailing — copy the link and send it yourself
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-start gap-2"
                onClick={() => handleMethodSelect("workflow")}
                disabled={processing}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Workflow className="h-5 w-5" />
                  Send via Workflow
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  Execute an automated workflow (approvals, notifications, etc.)
                </p>
              </Button>
            </div>
          ) : sendMethod === "normal" ? (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sending as</label>
                <input
                  type="text"
                  value={senderNameInput}
                  onChange={(e) => setSenderNameInput(e.target.value)}
                  placeholder={senderName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Recipients see this name in the email subject and body. The email
                  itself is sent from {fromAddress}.
                </p>
              </div>

              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setSendMethod(null)}
                  disabled={processing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSendNormally}
                  disabled={processing || !hasRecipients || !hasFields}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : sendMethod === "link" ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {links.length === 1
                  ? "Share this link with your signer. They can open it and sign without needing an email."
                  : "Share each link with the matching signer. They can open it and sign without needing an email."}
              </p>
              <div className="space-y-3">
                {links.map((link) => (
                  <div key={link.recipientId} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">
                      {link.name || link.email}
                    </p>
                    {link.name && (
                      <p className="text-xs text-muted-foreground">{link.email}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        readOnly
                        value={link.url}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 rounded-md border bg-muted px-2 py-1.5 text-xs text-muted-foreground"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleCopyLink(link)}
                      >
                        {copiedId === link.recipientId ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5 text-[#07AFBA]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={resetDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : sendMethod === "workflow" ? (
            <div className="space-y-4 py-4">
              {loadingWorkflows ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No active workflows available. Create a workflow first.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => router.push("/dashboard/workflows/new")}
                    className="mt-2"
                  >
                    Create Workflow
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Workflow
                    </label>
                    <select
                      value={selectedWorkflowId}
                      onChange={(e) => setSelectedWorkflowId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a workflow...</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                    {selectedWorkflowId && workflows.find((w) => w.id === selectedWorkflowId)?.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {workflows.find((w) => w.id === selectedWorkflowId)?.description}
                      </p>
                    )}
                  </div>

                  <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setSendMethod(null)}
                      disabled={processing}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSendViaWorkflow}
                      disabled={processing || !selectedWorkflowId}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Workflow className="mr-2 h-4 w-4" />
                          Execute Workflow
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          ) : null}

          {sendMethod === null && (
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
