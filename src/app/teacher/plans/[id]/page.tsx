import { MaterialEditorPage } from "@/components/material-editor-page";

export default async function EditClassPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaterialEditorPage id={id} kind="CLASS_PLAN" />;
}
