"use client";

import { useMemo, useState } from "react";
import Link from "@/components/pending-link";
import { Badge, dateLabel } from "@/components/ui";

export type BoardRow = {
  id: string; title: string; kind: "CLASS_PLAN" | "HOMEWORK"; subject: "MATH" | "ENGLISH";
  studentId: string; studentName: string;
  scheduledAt: string | null; dueAt: string | null; createdAt: string;
  attendedAt: string | null; submitted: boolean; started: boolean;
};

type Status = "upcoming" | "all" | "done";

/** A class is dated by when it happens, homework by when it is due. */
function whenOf(row: BoardRow) {
  return new Date(row.scheduledAt ?? row.dueAt ?? row.createdAt).getTime();
}

function isComplete(row: BoardRow, now: number) {
  return row.kind === "HOMEWORK" ? row.submitted : row.attendedAt != null || whenOf(row) < now;
}

function statusBadge(row: BoardRow, now: number) {
  if (row.kind === "CLASS_PLAN") {
    if (row.attendedAt) return { tone: "green" as const, label: "Attended" };
    return whenOf(row) < now ? { tone: "amber" as const, label: "Not marked" } : { tone: "neutral" as const, label: "Scheduled" };
  }
  if (row.submitted) return { tone: "green" as const, label: "Submitted" };
  if (row.dueAt && new Date(row.dueAt).getTime() < now) return { tone: "amber" as const, label: "Overdue" };
  return { tone: "neutral" as const, label: row.started ? "In progress" : "Not started" };
}

function Chips<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (next: T) => void; options: Array<{ value: T; label: string }>;
}) {
  return <div className="filter-chips" role="group" aria-label={label}>
    <span className="filter-chips-label">{label}</span>
    {options.map((option) => <button key={option.value} type="button" className="chip"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

export function AssignmentBoard({ rows }: { rows: BoardRow[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "CLASS_PLAN" | "HOMEWORK">("all");
  const [status, setStatus] = useState<Status>("upcoming");
  const now = Date.now();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => kind === "all" || row.kind === kind)
      .filter((row) => status === "all" || (status === "done" ? isComplete(row, now) : !isComplete(row, now)))
      .filter((row) => !needle || row.title.toLowerCase().includes(needle) || row.studentName.toLowerCase().includes(needle))
      .sort((a, b) => whenOf(a) - whenOf(b));
  }, [rows, query, kind, status, now]);

  return <>
    <div className="card catalog-toolbar">
      <input className="search-box" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title or student name" aria-label="Search assignments" />
      <div className="filter-groups">
        <Chips label="Type" value={kind} onChange={setKind} options={[
          { value: "all", label: "All" }, { value: "CLASS_PLAN", label: "Class" }, { value: "HOMEWORK", label: "Homework" },
        ]} />
        <Chips label="Status" value={status} onChange={setStatus} options={[
          { value: "upcoming", label: "Upcoming" }, { value: "done", label: "Completed" }, { value: "all", label: "All" },
        ]} />
      </div>
    </div>

    <p className="row-meta board-count" role="status">{visible.length} of {rows.length} shown</p>

    {visible.length ? <div className="list">{visible.map((row) => {
      const badge = statusBadge(row, now);
      const when = row.kind === "CLASS_PLAN"
        ? dateLabel(row.scheduledAt ? new Date(row.scheduledAt) : null)
        : row.dueAt ? `Due ${dateLabel(new Date(row.dueAt))}` : "No due date";
      return <div className="list-row" key={row.id}>
        <div className="grow">
          <Link className="row-title" href={`/teacher/assignments/${row.id}`}>{row.title}</Link>
          <p className="row-meta">{row.studentName} · {when}</p>
        </div>
        <Badge tone="blue">{row.kind === "CLASS_PLAN" ? "Class" : "Homework"}</Badge>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>;
    })}</div> : <section className="card"><p className="empty-work">Nothing matches these filters.</p></section>}
  </>;
}
