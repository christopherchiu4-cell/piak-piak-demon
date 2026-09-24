"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { assignHomework, scheduleClass } from "@/app/actions/teacher";
import { MaterialPicker, type MaterialOption } from "@/components/material-picker";

type StudentOption = { id: string; displayName: string };

function StudentSelect({ students }: { students: StudentOption[] }) {
  return <label className="field">Student
    <select name="studentId" required defaultValue="">
      <option value="" disabled>Choose a student</option>
      {students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}
    </select>
  </label>;
}

/**
 * The toggle sits outside the ActionForm on purpose: ActionForm wraps its
 * children in a <fieldset>, and only one side is mounted at a time so a single
 * set of field names is ever submitted.
 *
 * Both branches render an ActionForm in the same position, so without distinct
 * keys React reuses the tree and the picker's search, filters and selection
 * leak from homework to classes.
 */
export function AssignPanel({ students, homework, plans }: {
  students: StudentOption[];
  homework: MaterialOption[];
  plans: MaterialOption[];
}) {
  const [mode, setMode] = useState<"HOMEWORK" | "CLASS">("HOMEWORK");
  const noStudents = students.length === 0;

  if (noStudents) return <p className="empty-work">Add a student before assigning anything.</p>;

  return <>
    <div className="portal-toggle" role="tablist" aria-label="What to assign">
      <button type="button" role="tab" aria-selected={mode === "HOMEWORK"} onClick={() => setMode("HOMEWORK")}>Homework</button>
      <button type="button" role="tab" aria-selected={mode === "CLASS"} onClick={() => setMode("CLASS")}>Class</button>
    </div>

    {mode === "HOMEWORK"
      ? <ActionForm key="HOMEWORK" action={assignHomework} className="form-stack" successMessage="Assigned.">
          <StudentSelect students={students} />
          <MaterialPicker options={homework} legend="Homework" searchLabel="Search homework by title" showReadiness
            emptyHint="No homework yet. Create some under the Homework tab." />
          <label className="field">Due<input name="dueAt" type="datetime-local" /></label>
          <SubmitButton className="button primary" pendingLabel="Assigning…" disabled={!homework.some((item) => item.ready)}>Assign homework</SubmitButton>
        </ActionForm>
      : <ActionForm key="CLASS" action={scheduleClass} className="form-stack" successMessage="Scheduled.">
          <StudentSelect students={students} />
          <MaterialPicker options={plans} legend="Class plan" searchLabel="Search class plans by title"
            emptyHint="No class plans yet. Create one under the Class plans tab." />
          <label className="field">Date and time<input name="scheduledAt" type="datetime-local" required /></label>
          <SubmitButton className="button primary" pendingLabel="Scheduling…" disabled={!plans.length}>Schedule class</SubmitButton>
        </ActionForm>}
  </>;
}
