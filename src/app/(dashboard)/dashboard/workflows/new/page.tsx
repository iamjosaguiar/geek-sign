"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

type StepType = "send_document" | "await_signature" | "approval_gate" | "wait";

interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: any;
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [saving, setSaving] = useState(false);

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
      wait: "Wait",
    };
    return names[type];
  };

  const getDefaultConfig = (type: StepType): any => {
    const configs = {
      send_document: { recipients: [] },
      await_signature: { timeout: 86400 },
      approval_gate: { approvers: [], mode: "all" },
      wait: { duration: 3600 },
    };
    return configs[type];
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a workflow name");
      return;
    }

    if (steps.length === 0) {
      alert("Please add at least one step");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          definition: {
            version: "1.0.0",
            steps,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/workflows/${data.workflow.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create workflow");
      }
    } catch (error) {
      console.error("Error creating workflow:", error);
      alert("Failed to create workflow");
    } finally {
      setSaving(false);
    }
  };

  const stepTypes: { type: StepType; label: string; description: string }[] = [
    { type: "send_document", label: "Send Document", description: "Send document to recipients" },
    { type: "await_signature", label: "Await Signature", description: "Wait for signatures to complete" },
    { type: "approval_gate", label: "Approval Gate", description: "Require approval before proceeding" },
    { type: "wait", label: "Wait", description: "Wait for a specified duration" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Workflows
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Workflow</h1>
        <p className="mt-2 text-gray-600">
          Design an automated workflow for your document signing process
        </p>
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
          </div>
        </div>

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

                    {/* Step-specific configuration */}
                    {step.type === "send_document" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipients
                          </label>
                          {step.config.recipients?.map((recipient: string, ridx: number) => (
                            <div key={ridx} className="flex gap-2 mb-2">
                              <input
                                type="email"
                                value={recipient}
                                onChange={(e) => {
                                  const newRecipients = [...step.config.recipients];
                                  newRecipients[ridx] = e.target.value;
                                  updateStep(index, "config", {
                                    ...step.config,
                                    recipients: newRecipients,
                                  });
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                placeholder="recipient@example.com"
                              />
                              <button
                                onClick={() => {
                                  const newRecipients = step.config.recipients.filter(
                                    (_: any, i: number) => i !== ridx
                                  );
                                  updateStep(index, "config", {
                                    ...step.config,
                                    recipients: newRecipients,
                                  });
                                }}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateStep(index, "config", {
                                ...step.config,
                                recipients: [...(step.config.recipients || []), ""],
                              });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Recipient
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Message (Optional)
                          </label>
                          <textarea
                            value={step.config.message || ""}
                            onChange={(e) =>
                              updateStep(index, "config", {
                                ...step.config,
                                message: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            placeholder="Custom message for recipients..."
                          />
                        </div>
                      </div>
                    )}

                    {step.type === "await_signature" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timeout (seconds)
                          </label>
                          <input
                            type="number"
                            value={step.config.timeout}
                            onChange={(e) =>
                              updateStep(index, "config", {
                                ...step.config,
                                timeout: parseInt(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            min="0"
                            placeholder="86400"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Time to wait for signatures (default: 24 hours)
                          </p>
                        </div>
                      </div>
                    )}

                    {step.type === "approval_gate" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approvers
                          </label>
                          {step.config.approvers?.map((approver: string, aidx: number) => (
                            <div key={aidx} className="flex gap-2 mb-2">
                              <input
                                type="email"
                                value={approver}
                                onChange={(e) => {
                                  const newApprovers = [...step.config.approvers];
                                  newApprovers[aidx] = e.target.value;
                                  updateStep(index, "config", {
                                    ...step.config,
                                    approvers: newApprovers,
                                  });
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                placeholder="approver@example.com"
                              />
                              <button
                                onClick={() => {
                                  const newApprovers = step.config.approvers.filter(
                                    (_: any, i: number) => i !== aidx
                                  );
                                  updateStep(index, "config", {
                                    ...step.config,
                                    approvers: newApprovers,
                                  });
                                }}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateStep(index, "config", {
                                ...step.config,
                                approvers: [...(step.config.approvers || []), ""],
                              });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Approver
                          </button>
                        </div>
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timeout (seconds, optional)
                          </label>
                          <input
                            type="number"
                            value={step.config.timeout || ""}
                            onChange={(e) =>
                              updateStep(index, "config", {
                                ...step.config,
                                timeout: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            min="0"
                            placeholder="Leave empty for no timeout"
                          />
                        </div>
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
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.back()}
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
            {saving ? "Creating..." : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}
