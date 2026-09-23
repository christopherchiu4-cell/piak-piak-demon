# Tutoring portal implementation plan

## Milestone 1 — Foundation

- [x] Confirm product scope: one teacher, one student, Math and English.
- [x] Choose deployment model: instructional content lives in source code and requires redeployment.
- [x] Create Next.js app, Prisma schema, environment template, and setup instructions.
- [x] Create teacher and student authentication with teacher-managed student access.

**Checkpoint:** Production build passes. The teacher account is live in Prisma Postgres, and the unauthenticated teacher route redirects to login.

## Milestone 2 — Content and scheduling

- [x] Define and validate versioned content for plans, classwork, and homework.
- [x] Add representative Math and English content from the reference pages.
- [x] Build class schedule with published plans, after-lesson notes, and linked activities.
- [x] Build teacher preview and assignment workflows.

**Checkpoint:** Source-controlled content is loaded by key and version. The temporary student smoke check rendered a linked plan and assignment from the deployed catalog.

## Milestone 3 — Student work and scoring

- [x] Show separate Class plans, Classwork, and Homework sections.
- [x] Save answers in PostgreSQL and retain all attempts.
- [x] Grade objective questions on the server and show explanations after submission.
- [x] Let the teacher reopen an assignment for a new attempt.

**Checkpoint:** A temporary submitted attempt rendered from PostgreSQL after a fresh HTTP request. The active page did not expose explanations; the submitted page did.

## Milestone 4 — Review and reporting

- [x] Let the teacher score and comment on written responses.
- [x] Show per-question, per-topic, and per-subject results with pending work distinguished from zero marks.
- [x] Verify permission boundaries, scoring, version references, and responsive layout.

**Checkpoint:** Teacher pages returned 200 with a temporary authenticated session. Four content, privacy, scoring, and credential tests pass. Written grading and feedback are ready for the first real submission.

## Local launch

- [x] Apply the initial migration to Prisma Postgres.
- [x] Create and verify the teacher account from the private `.env` file.
- [x] Launch the app on `http://127.0.0.1:3000` and verify the login page responds.

## Milestone 5 — Login and request feedback

- [x] Replace the two login forms with a responsive Student/Teacher toggle and username fields.
- [x] Add spinners, disabled controls, error feedback, and duplicate-submit guards to every action form.
- [x] Add route loading states and make autosave/submission status reliable.
- [x] Batch final answer writes and avoid unnecessary login database updates.
- [x] Verify build, slow-request behavior, role switching, autosave ordering, and local launch.

**Checkpoint:** Production build and nine automated tests pass. Browser verification covers desktop/mobile login, plain usernames, disabled controls during sign-in, and teacher-tab retention after a failed login. A live Prisma check using the largest deployed sample (five questions) verified batch grading, duplicate submission, late-autosave protection, and retained attempt history; temporary records were removed. Remote database latency still affects request duration; all user-triggered requests now have visible progress.

## Milestone 6 — Consistent portals, topic library, and submission trash

- [x] Index the three local mathematics textbooks and establish shared Math/English topic IDs.
- [x] Group the teaching library and assignment picker by subject and topic.
- [x] Extend the landing-page design across both portals and stack English reading above questions.
- [x] Add recoverable submission trash, restore controls, and filtering from student views/reports.
- [ ] Apply the additive database migration and verify trash/restore and replacement attempts.
- [ ] Verify desktop/mobile layouts, contained passage scrolling, automated tests, and production build.
- [ ] Relaunch the local app with the completed changes.

**Checkpoint:** Implementation complete; integration and browser checks in progress.

## Operating rules

- Source-controlled TypeScript content is bundled into each deployment. Published versions are append-only while referenced by assignments or attempts.
- PostgreSQL stores accounts, sessions, scheduling, assignment references, attempts, answers, scores, teacher feedback, and after-lesson notes.
- No user media uploads, external file storage, or object storage.
- An assignment reopen adds another attempt; earlier submissions remain intact.
