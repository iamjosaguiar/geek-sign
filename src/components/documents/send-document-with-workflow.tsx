"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Workflow } from "lucide-react";
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
}

interface WorkflowOption {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export function SendDocumentWithWorkflow({
  documentId,
  documentTitle,
  hasRecipients,
  hasFields,
}: SendDocumentWithWorkflowProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [sendMethod, setSendMethod] = useState<"normal" | "workflow" | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [processing, setProcessing] = useState(false);
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
      const response = await fetch(`/api/envelopes/${documentId}/send`, {
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

  const handleMethodSelect = (method: "normal" | "workflow") => {
    setSendMethod(method);

    if (method === "normal") {
      // Execute normal send immediately
      handleSendNormally();
    }
    // For workflow, keep dialog open to show workflow selection
  };

  const resetDialog = () => {
    setShowDialog(false);
    setSendMethod(null);
    setSelectedWorkflowId("");
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
