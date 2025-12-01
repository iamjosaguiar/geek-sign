import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { plans } from "@/config/plans";

export default function PricingPage() {
  return (
    <div className="container py-24">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that&apos;s right for you. All plans include essential features
          to get documents signed quickly.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.popular ? "border-primary shadow-lg scale-105" : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded?.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <X className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link href="/signup">
                  {plan.price === 0 ? "Get Started Free" : "Start Free Trial"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl mt-24">
        <h2 className="text-2xl font-bold text-center mb-8">
          Pricing FAQ
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-2">Can I change plans later?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Is there a free trial?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, all paid plans include a 14-day free trial. No credit card required to start.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards including Visa, Mastercard, and American Express.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time. You&apos;ll retain access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise CTA */}
      <div className="mx-auto max-w-3xl mt-24 text-center">
        <Card className="bg-muted/30 border-0">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold mb-2">Need more?</h2>
            <p className="text-muted-foreground mb-6">
              For larger teams or custom requirements, contact us for a tailored solution.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
