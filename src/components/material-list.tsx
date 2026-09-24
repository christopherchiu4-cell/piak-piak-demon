import { ActionForm, SubmitButton } from "@/components/action-form";
import { createMaterial, importMaterialCsv } from "@/app/actions/teacher";
import { MaterialDirectory, type MaterialRow } from "@/components/material-directory";
import { Modal } from "@/components/modal";
import { PageHeading } from "@/components/ui";
import { isAssignable, questionBlocks, totalPoints } from "@/content/blocks";
import { readBlocks } from "@/lib/blocks";

type MaterialInput = { id: string; title: string; summary: string; subject: "MATH" | "ENGLISH"; blocks: unknown; archivedAt: Date | null; updatedAt: Date };

export function MaterialList({ kind, materials, eyebrow, title, intro, newLabel }: {
  kind: "CLASS_PLAN" | "HOMEWORK";
  materials: MaterialInput[];
  eyebrow: string; title: string; intro: string; newLabel: string;
}) {
  const rows: MaterialRow[] = materials.map((item) => {
    const blocks = readBlocks(item.blocks);
    return {
      id: item.id, title: item.title, summary: item.summary, subject: item.subject,
      ready: isAssignable(blocks), questionCount: questionBlocks(blocks).length, points: totalPoints(blocks),
      updatedAt: item.updatedAt.toISOString(), archivedAt: item.archivedAt?.toISOString() ?? null,
    };
  });

  return <>
    <div className="row-between page-heading-row">
      <PageHeading eyebrow={eyebrow} title={title}>{intro}</PageHeading>
      <div className="header-actions">
        <Modal label="Import CSV" title={`Import ${kind === "HOMEWORK" ? "homework" : "a class plan"} from CSV`} className="button secondary" description="One row per question or section. The result opens in the editor for review.">
          <ActionForm action={importMaterialCsv} className="form-stack" successMessage="Imported.">
            <input type="hidden" name="kind" value={kind} />
            <label className="field">Title<input name="title" required autoFocus placeholder="What to call it" /></label>
            <label className="field">Summary<input name="summary" placeholder="One line the student sees." /></label>
            <label className="field">Subject<select name="subject" defaultValue="MATH"><option value="MATH">Math</option><option value="ENGLISH">English</option></select></label>
            <label className="field file-field">CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
            <p className="hint">Columns: type, prompt, text, title, topic, points, options, correct, accepted, rubric, explanation. See <code>docs/material-csv.md</code> for the full format.</p>
            <SubmitButton className="button primary" pendingLabel="Importing…">Import and open editor</SubmitButton>
          </ActionForm>
        </Modal>
        <Modal label={newLabel} title={newLabel} className="button primary" description="You can change any of this later.">
          <ActionForm action={createMaterial} className="form-stack" closeOnSuccess successMessage="Created.">
            <input type="hidden" name="kind" value={kind} />
            <label className="field">Title<input name="title" required autoFocus placeholder={kind === "HOMEWORK" ? "e.g. Fractions practice" : "e.g. Week 3: ratios and reading"} /></label>
            <label className="field">Summary<input name="summary" placeholder="One line the student sees." /></label>
            <label className="field">Subject<select name="subject" defaultValue="MATH"><option value="MATH">Math</option><option value="ENGLISH">English</option></select></label>
            <SubmitButton className="button primary" pendingLabel="Creating…">Create and open editor</SubmitButton>
          </ActionForm>
        </Modal>
      </div>
    </div>
    <MaterialDirectory kind={kind} materials={rows} />
  </>;
}
