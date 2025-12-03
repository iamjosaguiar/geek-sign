import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment succeeded for invoice:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for invoice:", invoice.id);
        // Could send email notification here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error("Missing userId or plan in session metadata");
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  await db
    .update(users)
    .set({
      plan: plan as "starter" | "team",
      stripeSubscriptionId: subscriptionId || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`User ${userId} upgraded to ${plan} plan`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Get the plan from the price ID
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;

  if (subscription.status === "active" && plan) {
    await db
      .update(users)
      .set({
        plan: plan,
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid"
  ) {
    // Downgrade to free
    await db
      .update(users)
      .set({
        plan: "free",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  // Downgrade to free plan
  await db
    .update(users)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`User ${user.id} downgraded to free plan`);
}
