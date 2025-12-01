export type Plan = "free" | "starter" | "team";

export type DocumentStatus = "draft" | "pending" | "completed" | "voided";

export type RecipientStatus = "pending" | "viewed" | "signed" | "declined";

export type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  custom_branding: CustomBranding | null;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomBranding {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  custom_branding: CustomBranding | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  invited_at: string;
  accepted_at: string | null;
  profile?: Profile;
}

export interface Document {
  id: string;
  owner_id: string;
  team_id: string | null;
  title: string;
  file_path: string;
  file_size: number | null;
  page_count: number | null;
  status: DocumentStatus;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string | null;
  recipients?: Recipient[];
  fields?: DocumentField[];
}

export interface Recipient {
  id: string;
  document_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  signing_order: number;
  status: RecipientStatus;
  access_token: string;
  signed_at: string | null;
  viewed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DocumentField {
  id: string;
  document_id: string;
  recipient_id: string;
  type: FieldType;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  value: string | null;
  font_size: number | null;
  created_at: string;
}

export interface Template {
  id: string;
  owner_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  file_path: string;
  fields: TemplateField[] | null;
  recipient_roles: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  type: FieldType;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  role_index: number; // Which recipient role this field belongs to
}

export interface AuditLog {
  id: string;
  document_id: string;
  recipient_id: string | null;
  action: AuditAction;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type AuditAction =
  | "created"
  | "sent"
  | "viewed"
  | "signed"
  | "completed"
  | "voided"
  | "declined"
  | "reminder_sent";

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Form types
export interface CreateDocumentInput {
  title: string;
  file: File;
}

export interface AddRecipientInput {
  email: string;
  name?: string;
  phone?: string;
  signing_order?: number;
}

export interface AddFieldInput {
  recipient_id: string;
  type: FieldType;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
}
