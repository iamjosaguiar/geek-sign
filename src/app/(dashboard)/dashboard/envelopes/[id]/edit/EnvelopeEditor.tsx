"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, ArrowUpDown, User } from "lucide-react";

interface Recipient {
  id?: string;
  name: string;
  email: string;
  routingOrder: number;
}

interface EnvelopeEditorProps {
  envelopeId: string;
  envelopeName: string;
  initialRecipients: Recipient[];
}

export function EnvelopeEditor({
  envelopeId,
  envelopeName,
  initialRecipients,
}: EnvelopeEditorProps) {
  const [recipients, setRecipients] = useState<Recipient[]>(
    initialRecipients.length > 0
      ? initialRecipients
      : [{ name: "", email: "", routingOrder: 1 }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const addRecipient = () => {
    const maxRoutingOrder = Math.max(...recipients.map((r) => r.routingOrder), 0);
    setRecipients([
      ...recipients,
      {
        name: "",
        email: "",
        routingOrder: maxRoutingOrder + 1,
      },
    ]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (
    index: number,
    field: keyof Recipient,
    value: string | number
  ) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const saveRecipients = async () => {
    // Validate
    const invalidRecipients = recipients.filter(
      (r) => !r.name.trim() || !r.email.trim()
    );
    if (invalidRecipients.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all recipient names and emails.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save recipients via API
      const response = await fetch(
        `/api/envelopes/${envelopeId}/recipients`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save recipients");
      }

      toast({
        title: "Recipients Saved",
        description: "Recipients and routing order have been saved.",
      });

      // Redirect to documents edit page for field placement
      router.push(`/dashboard/documents/${envelopeId}/edit`);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save recipients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique routing orders for the select
  const maxPossibleOrder = recipients.length;
  const routingOrderOptions = Array.from(
    { length: maxPossibleOrder },
    (_, i) => i + 1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{envelopeName}</h2>
        <p className="text-muted-foreground">
          Configure recipients and sending options
        </p>
      </div>

      {/* Set Sending Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Set Sending Options</CardTitle>
          </div>
          <CardDescription>
            Set the order recipients will receive and sign the document.
            Recipients with the same routing order will receive the envelope at
            the same time (parallel). Recipients with higher routing orders will
            only receive the envelope after previous orders complete
            (sequential).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recipients.map((recipient, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex flex-col items-center gap-2 pt-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {recipient.routingOrder}
                </Badge>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`}>Name</Label>
                  <Input
                    id={`name-${index}`}
                    placeholder="Recipient name"
                    value={recipient.name}
                    onChange={(e) =>
                      updateRecipient(index, "name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`email-${index}`}>Email</Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipient.email}
                    onChange={(e) =>
                      updateRecipient(index, "email", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`routing-${index}`}>Routing Order</Label>
                  <select
                    id={`routing-${index}`}
                    value={recipient.routingOrder.toString()}
                    onChange={(e) =>
                      updateRecipient(index, "routingOrder", parseInt(e.target.value))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {routingOrderOptions.map((order) => (
                      <option key={order} value={order.toString()}>
                        Order {order}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRecipient(index)}
                disabled={recipients.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addRecipient}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Recipient
          </Button>
        </CardContent>
      </Card>

      {/* Routing Order Explanation */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">How Routing Order Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Sequential Signing:</strong> Recipients with routing order 2
            will only receive the envelope after all routing order 1 recipients
            complete their signing.
          </p>
          <p>
            <strong>Parallel Signing:</strong> Multiple recipients with the same
            routing order (e.g., all routing order 1) will receive the envelope
            at the same time.
          </p>
          <p className="text-muted-foreground">
            This is DocuSign-style routing - perfect for approval workflows,
            witness signatures, or sequential review processes.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/envelopes/${envelopeId}`)}
        >
          Cancel
        </Button>
        <Button onClick={saveRecipients} disabled={isSaving}>
          {isSaving ? "Saving..." : "Continue to Place Fields"}
        </Button>
      </div>
    </div>
  );
}
