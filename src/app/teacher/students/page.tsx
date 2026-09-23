import { ActionForm, SubmitButton } from "@/components/action-form";
import { createStudent, resetStudentCode, setStudentActive } from "@/app/actions/teacher";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, PageHeading } from "@/components/ui";

export default async function StudentsPage() {
  await requireRole("TEACHER");
  const students = await db.user.findMany({ where: { role: "STUDENT" }, orderBy: { createdAt: "asc" } });
  return <><PageHeading eyebrow="Access management" title="Students">Create a private login, reset its code, or pause access.</PageHeading>
    <div className="two-column"><section className="card"><h2>Add student</h2><ActionForm action={createStudent} className="form-stack"><label>Student name<input name="displayName" required /></label><label>Username<input name="login" minLength={3} required autoCapitalize="none" /></label><label>Private code<input name="code" type="text" minLength={8} required autoComplete="off" /></label><SubmitButton className="button primary" pendingLabel="Creating…">Create access</SubmitButton></ActionForm><p className="hint">Share the username and code privately. Codes are stored as hashes and cannot be viewed later.</p></section><section className="card"><h2>Current students</h2>{students.length ? students.map((student) => <div className="student-management" key={student.id}><div className="row-between"><div><strong>{student.displayName}</strong><p className="muted">Username: {student.login}</p></div><Badge tone={student.active ? "green" : "amber"}>{student.active ? "Active" : "Paused"}</Badge></div><ActionForm action={resetStudentCode} className="inline-form"><input type="hidden" name="studentId" value={student.id} /><label>New code<input name="code" type="text" minLength={8} required autoComplete="off" /></label><SubmitButton className="button secondary" pendingLabel="Resetting…">Reset code</SubmitButton></ActionForm><ActionForm action={setStudentActive}><input type="hidden" name="studentId" value={student.id} /><SubmitButton className="text-button" pendingLabel="Updating…">{student.active ? "Pause access" : "Restore access"}</SubmitButton></ActionForm></div>) : <p className="muted">No student account yet.</p>}</section></div>
  </>;
}
