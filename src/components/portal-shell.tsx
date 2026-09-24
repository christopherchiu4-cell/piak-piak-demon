import { ActionForm, SubmitButton } from "@/components/action-form";
import Link from "@/components/pending-link";
import { signOut } from "@/app/actions/auth";
import { PortalNavigation } from "./portal-navigation";

export function PortalShell({ role, name, children }: { role: "Teacher" | "Student"; name: string; children: React.ReactNode }) {
  const base = role === "Teacher" ? "/teacher" : "/student";
  const items = role === "Teacher"
    ? [["Overview", base], ["Students", `${base}/students`], ["Class plans", `${base}/plans`], ["Homework", `${base}/homework`], ["Assignments", `${base}/assignments`]]
    : [["Overview", base], ["Classes", `${base}/classes`], ["Homework", `${base}/homework`]];
  return <>
    <header className="site-header"><div className="header-inner"><Link className="brand" href={base}><span className="brand-icon">∑</span><span>Tutor Desk</span><small>{role}</small></Link><div className="header-user"><span className="user-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span><span>{name}</span><ActionForm action={signOut} successMessage="" feedbackPlacement="toast" errorMessage="Couldn’t sign out. Please try again."><SubmitButton className="header-signout" pendingLabel="Signing out…">Sign out</SubmitButton></ActionForm></div></div></header>
    <div className="shell"><PortalNavigation role={role} items={items} /><main className="main-content">{children}</main></div>
  </>;
}
