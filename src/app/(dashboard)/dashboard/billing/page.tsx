"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, CreditCard, FileText, Sparkles } from "lucide-react";
import { plans, plansConfig } from "@/config/plans";
import type { Profile } from "@/types";

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentCount, setDocumentCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setProfile(profileData);
      setDocumentCount(count || 0);
      setIsLoading(false);
    };

    fetchData();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = profile?.plan || "free";
  const currentPlanConfig = plansConfig[currentPlan];

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
              <p className="text-sm text-muted-foreground">
                {currentPlan === "free" ? "Unlimited uploads" : "Unlimited"}
              </p>
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
                  Next billing date: January 1, 2025
                </p>
              )}
            </div>
          </div>

          {/* Feature Usage */}
          {currentPlan === "free" && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Templates Used</span>
                <span className="text-sm text-muted-foreground">
                  0 / 1
                </span>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Upgrade to get unlimited templates
              </p>
            </div>
          )}
        </CardContent>
        {currentPlan === "free" && (
          <CardFooter>
            <Button asChild>
              <Link href="#plans">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Link>
            </Button>
          </CardFooter>
        )}
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
                  {plan.id === currentPlan && (
                    <Badge>Current</Badge>
                  )}
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
                ) : plan.id === "free" && currentPlan !== "free" ? (
                  <Button variant="outline" className="w-full">
                    Downgrade
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.price === 0 ? "Get Started" : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {currentPlan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past invoices and payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No billing history available yet
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      {currentPlan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Manage your payment information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-muted p-2">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">
                    Expires 12/25
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
