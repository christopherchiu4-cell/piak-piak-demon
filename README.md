# Tutor Desk

A Next.js tutoring portal with separate teacher and student views for Math and English. The teacher builds reusable **class plans** and **homework** from editable blocks, then schedules or assigns them to a student. PostgreSQL stores accounts, materials, assignments, attempts, answers, scores, teacher feedback, and after-lesson notes.

## Requirements

- Node.js 22 or 24
- pnpm 11
- A Prisma Postgres database with pooled and direct connection strings

## Local setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`: pooled Prisma Postgres URL for the application.
   - `DIRECT_URL`: direct Prisma Postgres URL for migrations.
   - `TEACHER_LOGIN`: teacher username.
   - `TEACHER_PASSWORD`: initial teacher password (10 or more characters; a longer password is recommended).
2. Run `pnpm install`.
3. Run `pnpm db:deploy` to apply the checked-in migrations.
4. Run `pnpm db:bootstrap` to create the teacher account. This does not change an existing teacher password.
5. Run `pnpm dev` and open `http://localhost:3000`.

### Upgrading a database created before 2026-09-24

Only relevant to a database that already holds assignments from the old
source-code content. `20260924_materials` is additive; `20260924_drop_legacy_content`
removes the legacy pointers. The one-off backfill has to run between them, and
`prisma migrate deploy` applies every pending migration in one pass, so the two
migrations must be separated by hand:

```
psql "$DIRECT_URL" -f prisma/migrations/20260924_materials/migration.sql
npx prisma migrate resolve --applied 20260924_materials
pnpm db:migrate-content
pnpm db:deploy
```

The backfill aborts if an assignment points at content it cannot find, and afterwards
verifies that every recorded answer still resolves to a question block. A brand-new
database needs none of this — plain `pnpm db:deploy` is correct, because there is
nothing to back up.

Once the backfill has run in every environment, delete `prisma/migrate-content.ts`,
`src/content/legacy.ts`, `tests/legacy-migration.test.ts`, and
`src/content/{schema,catalog,math,english,plans}.ts`.

## Daily teacher workflow

The teacher portal has five tabs: **Overview, Students, Class plans, Homework, Assignments.**

1. **Students** — add a student from the "Add student" dialog. Generate an access code or type one. Each row's ••• menu shows the code again, resets it, pauses access, or deletes the student. Deleting is reversible: the record and all past work are kept under "deleted students".
2. **Class plans** and **Homework** — create a material and edit it in the block editor. Blocks are: heading, text, passage, multiple choice, short answer, and fill in the blank. Every editor button saves your work before it acts, so reordering or adding a block never loses what you typed. A homework must be free of problems before it can be assigned; the badge at the top tells you.
3. **Assignments** — assign homework to a student with a due date, or schedule a class plan for a date and time.
4. Open a class to save after-lesson notes as a draft, then publish them. Drafts stay private to you.
5. **Overview** lists everything waiting on you: submitted short answers to mark, upcoming classes, and outstanding homework.
6. Click a student to see their full record: attendance, homework scores, strengths by topic, and anything sitting in the bin.

Multiple choice and fill in the blank are scored on submission; fill in the blank gives partial credit per blank and accepts numeric equivalents (`24.0` matches `24`). Short answers stay pending until you mark them. Blank answers score zero. Students see explanations immediately after submitting.

## How assigned content is versioned

Assigning or scheduling takes a **snapshot** of the material's blocks onto the assignment. Editing or deleting a material afterwards never changes work that is already out, and never breaks a submitted attempt. If nothing has been attempted yet, the assignment page offers to pull in the newer version.

## Project map

- `src/content/blocks.ts`: block schema and validation
- `src/content/topics.ts`: topic taxonomy offered in the editor
- `src/app/teacher/`: teacher portal
- `src/app/student/`: student portal
- `src/app/actions/`: authenticated server mutations
- `src/lib/grading.ts`: scoring and privacy-safe student question data
- `src/lib/block-form.ts`: parses the block editor's form and applies structural edits
- `prisma/schema.prisma`: database model
- `prisma/migrations/`: versioned PostgreSQL migrations
- `PROJECT_PLAN.md`: milestones and checkpoints

## Security and privacy

Only the server connects to PostgreSQL. Teacher passwords are hashed with scrypt and login sessions use an HTTP-only cookie with a hashed token. Student access codes are hashed **and** stored in plain text so the teacher can look one up later; this is a deliberate trade for a single-teacher install, and it means database access exposes student codes. Deleting a student ends their sessions and blocks sign-in. Server actions recheck account role and assignment ownership. Answer keys and explanations are omitted from the active student question payload. The initial implementation supports one teacher and one student but stores explicit ownership relationships so additional students can be added later.
