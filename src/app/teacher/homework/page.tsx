import { MaterialList } from "@/components/material-list";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function HomeworkPage() {
  await requireRole("TEACHER");
  const materials = await db.material.findMany({ where: { kind: "HOMEWORK" }, orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }] });
  return <MaterialList
    kind="HOMEWORK" materials={materials}
    eyebrow="Content" title="Homework" newLabel="New homework"
    intro="Build a set of questions once, then assign it to any student with a due date." />;
}
