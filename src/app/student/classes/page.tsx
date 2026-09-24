import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { StudentAssignmentList } from "@/components/student-assignment-list";

export default async function StudentClassesPage() {
  const student = await requireRole("STUDENT");
  const classes = await db.assignment.findMany({
    where: { studentId: student.id, kind: "CLASS_PLAN", archivedAt: null },
    include: { attempts: { where: { deletedAt: null } } }, orderBy: { scheduledAt: "desc" },
  });
  const now = Date.now();
  const upcoming = classes.filter((item) => item.scheduledAt && item.scheduledAt.getTime() >= now).reverse();
  const past = classes.filter((item) => !item.scheduledAt || item.scheduledAt.getTime() < now);
  return <>
    <PageHeading eyebrow="Your lessons" title="Classes">See what is coming up, and look back at what you covered.</PageHeading>
    <section className="section"><h2>Coming up</h2><StudentAssignmentList assignments={upcoming} emptyMessage="No classes scheduled right now." /></section>
    {past.length > 0 && <section className="section"><h2>Past classes</h2><StudentAssignmentList assignments={past} /></section>}
  </>;
}
