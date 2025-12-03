"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Check,
  CreditCard,
  FileText,
  Sparkles,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { plans, plansConfig } from "@/config/plans";
import type { Plan } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [documentCount, setDocumentCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
  const [userPlan, setUserPlan] = useState<Plan>("free");
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);

  // Handle success/cancel from Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast({
        title: "Subscription successful!",
        description: "Your plan has been upgraded. Thank you for subscribing!",
      });
      // Remove query params
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (canceled === "true") {
      toast({
        title: "Subscription canceled",
        description: "You can upgrade your plan anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/billing");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;

      try {
        // Fetch document count
        const response = await fetch("/api/documents/count");
        if (response.ok) {
          const data = await response.json();
          setDocumentCount(data.count || 0);
        }

        // Fetch user profile for plan
        const profileResponse = await fetch("/api/user/profile");
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setUserPlan(profile.plan || "free");
        }

        // Fetch template count
        const templatesResponse = await fetch("/api/templates");
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setTemplateCount(Array.isArray(templates) ? templates.length : 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== "loading") {
      fetchData();
    }
  }, [session, status]);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") return;

    setIsUpgrading(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to start checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to open billing portal",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = userPlan;
  const currentPlanConfig = plansConfig[currentPlan];
  const templateLimit = currentPlanConfig.limits.templates;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You are currently on the {currentPlanConfig.name}
              </CardDescription>
            </div>
            <Badge
              variant={currentPlan === "free" ? "secondary" : "default"}
              className="text-base px-4 py-1"
            >
              {currentPlanConfig.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Documents This Month</span>
              </div>
              <p className="text-3xl font-bold">{documentCount}</p>
              <p className="text-sm text-muted-foreground">Unlimited uploads</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Billing Cycle</span>
              </div>
              <p className="text-3xl font-bold">
                ${currentPlanConfig.price}
                <span className="text-base font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              {currentPlan !== "free" && (
                <p className="text-sm text-muted-foreground">
                  Billed monthly
                </p>
              )}
            </div>
          </div>

          {/* Feature Usage */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Templates Used</span>
              <span className="text-sm text-muted-foreground">
                {templateCount} / {templateLimit === -1 ? "Unlimited" : templateLimit}
              </span>
            </div>
            {templateLimit !== -1 && (
              <>
                <Progress
                  value={(templateCount / templateLimit) * 100}
                  className="h-2"
                />
                {templateCount >= templateLimit && (
                  <p className="text-xs text-amber-600 mt-2">
                    You&apos;ve reached your template limit. Upgrade for unlimited templates.
                  </p>
                )}
              </>
            )}
            {templateLimit === -1 && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Unlimited templates available
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-4">
          {currentPlan === "free" ? (
            <Button asChild>
              <Link href="#plans">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isManaging}
            >
              {isManaging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Subscription
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Available Plans */}
      <div id="plans">
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.id === currentPlan
                  ? "border-primary"
                  : plan.popular
                  ? "border-primary/50"
                  : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.id === currentPlan && <Badge>Current</Badge>}
                  {plan.popular && plan.id !== currentPlan && (
                    <Badge variant="secondary">Popular</Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === currentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.id === "free" ? (
                  currentPlan !== "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageBilling}
                      disabled={isManaging}
                    >
                      {isManaging ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Downgrade
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isUpgrading === plan.id}
                  >
                    {isUpgrading === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {currentPlan === "free" ? "Upgrade" : "Switch Plan"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing Portal Info */}
      {currentPlan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Management</CardTitle>
            <CardDescription>
              Manage your payment method, view invoices, and update your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use the Stripe billing portal to:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Update payment method
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                View and download invoices
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Cancel or change subscription
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isManaging}
            >
              {isManaging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Open Billing Portal
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
