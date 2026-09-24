import Link from "@/components/pending-link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { assignHomework, scheduleClass } from "@/app/actions/teacher";
import { BlockEditor } from "@/components/block-editor";
import { Modal } from "@/components/modal";
import { requireRole } from "@/lib/auth";
import { readBlocks } from "@/lib/blocks";
import { db } from "@/lib/db";
import { isAssignable } from "@/content/blocks";
import { PageHeading } from "@/components/ui";

/** Shared by /teacher/plans/[id] and /teacher/homework/[id]: same editor, different verb. */
export async function MaterialEditorPage({ id, kind }: { id: string; kind: "CLASS_PLAN" | "HOMEWORK" }) {
  await requireRole("TEACHER");
  const material = await db.material.findUnique({ where: { id } });
  if (!material || material.kind !== kind) notFound();
  const students = await db.user.findMany({ where: { role: "STUDENT", active: true, archivedAt: null }, orderBy: { displayName: "asc" } });
  const blocks = readBlocks(material.blocks);
  const ready = isAssignable(blocks);
  const backHref = kind === "HOMEWORK" ? "/teacher/homework" : "/teacher/plans";

  return <>
    <div className="row-between page-heading-row">
      <PageHeading eyebrow={<Link className="small-link" href={backHref}>&larr; {kind === "HOMEWORK" ? "All homework" : "All class plans"}</Link>} title={material.title}>
        {kind === "HOMEWORK" ? "Edit the questions, then assign it to a student." : "Edit the plan, then schedule it for a student."}
      </PageHeading>
      {kind === "HOMEWORK"
        ? <Modal label="Assign to a student" title={`Assign “${material.title}”`} className="button primary" description={ready ? "Pick a student and a due date." : "Fix the problems listed below before assigning this."}>
            <ActionForm action={assignHomework} className="form-stack" closeOnSuccess successMessage="Assigned.">
              <input type="hidden" name="materialId" value={material.id} />
              <label className="field">Student<select name="studentId" required defaultValue="">{[<option key="" value="" disabled>Choose a student</option>, ...students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)]}</select></label>
              <label className="field">Due<input name="dueAt" type="datetime-local" /></label>
              <SubmitButton className="button primary" pendingLabel="Assigning…" disabled={!ready || !students.length}>Assign homework</SubmitButton>
              {!ready && <p className="hint">This homework still has problems to fix.</p>}
              {!students.length && <p className="hint">Add a student first.</p>}
            </ActionForm>
          </Modal>
        : <Modal label="Schedule for a student" title={`Schedule “${material.title}”`} className="button primary" description="Pick a student and when the class happens.">
            <ActionForm action={scheduleClass} className="form-stack" closeOnSuccess successMessage="Scheduled.">
              <input type="hidden" name="materialId" value={material.id} />
              <label className="field">Student<select name="studentId" required defaultValue="">{[<option key="" value="" disabled>Choose a student</option>, ...students.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)]}</select></label>
              <label className="field">Date and time<input name="scheduledAt" type="datetime-local" required /></label>
              <label className="field">Title for this class<input name="title" defaultValue={material.title} /></label>
              <SubmitButton className="button primary" pendingLabel="Scheduling…" disabled={!students.length}>Schedule class</SubmitButton>
              {!students.length && <p className="hint">Add a student first.</p>}
            </ActionForm>
          </Modal>}
    </div>
    <BlockEditor material={{ id: material.id, title: material.title, summary: material.summary, subject: material.subject, topicIds: material.topicIds, kind }} blocks={blocks} />
  </>;
}
