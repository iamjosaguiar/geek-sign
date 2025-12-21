// Event system for workflow automation
export type DocumentLifecycleEvent =
  | "document.created"
  | "document.sent"
  | "document.viewed"
  | "document.signed"
  | "document.completed"
  | "document.expired"
  | "document.voided";

export type WorkflowLifecycleEvent =
  | "workflow.started"
  | "workflow.step_started"
  | "workflow.step_completed"
  | "workflow.step_failed"
  | "workflow.paused"
  | "workflow.resumed"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.cancelled";

export type ApprovalEvent =
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "approval.expired"
  | "approval.completed";

export type EventType =
  | DocumentLifecycleEvent
  | WorkflowLifecycleEvent
  | ApprovalEvent;

export interface EventPayload<T = any> {
  event: EventType;
  timestamp: Date;
  userId?: string;
  documentId?: string;
  workflowId?: string;
  executionId?: string;
  stepId?: string;
  approvalRequestId?: string;
  data?: T;
}

export type EventHandler<T = any> = (payload: EventPayload<T>) => void | Promise<void>;

export interface WebhookConfig {
  id: string;
  url: string;
  events: EventType[];
  secret?: string;
  enabled: boolean;
  retryConfig?: {
    maxAttempts: number;
    initialDelay: number;
    backoffMultiplier: number;
  };
}

export class EventEmitter {
  private handlers: Map<EventType, Set<EventHandler>>;
  private webhooks: Map<string, WebhookConfig>;
  private globalHandlers: Set<EventHandler>;

  constructor() {
    this.handlers = new Map();
    this.webhooks = new Map();
    this.globalHandlers = new Set();
  }

  // Register event handler
  on<T = any>(event: EventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
  }

  // Register handler for all events
  onAny(handler: EventHandler): void {
    this.globalHandlers.add(handler);
  }

  // Unregister event handler
  off<T = any>(event: EventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  // Unregister global handler
  offAny(handler: EventHandler): void {
    this.globalHandlers.delete(handler);
  }

  // Emit event to all handlers
  async emit<T = any>(payload: EventPayload<T>): Promise<void> {
    // Call specific event handlers
    const handlers = this.handlers.get(payload.event);
    if (handlers) {
      const handlerArray = Array.from(handlers);
      for (const handler of handlerArray) {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${payload.event}:`, error);
        }
      }
    }

    // Call global handlers
    const globalHandlerArray = Array.from(this.globalHandlers);
    for (const handler of globalHandlerArray) {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error in global event handler for ${payload.event}:`, error);
      }
    }

    // Send to webhooks
    await this.sendToWebhooks(payload);
  }

  // Register webhook
  registerWebhook(config: WebhookConfig): void {
    this.webhooks.set(config.id, config);
  }

  // Unregister webhook
  unregisterWebhook(id: string): void {
    this.webhooks.delete(id);
  }

  // Get all webhooks
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  // Get webhook by ID
  getWebhook(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  // Send event to webhooks
  private async sendToWebhooks<T = any>(payload: EventPayload<T>): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.enabled && webhook.events.includes(payload.event)
    );

    for (const webhook of relevantWebhooks) {
      this.sendWebhook(webhook, payload).catch((error) => {
        console.error(`Error sending webhook to ${webhook.url}:`, error);
      });
    }
  }

  // Send single webhook with retry
  private async sendWebhook<T = any>(
    webhook: WebhookConfig,
    payload: EventPayload<T>,
    attempt: number = 1
  ): Promise<void> {
    const retryConfig = webhook.retryConfig || {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Geek-Sign-Webhooks/1.0",
        "X-Geek-Sign-Event": payload.event,
        "X-Geek-Sign-Delivery": crypto.randomUUID(),
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = await this.generateSignature(
          JSON.stringify(payload),
          webhook.secret
        );
        headers["X-Geek-Sign-Signature"] = signature;
      }

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      // Retry logic
      if (attempt < retryConfig.maxAttempts) {
        const delay =
          retryConfig.initialDelay *
          Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWebhook(webhook, payload, attempt + 1);
      }

      // Max attempts reached
      throw error;
    }
  }

  // Generate HMAC signature for webhook
  private async generateSignature(
    payload: string,
    secret: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Clear all handlers and webhooks
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
    this.webhooks.clear();
  }
}

// Global event emitter instance
export const eventEmitter = new EventEmitter();
