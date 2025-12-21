"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Workflow as WorkflowIcon,
  RefreshCw,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: any;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  documentId: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  context: any;
  currentStepIndex: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workflow?: {
    id: string;
    name: string;
    description: string | null;
    definition: {
      version: string;
      steps: WorkflowStep[];
    };
  };
  document?: {
    id: string;
    title: string;
  };
}

interface ExecutionLog {
  id: string;
  executionId: string;
  stepIndex: number;
  stepId: string;
  level: "info" | "warning" | "error";
  message: string;
  data: any;
  createdAt: string;
}

export default function ExecutionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const executionId = params.id as string;

  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (executionId) {
      fetchExecution();
      fetchLogs();

      // Poll for updates every 5 seconds if execution is active
      const interval = setInterval(() => {
        if (execution && (execution.status === "running" || execution.status === "pending")) {
          fetchExecution();
          fetchLogs();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [executionId, execution?.status]);

  const fetchExecution = async () => {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}`);
      if (response.ok) {
        const data = await response.json();
        setExecution(data.execution);
      } else {
        alert("Execution not found");
        router.push("/dashboard/workflows/executions");
      }
    } catch (error) {
      console.error("Error fetching execution:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleAction = async (action: "pause" | "resume" | "cancel") => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/${action}`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchExecution();
        alert(`Execution ${action}d successfully`);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${action} execution`);
      }
    } catch (error) {
      console.error(`Error ${action}ing execution:`, error);
      alert(`Failed to ${action} execution`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async () => {
    setActionLoading("retry");
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/retry`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/workflows/executions/${data.executionId}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to retry execution");
      }
    } catch (error) {
      console.error("Error retrying execution:", error);
      alert("Failed to retry execution");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      ),
      running: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
          <Play className="w-4 h-4" />
          Running
        </span>
      ),
      paused: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
          <Pause className="w-4 h-4" />
          Paused
        </span>
      ),
      completed: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          Completed
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
          <XCircle className="w-4 h-4" />
          Failed
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  const getStepStatus = (stepIndex: number) => {
    if (!execution) return "pending";
    if (execution.currentStepIndex > stepIndex) return "completed";
    if (execution.currentStepIndex === stepIndex) {
      if (execution.status === "failed") return "failed";
      if (execution.status === "running") return "running";
      if (execution.status === "paused") return "paused";
    }
    return "pending";
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case "failed":
        return <XCircle className="w-6 h-6 text-red-600" />;
      case "running":
        return <Play className="w-6 h-6 text-blue-600" />;
      case "paused":
        return <Pause className="w-6 h-6 text-yellow-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDuration = () => {
    if (!execution?.startedAt) return "Not started";
    const start = new Date(execution.startedAt).getTime();
    const end = execution.completedAt
      ? new Date(execution.completedAt).getTime()
      : Date.now();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (!execution) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/workflows/executions")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Executions
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {execution.workflow?.name || "Unknown Workflow"}
            </h1>
            <p className="mt-2 text-gray-600">
              Execution for {execution.document?.title || "Unknown Document"}
            </p>
          </div>
          {getStatusBadge(execution.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Execution Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {execution.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {getDuration()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Started At</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {execution.startedAt ? formatDate(execution.startedAt) : "Not started"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed At</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {execution.completedAt ? formatDate(execution.completedAt) : "In progress"}
                </p>
              </div>
            </div>

            {execution.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Error:</span> {execution.errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Workflow Progress
            </h2>
            <div className="space-y-4">
              {execution.workflow?.definition.steps.map((step, index) => {
                const stepStatus = getStepStatus(index);
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      stepStatus === "running"
                        ? "border-blue-300 bg-blue-50"
                        : stepStatus === "completed"
                        ? "border-green-300 bg-green-50"
                        : stepStatus === "failed"
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="mt-1">
                      {getStepIcon(stepStatus)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-full text-xs font-semibold">
                          {index + 1}
                        </span>
                        <h3 className="font-medium text-gray-900">{step.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Type: {step.type.replace(/_/g, " ")}
                      </p>
                      {stepStatus === "running" && (
                        <p className="text-sm text-blue-700 mt-2 font-medium">
                          Currently executing...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Execution Logs */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Execution Logs
            </h2>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-600">No logs available</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getLogIcon(log.level)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(log.createdAt)} - Step {log.stepIndex + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {execution.status === "running" && (
                <>
                  <button
                    onClick={() => handleAction("pause")}
                    disabled={actionLoading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pause className="w-4 h-4" />
                    {actionLoading === "pause" ? "Pausing..." : "Pause Execution"}
                  </button>
                  <button
                    onClick={() => handleAction("cancel")}
                    disabled={actionLoading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading === "cancel" ? "Canceling..." : "Cancel Execution"}
                  </button>
                </>
              )}

              {execution.status === "paused" && (
                <>
                  <button
                    onClick={() => handleAction("resume")}
                    disabled={actionLoading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {actionLoading === "resume" ? "Resuming..." : "Resume Execution"}
                  </button>
                  <button
                    onClick={() => handleAction("cancel")}
                    disabled={actionLoading !== null}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading === "cancel" ? "Canceling..." : "Cancel Execution"}
                  </button>
                </>
              )}

              {execution.status === "failed" && (
                <button
                  onClick={handleRetry}
                  disabled={actionLoading !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  {actionLoading === "retry" ? "Retrying..." : "Retry Execution"}
                </button>
              )}

              <button
                onClick={() => router.push(`/dashboard/workflows/${execution.workflowId}`)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <WorkflowIcon className="w-4 h-4" />
                View Workflow
              </button>

              <button
                onClick={() => router.push(`/dashboard/documents/${execution.documentId}`)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                View Document
              </button>
            </div>
          </div>

          {/* Context Variables */}
          {execution.context && Object.keys(execution.context).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Context Variables
              </h2>
              <div className="space-y-2">
                {Object.entries(execution.context).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-gray-700">{key}:</span>{" "}
                    <span className="text-gray-600">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
