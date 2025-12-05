// Super admin email addresses
// These users get free Team plan access and can manage all users
export const SUPER_ADMIN_EMAILS = [
  "jos@profitgeeks.com.au",
  "admin@ambrit.com.au",
] as const;

export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase() as typeof SUPER_ADMIN_EMAILS[number]);
}
