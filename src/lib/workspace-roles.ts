export const WORKSPACE_ROLES = [
  "admin",
  "project_manager",
  "member",
  "viewer",
] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export function roleLabel(role: string, locale: "ar" | "en"): string {
  const ar: Record<string, string> = {
    admin: "مدير",
    project_manager: "مدير مشاريع",
    member: "عضو",
    viewer: "مُطَّلع",
  };
  const en: Record<string, string> = {
    admin: "Admin",
    project_manager: "Project Manager",
    member: "Member",
    viewer: "Viewer",
  };
  return (locale === "ar" ? ar[role] : en[role]) ?? role;
}
