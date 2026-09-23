"use client";

import { usePathname } from "next/navigation";
import Link from "./pending-link";

export function PortalNavigation({ role, items }: { role: string; items: string[][] }) {
  const pathname = usePathname();
  return <nav className="side-nav" aria-label={`${role} navigation`}><p className="nav-caption">{role === "Teacher" ? "Your workspace" : "Your learning"}</p><div className="nav-items">{items.map(([label, href], index) => {
    const active = index === 0 ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}><span className="nav-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{label}</span></Link>;
  })}</div><div className="nav-note"><span aria-hidden="true">✳</span><p>Small steps.<br /><em>Brighter minds.</em></p><small>A little progress, every day.</small></div></nav>;
}
