"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

export default function ApproveTokenPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    decision?: string;
    workflow?: string;
    document?: string;
  } | null>(null);

  useEffect(() => {
    if (token) {
      handleTokenApproval();
    }
  }, [token]);

  const handleTokenApproval = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/approvals/token/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          decision: data.decision,
          workflow: data.workflowName,
          document: data.documentTitle,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to process approval",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred while processing your response",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-muted-foreground">Processing your response...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {result?.success ? (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-center">
            {result?.success ? "Response Recorded" : "Unable to Process"}
          </CardTitle>
          <CardDescription className="text-center">
            {result?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              {result.decision && (
                <div>
                  <span className="text-muted-foreground">Decision:</span>
                  <p className="font-medium capitalize">{result.decision}</p>
                </div>
              )}
              {result.workflow && (
                <div>
                  <span className="text-muted-foreground">Workflow:</span>
                  <p className="font-medium">{result.workflow}</p>
                </div>
              )}
              {result.document && (
                <div>
                  <span className="text-muted-foreground">Document:</span>
                  <p className="font-medium">{result.document}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/dashboard/approvals">View All Approvals</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
