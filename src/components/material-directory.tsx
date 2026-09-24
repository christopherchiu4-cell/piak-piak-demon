"use client";

import { useMemo, useState } from "react";
import Link from "@/components/pending-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { archiveMaterial, duplicateMaterial } from "@/app/actions/teacher";
import { Chips } from "@/components/filter-chips";
import { OverflowMenu } from "@/components/overflow-menu";
import { Badge, dateLabel } from "@/components/ui";

export type MaterialRow = {
  id: string; title: string; summary: string; subject: "MATH" | "ENGLISH";
  ready: boolean; questionCount: number; points: number;
  updatedAt: string; archivedAt: string | null;
};

type Subject = "all" | "MATH" | "ENGLISH";
type State = "live" | "ready" | "draft" | "deleted";

export function MaterialDirectory({ kind, materials }: { kind: "CLASS_PLAN" | "HOMEWORK"; materials: MaterialRow[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<Subject>("all");
  const [state, setState] = useState<State>("live");
  const base = kind === "HOMEWORK" ? "/teacher/homework" : "/teacher/plans";
  const noun = kind === "HOMEWORK" ? "homework" : "class plan";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return materials
      .filter((item) => subject === "all" || item.subject === subject)
      .filter((item) => {
        if (state === "deleted") return item.archivedAt != null;
        if (item.archivedAt) return false;
        if (state === "ready") return item.ready;
        if (state === "draft") return !item.ready;
        return true;
      })
      .filter((item) => !needle || item.title.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [materials, query, subject, state]);

  if (!materials.length) {
    return <section className="card"><p className="empty-work">Nothing here yet. Create your first one and it opens straight into the editor.</p></section>;
  }

  const deletedCount = materials.filter((item) => item.archivedAt).length;
  const stateOptions: Array<{ value: State; label: string }> = [
    { value: "live", label: "All" },
    ...(kind === "HOMEWORK" ? [{ value: "ready" as State, label: "Ready" }, { value: "draft" as State, label: "Drafts" }] : []),
    ...(deletedCount ? [{ value: "deleted" as State, label: `Deleted (${deletedCount})` }] : []),
  ];

  return <>
    <div className="card catalog-toolbar">
      <input className="search-box" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${noun} by title`} aria-label={`Search ${noun}`} />
      <div className="filter-groups">
        <Chips label="Subject" value={subject} onChange={setSubject} options={[
          { value: "all", label: "All" }, { value: "MATH", label: "Math" }, { value: "ENGLISH", label: "English" },
        ]} />
        {stateOptions.length > 1 && <Chips label="Show" value={state} onChange={setState} options={stateOptions} />}
      </div>
    </div>

    <p className="row-meta board-count" role="status">{visible.length} of {materials.length} shown</p>

    {visible.length ? <div className="list">{visible.map((item) => {
      const deleted = item.archivedAt != null;
      return <div className={`list-row${deleted ? " row-deleted" : ""}`} key={item.id}>
        <div className="grow">
          <Link className="row-title" href={`${base}/${item.id}`}>{item.title}</Link>
          <p className="muted">{item.summary || "No summary yet."}</p>
          <p className="row-meta">{item.questionCount} question{item.questionCount === 1 ? "" : "s"} · {item.points} points · {deleted ? `deleted ${dateLabel(new Date(item.archivedAt!))}` : `edited ${dateLabel(new Date(item.updatedAt))}`}</p>
        </div>
        <Badge tone="blue">{item.subject === "MATH" ? "Math" : "English"}</Badge>
        {deleted ? <Badge tone="neutral">Deleted</Badge>
          : kind === "HOMEWORK" ? <Badge tone={item.ready ? "green" : "amber"}>{item.ready ? "Ready" : "Draft"}</Badge> : null}
        <OverflowMenu>
          <Link className="menu-item" href={`${base}/${item.id}`}>Edit</Link>
          <ActionForm action={duplicateMaterial} feedbackPlacement="toast" successMessage="Duplicated.">
            <input type="hidden" name="materialId" value={item.id} />
            <SubmitButton className="menu-item" pendingLabel="Copying…">Duplicate</SubmitButton>
          </ActionForm>
          {/* archiveMaterial toggles, so it is both delete and restore. */}
          <ActionForm action={archiveMaterial} feedbackPlacement="toast" successMessage={deleted ? "Restored." : "Deleted."}
            confirmMessage={deleted ? undefined : `Delete “${item.title}”? Work already assigned from it keeps its own copy and is not affected.`}>
            <input type="hidden" name="materialId" value={item.id} />
            <SubmitButton className={deleted ? "menu-item" : "menu-item danger"} pendingLabel={deleted ? "Restoring…" : "Deleting…"}>{deleted ? "Restore" : "Delete"}</SubmitButton>
          </ActionForm>
        </OverflowMenu>
      </div>;
    })}</div> : <section className="card"><p className="empty-work">Nothing matches these filters.</p></section>}
  </>;
}
