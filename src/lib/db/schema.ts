import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// NextAuth required tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  plan: text("plan").default("free").notNull(),
  companyName: text("company_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  // Custom branding (Starter+ plans)
  brandingLogoUrl: text("branding_logo_url"),
  brandingPrimaryColor: text("branding_primary_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Application tables
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  token: uuid("token").defaultRandom().notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NEW: DocuSign-style envelope system (container for multiple documents)
export const envelopes = pgTable("envelopes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  templateId: uuid("template_id").references(() => templates.id),
  name: text("name").notNull(), // renamed from "title"
  status: text("status").default("draft").notNull(), // draft, sent, in_progress, completed, declined, voided
  currentRoutingOrder: integer("current_routing_order").default(1).notNull(),
  // Email customization
  emailSubject: text("email_subject"),
  emailMessage: text("email_message"),
  // Expiration and reminders
  expiresAt: timestamp("expires_at"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  reminderDelay: integer("reminder_delay").default(3), // days before first reminder
  reminderFrequency: integer("reminder_frequency").default(3), // days between reminders
  // Completion
  completedAt: timestamp("completed_at"),
  voidedAt: timestamp("voided_at"),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("envelopes_user_id_idx").on(table.userId),
  statusIdx: index("envelopes_status_idx").on(table.status),
  teamIdIdx: index("envelopes_team_id_idx").on(table.teamId),
  templateIdIdx: index("envelopes_template_id_idx").on(table.templateId),
}));

// NEW: Individual documents within an envelope (supports multiple PDFs)
export const envelopeDocuments = pgTable("envelope_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  envelopeId: uuid("envelope_id")
    .notNull()
    .references(() => envelopes.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  pageCount: integer("page_count"),
  documentHash: text("document_hash"), // SHA-256 for integrity
  orderIndex: integer("order_index").default(1).notNull(), // order within envelope (Doc 1, Doc 2, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  envelopeIdIdx: index("envelope_documents_envelope_id_idx").on(table.envelopeId),
}));

// OLD: Keep for migration (will be renamed to documents_backup)
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  pageCount: integer("page_count"),
  status: text("status").default("draft").notNull(),
  customMessage: text("custom_message"),
  // Document integrity - SHA-256 hash of original PDF
  documentHash: text("document_hash"),
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NEW: Recipients at envelope level with DocuSign-style routing
export const envelopeRecipients = pgTable("envelope_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  envelopeId: uuid("envelope_id")
    .notNull()
    .references(() => envelopes.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  roleName: text("role_name"), // if created from template role
  routingOrder: integer("routing_order").default(1).notNull(), // DocuSign routing order
  action: text("action").default("needs_to_sign").notNull(), // needs_to_sign, needs_to_approve, receives_copy, needs_to_view
  status: text("status").default("pending").notNull(), // pending, sent, viewed, completed, declined
  signingToken: uuid("signing_token").defaultRandom().notNull(),
  // Timestamps
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  completedAt: timestamp("completed_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  // ESIGN Act compliance - consent tracking
  consentGiven: boolean("consent_given").default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  consentIpAddress: text("consent_ip_address"),
  // Audit info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  envelopeIdIdx: index("envelope_recipients_envelope_id_idx").on(table.envelopeId),
  routingOrderIdx: index("envelope_recipients_routing_order_idx").on(table.routingOrder),
  statusIdx: index("envelope_recipients_status_idx").on(table.status),
}));

// OLD: Keep for migration (will be renamed to recipients_backup)
export const recipients = pgTable("recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  orderIndex: integer("order_index").default(0).notNull(),
  status: text("status").default("pending").notNull(),
  signingToken: uuid("signing_token").defaultRandom().notNull(),
  signedAt: timestamp("signed_at"),
  viewedAt: timestamp("viewed_at"),
  ipAddress: text("ip_address"),
  // ESIGN Act compliance - consent tracking
  consentGiven: boolean("consent_given").default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  consentIpAddress: text("consent_ip_address"),
  // Browser/device info for audit
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// NEW: Fields linked to specific envelope document + recipient
export const envelopeFields = pgTable("envelope_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  envelopeDocumentId: uuid("envelope_document_id")
    .notNull()
    .references(() => envelopeDocuments.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => envelopeRecipients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // signature, initial, date, text, checkbox
  page: integer("page").default(1).notNull(),
  xPosition: integer("x_position").notNull(),
  yPosition: integer("y_position").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  required: boolean("required").default(true).notNull(),
  value: text("value"), // THIS CONTAINS SIGNATURE DATA - must be preserved!
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  envelopeDocumentIdIdx: index("envelope_fields_envelope_document_id_idx").on(table.envelopeDocumentId),
  recipientIdIdx: index("envelope_fields_recipient_id_idx").on(table.recipientId),
}));

// OLD: Keep for migration (will be renamed to document_fields_backup)
export const documentFields = pgTable("document_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => recipients.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  page: integer("page").default(1).notNull(),
  xPosition: integer("x_position").notNull(),
  yPosition: integer("y_position").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  required: boolean("required").default(true).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Templates with DocuSign-style roles
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  name: text("name").notNull(),
  description: text("description"),
  // Template documents with roles instead of specific recipients
  // Format: [{ fileUrl, fileName, orderIndex, fields: [{ type, page, x, y, width, height, roleName, required }] }]
  documents: jsonb("documents"),
  // Roles for template (replaced old fields)
  // Format: [{ name: "Manager", routingOrder: 1, action: "needs_to_sign" }, { name: "Employee", routingOrder: 2 }]
  roles: jsonb("roles"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("templates_user_id_idx").on(table.userId),
  teamIdIdx: index("templates_team_id_idx").on(table.teamId),
}));

// Audit logs - supports both old documents and new envelopes during migration
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // NEW: envelope-based logging
  envelopeId: uuid("envelope_id").references(() => envelopes.id, { onDelete: "cascade" }),
  envelopeRecipientId: uuid("envelope_recipient_id").references(() => envelopeRecipients.id),
  // OLD: document-based logging (kept for migration, will be removed after data migration)
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").references(() => recipients.id),
  // Common fields
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  envelopeIdIdx: index("audit_logs_envelope_id_idx").on(table.envelopeId),
  documentIdIdx: index("audit_logs_document_id_idx").on(table.documentId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
}));

// Workflow tables
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  name: text("name").notNull(),
  description: text("description"),
  // Workflow definition stored as JSON (steps, conditions, etc.)
  definition: jsonb("definition").notNull(),
  status: text("status").default("active").notNull(), // active, inactive, deleted
  version: text("version").default("1.0.0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("workflows_user_id_idx").on(table.userId),
  statusIdx: index("workflows_status_idx").on(table.status),
  teamIdIdx: index("workflows_team_id_idx").on(table.teamId),
}));

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  // Execution context - variables passed between steps
  context: jsonb("context"),
  currentStepIndex: integer("current_step_index").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workflowIdIdx: index("workflow_executions_workflow_id_idx").on(table.workflowId),
  documentIdIdx: index("workflow_executions_document_id_idx").on(table.documentId),
  statusIdx: index("workflow_executions_status_idx").on(table.status),
  completedAtIdx: index("workflow_executions_completed_at_idx").on(table.completedAt),
}));

export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionId: uuid("execution_id")
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  stepType: text("step_type").notNull(), // send_document, await_signature, approval_gate, conditional_branch, parallel, wait
  status: text("status").default("pending").notNull(), // pending, running, completed, failed, skipped
  assignedTo: uuid("assigned_to").references(() => users.id),
  // Step execution result (approval decision, condition result, etc.)
  result: jsonb("result"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  executionIdIdx: index("workflow_steps_execution_id_idx").on(table.executionId),
  statusIdx: index("workflow_steps_status_idx").on(table.status),
  assignedToIdx: index("workflow_steps_assigned_to_idx").on(table.assignedTo),
}));

// Approval tables
export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepId: uuid("step_id")
    .notNull()
    .references(() => workflowSteps.id, { onDelete: "cascade" }),
  mode: text("mode").default("all").notNull(), // any, all, majority
  status: text("status").default("pending").notNull(), // pending, approved, rejected, expired
  requiredApprovals: integer("required_approvals").notNull(), // number of approvals needed
  currentApprovals: integer("current_approvals").default(0).notNull(),
  currentRejections: integer("current_rejections").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  stepIdIdx: index("approval_requests_step_id_idx").on(table.stepId),
  statusIdx: index("approval_requests_status_idx").on(table.status),
  expiresAtIdx: index("approval_requests_expires_at_idx").on(table.expiresAt),
}));

export const approvalResponses = pgTable("approval_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => approvalRequests.id, { onDelete: "cascade" }),
  approverId: uuid("approver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(), // approved, rejected
  comment: text("comment"),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  requestIdIdx: index("approval_responses_request_id_idx").on(table.requestId),
  approverIdIdx: index("approval_responses_approver_id_idx").on(table.approverId),
  respondedAtIdx: index("approval_responses_responded_at_idx").on(table.respondedAt),
}));

export const approvalTokens = pgTable("approval_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => approvalRequests.id, { onDelete: "cascade" }),
  approverId: uuid("approver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  decision: text("decision").notNull(), // approved, rejected
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("approval_tokens_token_idx").on(table.token),
  requestIdIdx: index("approval_tokens_request_id_idx").on(table.requestId),
  usedIdx: index("approval_tokens_used_idx").on(table.used),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents), // OLD - for migration
  envelopes: many(envelopes), // NEW
  teams: many(teamMembers),
  templates: many(templates),
  workflows: many(workflows),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  recipients: many(recipients),
  fields: many(documentFields),
  auditLogs: many(auditLogs),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  document: one(documents, {
    fields: [recipients.documentId],
    references: [documents.id],
  }),
  fields: many(documentFields),
}));

export const documentFieldsRelations = relations(documentFields, ({ one }) => ({
  document: one(documents, {
    fields: [documentFields.documentId],
    references: [documents.id],
  }),
  recipient: one(recipients, {
    fields: [documentFields.recipientId],
    references: [recipients.id],
  }),
}));

// NEW: Envelope relations
export const envelopesRelations = relations(envelopes, ({ one, many }) => ({
  user: one(users, {
    fields: [envelopes.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [envelopes.teamId],
    references: [teams.id],
  }),
  template: one(templates, {
    fields: [envelopes.templateId],
    references: [templates.id],
  }),
  documents: many(envelopeDocuments),
  recipients: many(envelopeRecipients),
  auditLogs: many(auditLogs),
}));

export const envelopeDocumentsRelations = relations(envelopeDocuments, ({ one, many }) => ({
  envelope: one(envelopes, {
    fields: [envelopeDocuments.envelopeId],
    references: [envelopes.id],
  }),
  fields: many(envelopeFields),
}));

export const envelopeRecipientsRelations = relations(envelopeRecipients, ({ one, many }) => ({
  envelope: one(envelopes, {
    fields: [envelopeRecipients.envelopeId],
    references: [envelopes.id],
  }),
  fields: many(envelopeFields),
  auditLogs: many(auditLogs),
}));

export const envelopeFieldsRelations = relations(envelopeFields, ({ one }) => ({
  envelopeDocument: one(envelopeDocuments, {
    fields: [envelopeFields.envelopeDocumentId],
    references: [envelopeDocuments.id],
  }),
  recipient: one(envelopeRecipients, {
    fields: [envelopeFields.recipientId],
    references: [envelopeRecipients.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [workflows.teamId],
    references: [teams.id],
  }),
  executions: many(workflowExecutions),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  document: one(documents, {
    fields: [workflowExecutions.documentId],
    references: [documents.id],
  }),
  steps: many(workflowSteps),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one, many }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowSteps.executionId],
    references: [workflowExecutions.id],
  }),
  assignedUser: one(users, {
    fields: [workflowSteps.assignedTo],
    references: [users.id],
  }),
  approvalRequest: one(approvalRequests, {
    fields: [workflowSteps.id],
    references: [approvalRequests.stepId],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one, many }) => ({
  step: one(workflowSteps, {
    fields: [approvalRequests.stepId],
    references: [workflowSteps.id],
  }),
  responses: many(approvalResponses),
}));

export const approvalResponsesRelations = relations(approvalResponses, ({ one }) => ({
  request: one(approvalRequests, {
    fields: [approvalResponses.requestId],
    references: [approvalRequests.id],
  }),
  approver: one(users, {
    fields: [approvalResponses.approverId],
    references: [users.id],
  }),
}));
