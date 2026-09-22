import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/portal-shell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TEACHER");
  return <PortalShell role="Teacher" name={user.displayName}>{children}</PortalShell>;
}
