import { MaterialList } from "@/components/material-list";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ClassPlansPage() {
  await requireRole("TEACHER");
  const materials = await db.material.findMany({ where: { kind: "CLASS_PLAN" }, orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }] });
  return <MaterialList
    kind="CLASS_PLAN" materials={materials}
    eyebrow="Content" title="Class plans" newLabel="New class plan"
    intro="Reusable outlines of what you teach. Schedule one for a student from Assignments." />;
}
