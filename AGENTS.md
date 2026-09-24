<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tutor Desk project notes

- **Instructional content lives in the database**, not in source. Class plans and
  homework are built from blocks in the app's own editor. Do not add questions to
  `src/content/`.
- **To bulk-create a class plan or homework, write a CSV.** The format is
  specified in `docs/material-csv.md`; read it before writing one. The file is
  uploaded from Class plans → Import CSV or Homework → Import CSV.
- Block rules that must not be broken (answer-key privacy, `readBlocks()`, block
  id permanence) are documented in `src/content/AGENTS.md`.
