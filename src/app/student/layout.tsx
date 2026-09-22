import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/portal-shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  return <PortalShell role="Student" name={user.displayName}>{children}</PortalShell>;
}
