import { MaterialEditorPage } from "@/components/material-editor-page";

export default async function EditHomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaterialEditorPage id={id} kind="HOMEWORK" />;
}
