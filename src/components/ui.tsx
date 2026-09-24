export function PageHeading({ eyebrow, title, children }: { eyebrow: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" | "green" | "amber" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function dateLabel(date: Date | null | undefined) {
  return date ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(date) : "No date";
}

export function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return <div className="card stat"><strong>{value}</strong><span>{label}</span></div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <section className="card"><p className="empty-work">{children}</p></section>;
}
