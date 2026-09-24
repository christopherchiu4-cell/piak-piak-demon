"use client";

import { useMemo, useState } from "react";
import Link from "@/components/pending-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { archiveStudent, deleteStudentForever, resetStudentCode, restoreStudent, setStudentActive } from "@/app/actions/teacher";
import { CodeField } from "@/components/code-field";
import { Modal } from "@/components/modal";
import { OverflowMenu } from "@/components/overflow-menu";
import { Badge, dateLabel } from "@/components/ui";

export type StudentRow = {
  id: string; displayName: string; login: string; accessCode: string | null;
  active: boolean; archivedAt: string | null; createdAt: string; assignedCount: number;
};

export function StudentDirectory({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      student.displayName.toLowerCase().includes(needle) || student.login.toLowerCase().includes(needle));
  }, [students, query]);

  if (!students.length) {
    return <section className="card"><p className="empty-work">No students yet. Add your first one to get started.</p></section>;
  }

  return <>
    <div className="toolbar">
      <input className="search-box" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or username" aria-label="Search students" />
      <p className="row-meta" role="status">{matches.length === students.length ? `${students.length} student${students.length === 1 ? "" : "s"}` : `${matches.length} of ${students.length}`}</p>
    </div>

    {matches.length ? <div className="list">{matches.map((student) => {
      const deleted = student.archivedAt != null;
      return <div className={`list-row${deleted ? " row-deleted" : ""}`} key={student.id}>
        <div className="grow">
          <Link className="row-title" href={`/teacher/students/${student.id}`}>{student.displayName}</Link>
          <p className="row-meta">{student.login} · {student.assignedCount} assigned · {deleted ? `deleted ${dateLabel(new Date(student.archivedAt!))}` : `added ${dateLabel(new Date(student.createdAt))}`}</p>
        </div>
        <Badge tone={deleted ? "neutral" : student.active ? "green" : "amber"}>{deleted ? "Deleted" : student.active ? "Active" : "Paused"}</Badge>
        <OverflowMenu>
          <Link className="menu-item" href={`/teacher/students/${student.id}`}>Open progress</Link>
          {deleted ? <>
            <ActionForm action={restoreStudent} feedbackPlacement="toast" successMessage="Student restored.">
              <input type="hidden" name="studentId" value={student.id} />
              <SubmitButton className="menu-item" pendingLabel="Restoring…">Restore student</SubmitButton>
            </ActionForm>
            <ActionForm action={deleteStudentForever} feedbackPlacement="toast" successMessage="Removed permanently."
              confirmMessage={`Permanently remove ${student.displayName}? Their login, every assignment, attempt and score is erased. This cannot be undone.`}>
              <input type="hidden" name="studentId" value={student.id} />
              <SubmitButton className="menu-item danger" pendingLabel="Removing…">Delete permanently</SubmitButton>
            </ActionForm>
          </> : <>
            <Modal label="Show access code" title={`${student.displayName}'s access code`} className="menu-item" description="Share this privately.">
              <p className="code-reveal">{student.accessCode ?? "Not recorded. Reset the code to issue a new one."}</p>
            </Modal>
            <Modal label="Reset code" title={`Reset code for ${student.displayName}`} className="menu-item" description="This signs them out everywhere straight away.">
              <ActionForm action={resetStudentCode} className="form-stack" closeOnSuccess successMessage="Code reset.">
                <input type="hidden" name="studentId" value={student.id} />
                <CodeField />
                <SubmitButton className="button primary" pendingLabel="Resetting…">Reset code</SubmitButton>
              </ActionForm>
            </Modal>
            <ActionForm action={setStudentActive} feedbackPlacement="toast" successMessage={student.active ? "Access paused." : "Access restored."}>
              <input type="hidden" name="studentId" value={student.id} />
              <SubmitButton className="menu-item" pendingLabel="Updating…">{student.active ? "Pause access" : "Restore access"}</SubmitButton>
            </ActionForm>
            <ActionForm action={archiveStudent} feedbackPlacement="toast" successMessage="Student deleted." confirmMessage={`Delete ${student.displayName}? Their classes, homework and scores are kept and you can restore them later.`}>
              <input type="hidden" name="studentId" value={student.id} />
              <SubmitButton className="menu-item danger" pendingLabel="Deleting…">Delete student</SubmitButton>
            </ActionForm>
          </>}
        </OverflowMenu>
      </div>;
    })}</div> : <section className="card"><p className="empty-work">No student matches “{query}”.</p></section>}
  </>;
}
