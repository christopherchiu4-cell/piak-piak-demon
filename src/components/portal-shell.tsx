import Link from "next/link";
import { signOut } from "@/app/actions/auth";

export function PortalShell({ role, name, children }: { role: "Teacher" | "Student"; name: string; children: React.ReactNode }) {
  const base = role === "Teacher" ? "/teacher" : "/student";
  const items = role === "Teacher"
    ? [["Overview", base], ["Students", `${base}/students`], ["Content", `${base}/content`], ["Classes", `${base}/classes`], ["Assignments", `${base}/assignments`], ["Progress", `${base}/progress`]]
    : [["Overview", base], ["Class plans", `${base}/plans`], ["Classwork", `${base}/classwork`], ["Homework", `${base}/homework`]];
  return <>
    <header className="site-header"><div className="header-inner"><Link className="brand" href={base}><span className="brand-icon">∑</span><span>Tutor Desk <small>/ {role}</small></span></Link><div className="header-user"><span>{name}</span><form action={signOut}><button className="header-signout">Sign out</button></form></div></div></header>
    <div className="shell"><nav className="side-nav" aria-label={`${role} navigation`}>{items.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><main className="main-content">{children}</main></div>
  </>;
}
