import { ActionForm, SubmitButton } from "@/components/action-form";
import { saveMaterial } from "@/app/actions/teacher";
import { blockLabels, blockProblems, promptBlankCount, type Block } from "@/content/blocks";
import { joinAccepted } from "@/lib/block-form";
import { SubjectField, SubjectProvider, TopicInput, TopicSuggestions } from "@/components/subject-field";
import { Badge } from "@/components/ui";

/**
 * The editor keeps no client state. Every structural control is a submit button
 * carrying `op`, so a click both applies the change and saves everything typed so
 * far. That costs one round trip per edit and buys progressive enhancement, no
 * unsaved-work loss, and no client/server block-shape drift.
 */

function QuestionFields({ at, block }: { at: string; block: Extract<Block, { points: number }> }) {
  return <>
    <label className="field">Question<textarea name={`${at}.prompt`} defaultValue={block.prompt} rows={2} placeholder="What are you asking?" /></label>
    <div className="field-pair">
      <label className="field">Topic<TopicInput name={`${at}.topic`} defaultValue={block.topic} /></label>
      <label className="field">Points<input name={`${at}.points`} type="number" min={1} max={100} defaultValue={block.points} /></label>
    </div>
  </>;
}

function BlockBody({ at, index, block }: { at: string; index: number; block: Block }) {
  if (block.type === "heading") return <label className="field">Heading<input name={`${at}.text`} defaultValue={block.text} placeholder="Section title" /></label>;
  if (block.type === "text") return <label className="field">Text<textarea name={`${at}.body`} defaultValue={block.body} rows={3} placeholder="Notes, instructions, or lesson bullets" /></label>;
  if (block.type === "passage") return <>
    <label className="field">Passage title<input name={`${at}.title`} defaultValue={block.title} placeholder="Optional" /></label>
    <label className="field">Passage<textarea name={`${at}.body`} defaultValue={block.body} rows={8} placeholder="Paste the reading text. Blank lines separate paragraphs." /></label>
  </>;
  if (block.type === "mcq") return <>
    <QuestionFields at={at} block={block} />
    <fieldset className="option-list"><legend>Options — select the correct one</legend>
      {block.options.map((option, optionIndex) => <div className="option-row" key={option.id}>
        <input type="hidden" name={`${at}.options.${optionIndex}.id`} value={option.id} />
        <input type="radio" name={`${at}.correctOptionId`} value={option.id} defaultChecked={block.correctOptionId === option.id} aria-label={`Option ${optionIndex + 1} is correct`} />
        <input name={`${at}.options.${optionIndex}.text`} defaultValue={option.text} placeholder={`Option ${optionIndex + 1}`} />
        {block.options.length > 2 && <SubmitButton className="text-button" name="op" value={`removeOption:${index}:${optionIndex}`} pendingLabel="…">Remove</SubmitButton>}
      </div>)}
      <SubmitButton className="button subtle" name="op" value={`addOption:${index}`} pendingLabel="Adding…">Add option</SubmitButton>
    </fieldset>
    <label className="field">Explanation shown after submission<textarea name={`${at}.explanation`} defaultValue={block.explanation} rows={2} /></label>
  </>;
  if (block.type === "short") return <>
    <QuestionFields at={at} block={block} />
    <label className="field">Marking rubric, one point per line<textarea name={`${at}.rubric`} defaultValue={block.rubric.join("\n")} rows={3} placeholder={"Identifies the main idea.\nSupports it with evidence."} /></label>
    <label className="field">Explanation shown after submission<textarea name={`${at}.explanation`} defaultValue={block.explanation} rows={2} /></label>
    <p className="hint">You grade this one by hand. It lands in the Overview grading queue on submission.</p>
  </>;
  const markers = promptBlankCount(block.prompt);
  return <>
    <QuestionFields at={at} block={block} />
    <p className="hint">{markers ? `Using ${markers} {{n}} marker${markers === 1 ? "" : "s"} in the question.` : "Write {{1}}, {{2}} in the question to place blanks inline. Without markers the blank appears at the end."}</p>
    <fieldset className="option-list"><legend>Accepted answers, comma separated</legend>
      {block.blanks.map((blank, blankIndex) => <div className="option-row" key={blank.id}>
        <input type="hidden" name={`${at}.blanks.${blankIndex}.id`} value={blank.id} />
        <span className="blank-number">{blankIndex + 1}</span>
        <input name={`${at}.blanks.${blankIndex}.accepted`} defaultValue={joinAccepted(blank.accepted)} placeholder="24, 24.0" />
        {block.blanks.length > 1 && <SubmitButton className="text-button" name="op" value={`removeBlank:${index}:${blankIndex}`} pendingLabel="…">Remove</SubmitButton>}
      </div>)}
      <SubmitButton className="button subtle" name="op" value={`addBlank:${index}`} pendingLabel="Adding…">Add blank</SubmitButton>
    </fieldset>
    <label className="checkbox-field"><input type="checkbox" name={`${at}.caseSensitive`} defaultChecked={block.caseSensitive} /> Match capitalisation exactly</label>
    <label className="field">Explanation shown after submission<textarea name={`${at}.explanation`} defaultValue={block.explanation} rows={2} /></label>
  </>;
}

export function BlockEditor({ material, blocks }: {
  material: { id: string; title: string; summary: string; subject: "MATH" | "ENGLISH"; topicIds: string[]; kind: "CLASS_PLAN" | "HOMEWORK" };
  blocks: Block[];
}) {
  const problems = blockProblems(blocks);
  const ready = problems.length === 0;
  const addable: Array<Block["type"]> = material.kind === "HOMEWORK"
    ? ["mcq", "fill", "short", "passage", "text", "heading"]
    : ["heading", "text", "passage", "mcq", "fill", "short"];
  return <ActionForm action={saveMaterial} className="block-editor" successMessage="Saved.">
    <SubjectProvider initial={material.subject}>
    <TopicSuggestions />
    <input type="hidden" name="materialId" value={material.id} />
    <section className="card">
      <div className="row-between"><h2>Details</h2>{ready ? <Badge tone="green">Ready to assign</Badge> : <Badge tone="amber">{problems.length} to fix</Badge>}</div>
      <label className="field">Title<input name="title" defaultValue={material.title} required /></label>
      <label className="field">Summary<textarea name="summary" defaultValue={material.summary} rows={2} placeholder="One line the student sees in their list." /></label>
      <SubjectField selectedTopicIds={material.topicIds} />
      {!ready && <details className="info-note"><summary>{problems.length} thing{problems.length === 1 ? "" : "s"} to fix before this can be assigned</summary>
        <ul>{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
      </details>}
    </section>

    {blocks.map((block, index) => {
      const at = `blocks.${index}`;
      return <section className="card block-row" key={block.id}>
        <input type="hidden" name={`${at}.type`} value={block.type} />
        <input type="hidden" name={`${at}.id`} value={block.id} />
        <div className="row-between">
          <p className="block-kind"><span className="block-number">{index + 1}</span>{blockLabels[block.type]}</p>
          <div className="block-toolbar">
            <SubmitButton className="text-button" name="op" value={`up:${index}`} pendingLabel="…" disabled={index === 0} aria-label="Move up">↑</SubmitButton>
            <SubmitButton className="text-button" name="op" value={`down:${index}`} pendingLabel="…" disabled={index === blocks.length - 1} aria-label="Move down">↓</SubmitButton>
            <SubmitButton className="text-button danger" name="op" value={`remove:${index}`} pendingLabel="…">Remove</SubmitButton>
          </div>
        </div>
        <BlockBody at={at} index={index} block={block} />
      </section>;
    })}

    {!blocks.length && <p className="empty-work">Nothing here yet. Add your first block below.</p>}

    <section className="card">
      <h2>Add a block</h2>
      <div className="block-add">{addable.map((type) => <SubmitButton className="button subtle" name="op" value={`add:${type}`} key={type} pendingLabel="Adding…">{blockLabels[type]}</SubmitButton>)}</div>
      <p className="hint">Every button here saves your work first, so nothing you have typed is lost.</p>
    </section>

    <div className="editor-footer"><SubmitButton className="button primary" name="op" value="" pendingLabel="Saving…">Save</SubmitButton></div>
    </SubjectProvider>
  </ActionForm>;
}
