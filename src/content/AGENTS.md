# Content rules

Instructional content lives in the **database**, not in this directory. The teacher
creates and edits it in the app under Class plans and Homework. Nothing here needs a
redeploy to change a question.

## What lives here

- `blocks.ts` — the block schema. Two exports matter: `draftBlocksSchema` (lenient,
  used when saving a half-finished draft) and `blocksSchema` (strict, enforced before a
  material may be assigned). `blockProblems()` returns the human-readable list the
  editor shows.
- `topics.ts` — the topic taxonomy. Question blocks carry a free-text `topic`, and the
  editor offers these skills as suggestions. Topic strings drive `summaryByTopic`.
- `schema.ts`, `catalog.ts`, `math.ts`, `english.ts`, `plans.ts`, `legacy.ts` — **legacy.**
  They exist only so `prisma/migrate-content.ts` can seed a pre-existing database.
  Delete all six once that backfill has run in every environment.

## Rules when changing block types

1. A student must never receive an answer key. `studentBlocks()` in `src/lib/grading.ts`
   is the only boundary that strips them — add every new key-bearing field there, and
   extend the leak assertion in `tests/blocks-and-grading.test.ts` in the same change.
2. Never cast a Prisma `Json` value to `Block[]`. Read it through `readBlocks()` so a
   schema drift degrades to an empty document instead of crashing a server component.
3. Block ids are permanent. `Response.questionId` references them, so renaming or
   regenerating an id orphans a student's recorded answer.
4. Assignments hold a snapshot of their blocks. Anything that changes how blocks are
   interpreted must still make sense for snapshots written by an older version.
