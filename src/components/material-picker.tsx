"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chips } from "@/components/filter-chips";
import { Badge, dateLabel } from "@/components/ui";

export type MaterialOption = {
  id: string; title: string; summary: string; subject: "MATH" | "ENGLISH";
  ready: boolean; questionCount: number; points: number; createdAt: string;
};

type Subject = "all" | "MATH" | "ENGLISH";

function Row({ option, name, checked, onPick, pinned, locked }: {
  option: MaterialOption; name: string; checked: boolean; onPick: () => void; pinned?: boolean; locked?: boolean;
}) {
  return <label className={`picker-row${checked ? " picked" : ""}${locked ? " locked" : ""}`}>
    <input type="radio" name={name} value={option.id} checked={checked} onChange={onPick} disabled={locked} required />
    <span className="grow">
      <span className="row-title">{option.title}</span>
      <span className="muted">{option.summary || "No summary yet."}</span>
      <span className="row-meta">{option.questionCount} question{option.questionCount === 1 ? "" : "s"} · {option.points} points · added {dateLabel(new Date(option.createdAt))}{pinned ? " · hidden by the current filters" : ""}</span>
      {locked && <span className="row-meta">Can&rsquo;t be assigned until its problems are fixed. <Link className="small-link" href={`/teacher/homework/${option.id}`}>Open in editor</Link></span>}
    </span>
    <Badge tone="blue">{option.subject === "MATH" ? "Math" : "English"}</Badge>
    {option.ready ? null : <Badge tone="amber">Draft</Badge>}
  </label>;
}

/**
 * Picking a material is a browse, not a lookup — a teacher often knows roughly
 * what they want rather than its exact title, so this is a searchable, filtered
 * list rather than the type-ahead it replaces.
 *
 * Each row is a radio in the enclosing ActionForm, so the selection submits with
 * no client state of its own and the server actions are unchanged. A selected
 * row that the filters would hide stays pinned at the top, so narrowing the
 * search can never silently drop what was already chosen.
 *
 * With `showReadiness`, drafts are listed but locked: greyed out, unpickable and
 * sorted last, since assignHomework would refuse them anyway.
 */
export function MaterialPicker({ options, name = "materialId", legend, searchLabel, emptyHint, showReadiness }: {
  options: MaterialOption[];
  name?: string;
  legend: string;
  searchLabel: string;
  emptyHint: React.ReactNode;
  showReadiness?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<Subject>("all");
  const [pickedId, setPickedId] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options
      .filter((item) => subject === "all" || item.subject === subject)
      .filter((item) => !needle || item.title.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle))
      .sort((a, b) => (showReadiness ? Number(b.ready) - Number(a.ready) : 0) || b.createdAt.localeCompare(a.createdAt));
  }, [options, query, subject, showReadiness]);

  if (!options.length) return <div className="field"><span>{legend}</span><p className="empty-work">{emptyHint}</p></div>;

  const picked = options.find((item) => item.id === pickedId) ?? null;
  const pinned = picked && !visible.some((item) => item.id === picked.id) ? picked : null;

  return <div className="picker">
    <div className="row-between picker-head">
      <span className="picker-legend">{legend}</span>
      <span className="row-meta" role="status">{visible.length} of {options.length}</span>
    </div>
    <input className="search-box" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
      placeholder={searchLabel} aria-label={searchLabel} />
    <div className="filter-groups">
      <Chips label="Subject" value={subject} onChange={setSubject} options={[
        { value: "all", label: "All" }, { value: "MATH", label: "Math" }, { value: "ENGLISH", label: "English" },
      ]} />
    </div>

    <div className="picker-list" role="radiogroup" aria-label={legend}>
      {pinned && <Row option={pinned} name={name} checked onPick={() => setPickedId(pinned.id)} pinned />}
      {visible.map((item) => <Row key={item.id} option={item} name={name} checked={item.id === pickedId} onPick={() => setPickedId(item.id)} locked={showReadiness && !item.ready} />)}
      {!visible.length && <p className="empty-work">Nothing matches these filters.</p>}
    </div>
  </div>;
}
