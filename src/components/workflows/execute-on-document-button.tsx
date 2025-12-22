"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play } from "lucide-react";

interface Document {
  id: string;
  title: string;
  fileName: string;
  status: string;
  createdAt: string;
}

interface ExecuteOnDocumentButtonProps {
  workflowId: string;
  workflowName: string;
  workflowStatus: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ExecuteOnDocumentButton({
  workflowId,
  workflowName,
  workflowStatus,
  variant = "default",
  size = "default",
}: ExecuteOnDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/documents/count");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);

        if (data.documents.length === 0) {
          toast({
            title: "No documents available",
            description: "Upload a document first to execute workflows on it.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (workflowStatus !== "active") {
      toast({
        title: "Workflow not active",
        description: "Please activate the workflow before executing it.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDocumentId) {
      toast({
        title: "No document selected",
        description: "Please select a document to execute the workflow on",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDocumentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute workflow");
      }

      const selectedDoc = documents.find(d => d.id === selectedDocumentId);
      toast({
        title: "Workflow started",
        description: `"${workflowName}" is now executing on "${selectedDoc?.title}"`,
      });

      setOpen(false);

      // Redirect to execution detail page
      router.push(`/dashboard/workflows/executions/${data.executionId}`);
    } catch (error) {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Failed to start workflow",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Play className="mr-2 h-4 w-4" />
          Execute Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Execute on Document</DialogTitle>
          <DialogDescription>
            Select a document to run &ldquo;{workflowName}&rdquo; on
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {workflowStatus !== "active" && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This workflow is not active. Activate it before executing.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No documents available. Upload a document first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Document
                </label>
                <select
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a document...</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.fileName}) - {doc.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={executing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={
              executing ||
              !selectedDocumentId ||
              documents.length === 0 ||
              workflowStatus !== "active"
            }
          >
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
