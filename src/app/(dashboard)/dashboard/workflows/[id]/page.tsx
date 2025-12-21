"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Play, Trash2, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";

type StepType = "send_document" | "await_signature" | "approval_gate" | "conditional_branch" | "wait";

interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: any;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive" | "deleted";
  version: string;
  definition: {
    version: string;
    steps: WorkflowStep[];
  };
  executions?: any[];
}

export default function WorkflowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow();
    }
  }, [workflowId]);

  const fetchWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflow(data.workflow);
        setName(data.workflow.name);
        setDescription(data.workflow.description || "");
        setStatus(data.workflow.status);
        setSteps(data.workflow.definition.steps || []);
      } else {
        alert("Workflow not found");
        router.push("/dashboard/workflows");
      }
    } catch (error) {
      console.error("Error fetching workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a workflow name");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          status,
          definition: {
            version: workflow?.version || "1.0.0",
            steps,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflow(data.workflow);
        alert("Workflow updated successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update workflow");
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
      alert("Failed to update workflow");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/workflows");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
  };

  const addStep = (type: StepType) => {
    const stepId = `step_${steps.length}`;
    const newStep: WorkflowStep = {
      id: stepId,
      type,
      name: getStepName(type),
      config: getDefaultConfig(type),
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const getStepName = (type: StepType): string => {
    const names = {
      send_document: "Send Document",
      await_signature: "Await Signature",
      approval_gate: "Approval Gate",
      conditional_branch: "Conditional Branch",
      wait: "Wait",
    };
    return names[type];
  };

  const getDefaultConfig = (type: StepType): any => {
    const configs = {
      send_document: { recipients: [] },
      await_signature: { timeout: 86400 },
      approval_gate: { approvers: [], mode: "all" },
      conditional_branch: { condition: "", thenStep: "", elseStep: "" },
      wait: { duration: 3600 },
    };
    return configs[type];
  };

  const stepTypes: { type: StepType; label: string; description: string }[] = [
    { type: "send_document", label: "Send Document", description: "Send document to recipients" },
    { type: "await_signature", label: "Await Signature", description: "Wait for signatures" },
    { type: "approval_gate", label: "Approval Gate", description: "Require approval" },
    { type: "conditional_branch", label: "Conditional Branch", description: "Branch based on conditions" },
    { type: "wait", label: "Wait", description: "Wait for duration" },
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      active: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          Active
        </span>
      ),
      inactive: (
        <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
          <XCircle className="w-4 h-4" />
          Inactive
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/workflows")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Workflows
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Workflow</h1>
            <p className="mt-2 text-gray-600">Update your workflow configuration</p>
          </div>
          {getStatusBadge(workflow.status)}
        </div>
      </div>

      <div className="space-y-6">
        {/* Workflow Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Contract Approval Workflow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what this workflow does..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        {workflow.executions && workflow.executions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Executions
            </h2>
            <div className="space-y-3">
              {workflow.executions.slice(0, 5).map((execution: any) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {execution.status}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(execution.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Steps */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Steps</h2>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">No steps added yet</p>
              <p className="text-sm text-gray-500">Add your first step from the options below</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">{step.name}</h3>
                          <p className="text-sm text-gray-600">{getStepName(step.type)}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="ml-11 space-y-3">
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(index, "name", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      placeholder="Step name"
                    />

                    {step.type === "approval_gate" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Approval Mode
                        </label>
                        <select
                          value={step.config.mode}
                          onChange={(e) =>
                            updateStep(index, "config", {
                              ...step.config,
                              mode: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        >
                          <option value="any">Any (1 approval needed)</option>
                          <option value="all">All (all approvals needed)</option>
                          <option value="majority">Majority (&gt;50% needed)</option>
                        </select>
                      </div>
                    )}

                    {step.type === "wait" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Wait Duration (seconds)
                        </label>
                        <input
                          type="number"
                          value={step.config.duration}
                          onChange={(e) =>
                            updateStep(index, "config", {
                              ...step.config,
                              duration: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add Step</h3>
            <div className="grid grid-cols-2 gap-3">
              {stepTypes.map(({ type, label, description }) => (
                <button
                  key={type}
                  onClick={() => addStep(type)}
                  className="p-3 text-left border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">{label}</div>
                  <div className="text-xs text-gray-600 mt-1">{description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            Delete Workflow
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/workflows")}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
