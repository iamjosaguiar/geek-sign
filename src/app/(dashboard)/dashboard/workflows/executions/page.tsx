"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  ArrowRight,
  FileText,
  Workflow as WorkflowIcon
} from "lucide-react";

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
    definition: {
      version: string;
      steps: any[];
    };
  };
  document?: {
    id: string;
    title: string;
  };
}

export default function WorkflowExecutionsPage() {
  const router = useRouter();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "running" | "completed" | "failed">("all");

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async () => {
    try {
      const response = await fetch("/api/workflows/executions");
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error("Error fetching executions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Play className="w-5 h-5 text-blue-600" />;
      case "paused":
        return <Pause className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      ),
      running: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          <Play className="w-3 h-3" />
          Running
        </span>
      ),
      paused: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          <Pause className="w-3 h-3" />
          Paused
        </span>
      ),
      completed: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      ),
      failed: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  const getProgress = (execution: WorkflowExecution) => {
    if (!execution.workflow?.definition?.steps) return 0;
    const totalSteps = execution.workflow.definition.steps.length;
    if (totalSteps === 0) return 0;
    const progress = ((execution.currentStepIndex + 1) / totalSteps) * 100;
    return Math.min(progress, 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not started";
    return new Date(dateString).toLocaleString();
  };

  const getDuration = (execution: WorkflowExecution) => {
    if (!execution.startedAt) return "Not started";
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

  const filteredExecutions = executions.filter((execution) => {
    if (filter === "all") return true;
    return execution.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading executions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflow Executions</h1>
        <p className="mt-2 text-gray-600">
          Monitor and manage your workflow execution history
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("running")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "running"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Running
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "completed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "failed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Failed
        </button>
      </div>

      {/* Executions List */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <WorkflowIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No executions found
            </h3>
            <p className="text-gray-600">
              {filter === "all"
                ? "Execute a workflow to see it here"
                : `No ${filter} executions`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExecutions.map((execution) => (
            <div
              key={execution.id}
              onClick={() => router.push(`/dashboard/workflows/executions/${execution.id}`)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">
                    {getStatusIcon(execution.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {execution.workflow?.name || "Unknown Workflow"}
                      </h3>
                      {getStatusBadge(execution.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{execution.document?.title || "Unknown Document"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{getDuration(execution)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
              </div>

              {/* Progress Bar */}
              {execution.workflow?.definition?.steps && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>
                      Step {execution.currentStepIndex + 1} of{" "}
                      {execution.workflow.definition.steps.length}
                    </span>
                    <span>{Math.round(getProgress(execution))}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        execution.status === "completed"
                          ? "bg-green-600"
                          : execution.status === "failed"
                          ? "bg-red-600"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${getProgress(execution)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {execution.status === "failed" && execution.errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <span className="font-medium">Error:</span> {execution.errorMessage}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>Started: {formatDate(execution.startedAt)}</span>
                {execution.completedAt && (
                  <span>Completed: {formatDate(execution.completedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
