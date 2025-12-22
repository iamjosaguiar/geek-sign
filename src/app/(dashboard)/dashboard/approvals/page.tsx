"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Workflow,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApprovalRequest {
  approval: {
    id: string;
    mode: string;
    status: string;
    requiredApprovals: number;
    currentApprovals: number;
    currentRejections: number;
    expiresAt: string | null;
    createdAt: string;
  };
  step: {
    id: string;
    stepType: string;
    stepIndex: number;
  };
  execution: {
    id: string;
    status: string;
    currentStepIndex: number;
  };
  workflow: {
    id: string;
    name: string;
    definition: any;
  };
  document: {
    id: string;
    title: string;
  };
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows/approvals");
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.approvals);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load approval requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedApproval || !decision) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/workflows/approvals/${selectedApproval.approval.id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, comment }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit response");
      }

      toast({
        title: `Approval ${decision}`,
        description: `You have ${decision} the request for "${selectedApproval.workflow.name}"`,
      });

      // Reset state and refresh
      setSelectedApproval(null);
      setDecision(null);
      setComment("");
      fetchApprovals();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit response",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getModeBadge = (mode: string) => {
    const labels: Record<string, string> = {
      any: "Any Approver",
      all: "All Approvers",
      majority: "Majority",
    };
    return labels[mode] || mode;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and respond to pending approval requests
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending approvals</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You don&apos;t have any pending approval requests at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval) => {
            const expired = isExpired(approval.approval.expiresAt);
            return (
              <Card key={approval.approval.id} className={expired ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-blue-600" />
                        {approval.workflow.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {approval.document.title}
                      </CardDescription>
                    </div>
                    {expired ? (
                      <Badge variant="destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Approval Mode:</span>
                      <p className="font-medium">{getModeBadge(approval.approval.mode)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Progress:</span>
                      <p className="font-medium">
                        {approval.approval.currentApprovals} of {approval.approval.requiredApprovals} approved
                      </p>
                    </div>
                    {approval.approval.currentRejections > 0 && (
                      <div>
                        <span className="text-muted-foreground">Rejections:</span>
                        <p className="font-medium text-red-600">
                          {approval.approval.currentRejections}
                        </p>
                      </div>
                    )}
                    {approval.approval.expiresAt && (
                      <div>
                        <span className="text-muted-foreground">Expires:</span>
                        <p className="font-medium">
                          {new Date(approval.approval.expiresAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setDecision("approved");
                      }}
                      disabled={expired}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setDecision("rejected");
                      }}
                      disabled={expired}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/workflows/executions/${approval.execution.id}`)
                      }
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={selectedApproval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApproval(null);
            setDecision(null);
            setComment("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approved" ? "Approve Request" : "Reject Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {decision} the approval request for &ldquo;
              {selectedApproval?.workflow.name}&rdquo;?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a comment..."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRespond}
              disabled={processing}
              className={
                decision === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm {decision === "approved" ? "Approval" : "Rejection"}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
