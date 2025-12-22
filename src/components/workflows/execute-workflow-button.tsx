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

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface ExecuteWorkflowButtonProps {
  documentId: string;
  documentTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ExecuteWorkflowButton({
  documentId,
  documentTitle,
  variant = "default",
  size = "default",
}: ExecuteWorkflowButtonProps) {
  const [open, setOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchWorkflows();
    }
  }, [open]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows");
      if (response.ok) {
        const data = await response.json();
        // Filter only active workflows
        const activeWorkflows = data.workflows.filter(
          (w: Workflow) => w.status === "active"
        );
        setWorkflows(activeWorkflows);

        if (activeWorkflows.length === 0) {
          toast({
            title: "No active workflows",
            description: "Create and activate a workflow first.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedWorkflowId) {
      toast({
        title: "No workflow selected",
        description: "Please select a workflow to execute",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
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
        title: "Workflow started",
        description: `Workflow is now executing on "${documentTitle}"`,
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
          Run Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Execute Workflow</DialogTitle>
          <DialogDescription>
            Select a workflow to run on &ldquo;{documentTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No active workflows available. Create and activate a workflow first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                      {workflow.description ? ` - ${workflow.description}` : ""}
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
            disabled={executing || !selectedWorkflowId || workflows.length === 0}
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
