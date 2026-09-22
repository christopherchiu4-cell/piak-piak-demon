# Tutor Desk

A Next.js tutoring portal with separate teacher and student views for Math and English. Class plans, classwork, and homework are separate student sections. PostgreSQL stores account access, class sessions, assignments, attempts, answers, scores, teacher feedback, and after-lesson notes.

## Requirements

- Node.js 22 or 24
- pnpm 11
- A Prisma Postgres database with pooled and direct connection strings

## Local setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`: pooled Prisma Postgres URL for the application.
   - `DIRECT_URL`: direct Prisma Postgres URL for migrations.
   - `TEACHER_LOGIN`: teacher email.
   - `TEACHER_PASSWORD`: initial teacher password (10 or more characters; a longer password is recommended).
2. Run `pnpm install`.
3. Run `pnpm db:deploy` to apply the checked-in initial migration.
4. Run `pnpm db:bootstrap` to create the teacher account. This does not change an existing teacher password.
5. Run `pnpm dev` and open `http://localhost:3000`.

The `.env` file and generated Prisma client are ignored by Git. The same `DATABASE_URL` and `DIRECT_URL` must be configured as private environment variables on the serverless host. Run `pnpm db:deploy` for each database migration before deploying app code that depends on it. Do not run migrations as part of every serverless request.

## Daily teacher workflow

1. Sign in and create the student's username and private code under **Students**.
2. Schedule a class using a deployed class plan. The student sees the plan before class.
3. Assign a deployed activity as **Classwork** or **Homework**, optionally linking it to the class.
4. Save after-lesson notes as a draft, then publish them from the class page. These text notes are stored in PostgreSQL and do not need a redeploy.
5. Review submitted attempts, grade written answers, and inspect **Progress** by subject and topic.
6. To allow another attempt, use **Allow another attempt**. Previous attempts remain available.

## Publishing new instructional content

1. Add a new typed activity or class plan in `src/content/`. The existing files are examples of the required structure.
2. Register it in `src/content/catalog.ts`. Use a stable `key` and increment `version` when changing published content.
3. Keep old versions in the catalog while assignments or attempts refer to them.
4. Run `pnpm test` and `pnpm build`, then redeploy the app. The teacher's **Content** page previews what that deployment contains. There is no runtime content import or media storage.

Multiple-choice and numeric questions are scored on submission. Written answers with content remain pending until teacher review; blank answers receive zero. The student sees explanations immediately after submission. Scores update after written grading.

## Project map

- `src/content/`: versioned instructional content and validation
- `src/app/teacher/`: teacher portal
- `src/app/student/`: student portal
- `src/app/actions/`: authenticated server mutations
- `src/lib/grading.ts`: scoring and privacy-safe student question data
- `prisma/schema.prisma`: database model
- `prisma/migrations/`: versioned PostgreSQL migrations
- `PROJECT_PLAN.md`: milestones and checkpoints

## Security and privacy

Only the server connects to PostgreSQL. Teacher passwords and student codes are hashed with scrypt; login sessions use an HTTP-only cookie and a hashed token in the database. Server actions recheck account role and assignment ownership. Answer keys and explanations are omitted from the active student question payload. The initial implementation supports one teacher and one student but stores explicit ownership relationships so additional students can be added later.
