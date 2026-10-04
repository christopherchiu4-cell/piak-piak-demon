---
name: deploy
description: Validate and deploy the latest intended Tutor Desk changes by committing them to GitHub main, where the connected Vercel project deploys automatically. Use whenever the user says “deploy” in this tutoring-portal project or explicitly invokes $deploy.
---

# Deploy Tutor Desk

Deploy `/Users/christopherchiu/Desktop/FANRUO/tutoring-portal` through its existing GitHub `origin`. The production branch is `main`; the user states that pushes to GitHub trigger Vercel automatically.

The word `deploy` is authorization to validate, commit the intended current app changes, and push them to `origin/main`. It is not authorization to force-push, discard work, expose secrets, rewrite published history, change hosting providers, or include unrelated files.

## Inspect first

Read the repository `AGENTS.md` files that apply to changed files. Then inspect:

- the current branch, `git status --short`, and all tracked and untracked changes;
- `git diff`, `git diff --cached`, recent commits, and the `origin` URL;
- whether a merge, rebase, or unresolved conflict is in progress;
- whether the local branch is ahead of or behind `origin/main` after fetching.

Treat existing user changes as valuable. Never use `git reset --hard`, destructive checkout commands, force-push, or an automatic stash. Do not amend a pre-existing commit unless the user explicitly asks.

## Select deployment content

Deploy the coherent app version the user asked for. Stage files explicitly after reviewing them; do not use a blind `git add -A` when unrelated files are present.

Never commit `.env` files, credentials, database URLs, tokens, `node_modules`, `.next`, local caches, textbook PDFs, or generated lesson/homework CSV exports. Do not include unrelated agent/plugin cache folders merely because they are untracked. Project source, tests, documentation, dependency manifests, database migrations, and deliberately created project-scoped `.codex/skills` may be included when they are part of the current change.

If it is genuinely unclear whether a material file belongs in the release and including it could expose private data or unrelated work, stop and ask one concise question. Otherwise make a conservative, evidence-based selection and continue.

## Validate before pushing

Use the installed project commands from the repository root:

1. `pnpm test`
2. `pnpm typecheck`
3. `pnpm build`

Fix failures caused by the intended changes when the correction is safely in scope, then rerun the failed check and the production build. Do not push a known failing build. If failure depends on missing credentials, an unavailable database, or unrelated broken work, report the blocker instead of weakening the checks.

Review the final staged diff and scan staged paths and content for secrets before committing. Generate a concise commit message that describes the actual release. If there are no new changes, do not create an empty commit; deploy the current `HEAD` only if it is not already on `origin/main`.

## Synchronize and deploy

Fetch `origin/main` before pushing. If the validated local commit is behind, rebase it onto `origin/main`; stop and report any conflict rather than resolving unrelated code by guesswork. Push with a normal fast-forward command to `origin/main`. Never force-push.

After pushing:

1. Confirm that `refs/heads/main` on `origin` resolves to the local commit SHA.
2. Check available GitHub commit statuses or checks for that SHA and identify the Vercel deployment when accessible.
3. If a Vercel URL or configured production URL is available, open it and perform a small read-only smoke check.
4. If the GitHub push is confirmed but Vercel status cannot be read with the available authentication or tools, state that GitHub received the commit and the configured integration should have been triggered; do not claim Vercel success without evidence.

Finish with the commit SHA, GitHub commit link, validation results, and verified Vercel status or the precise verification limitation.
