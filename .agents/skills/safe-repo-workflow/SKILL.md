---
name: safe-repo-workflow
description: "Use before repository implementation, diagnosis, verification, Git staging/commit, branching, dependency changes, audits, or push to confirm clean state, protect secrets, choose validation, and finish with CODEX_WORK_REPORT."
---

# Safe Repository Workflow

Use this skill before work that edits files, diagnoses or verifies code, changes dependencies, stages or commits, creates branches, audits, or pushes. For a short read-only question, apply only the relevant checks. Newer user instructions override routine order, but secret protection and destructive-operation bans remain mandatory.

## Preflight

- Work only in the requested repository. Confirm `Get-Location`, the expected branch, and the expected base `HEAD` before editing.
- On Windows use this form for every Git command:
  ```powershell
  $git = "C:\Program Files\Git\cmd\git.exe"
  $repo = "D:/projects/conversation-heatmap-app"
  & $git -c "safe.directory=$repo" -C $repo <command>
  ```
- Inspect `status --short --branch`, `branch --show-current`, `rev-parse HEAD`, `diff --name-status`, `diff --cached --name-status`, `ls-files --others --exclude-standard`, `branch -vv`, and `remote -v` as applicable.
- For main/feature synchronization, verify ancestry with `merge-base --is-ancestor` and record both refs before changing branches.
- Stop without editing when the requested branch/base is wrong, staged work is unexpected, user changes are outside scope, or a required fast-forward is impossible. Never overwrite or hide user work.

## Security and privacy

- Never read `D:\chatgpt-exports`, project-external logs, or real ChatGPT exports. Use only fictional or explicitly supplied anonymized data.
- Do not add conversations, export ZIPs, `.env` files, credentials, API keys, tokens, cookies, session IDs, personal data, or generated artifacts.
- Do not send data to external APIs, OpenAI APIs, analytics, cloud databases, or tracking services unless the user explicitly changes scope.
- Inspect tracked and new files for secret patterns and personal data when preparing a commit. Report only filename, line, and type; mask values.
- Mask credentials in remote URLs and reports. Do not expose environment-variable values.

## Prohibited operations

Do not run `git reset --hard`, `git clean`, `git restore`, `git checkout -- .`, force push, rebase, history rewriting, branch deletion, bulk deletion, or unapproved merge. Do not change Git configuration, remotes, hooks, `config.toml`, or run `npm audit fix --force`. Do not use `git add .`.

## Change and dependency rules

- Change only files explicitly in scope; preserve unrelated modifications and avoid broad mechanical rewrites.
- Keep parser and analytics/domain logic outside React components when extending the app.
- Do not install, update, or add libraries unless explicitly authorized. Treat `package.json` and lockfiles as protected during docs, review, and Git-only tasks.
- Do not commit `node_modules`, `.next`, logs, temporary files, or local data. If a requested operation would require deleting files, stop and ask.

## Validation

- Choose checks proportionate to the change. For source changes run the applicable tests, lint, and build; for dependency work also run `npm audit` and `npm audit --omit=dev`; for docs/skill-only work at minimum run `git diff --check` and the relevant validator.
- Never claim a check passed unless it was run in the current task. Do not rerun expensive checks merely to produce a report when the user asked for reporting only; mark them unverified.
- Inspect the final diff for scope, accidental generated files, secrets, real logs, and mobile/accessibility regressions when UI changes are involved.

## Stage and commit

- Stage explicit, reviewed paths only. Confirm `diff --cached`, `diff --cached --check`, and the cached file list before committing.
- Ensure `package.json`, lockfiles, unrelated app files, secrets, real logs, and generated files are absent unless explicitly requested.
- Use the exact user-approved commit message. After committing, confirm `status --short --branch`, `rev-parse HEAD`, and the commit summary. Do not amend or create extra commits without authorization.

## Branch and merge

- Create or switch branches only when requested, preserving the requested naming convention.
- For a requested fast-forward, verify ancestry first and use only `merge --ff-only`. If it fails, stop and report the refs and reason; do not resolve with merge commits or rebase.
- Never switch to `main` or delete a branch unless the user explicitly requests it.

## Push and GitHub

- Push only after explicit authorization and a successful clean-tree/security review. Confirm the intended owner/repository, remote privacy when available, branch, and upstream; mask any credentials in URLs.
- For first push use the user-approved upstream form (normally `push -u origin <branch>`). Afterward compare local and remote refs and confirm no unexpected divergence.
- If GitHub CLI authentication fails, do not retry repeatedly or change credentials. Report the failure and tell the user to run `gh auth login` or refresh authentication in PowerShell before resuming.
- A non-fast-forward or remote mismatch is a stop condition; do not pull, rebase, merge, or force push to work around it.

## Completion report

Finish repository tasks with `CODEX_WORK_REPORT` (normally via the existing `work-report` skill). Include purpose, work performed, files, validation actually run, Git branch/commit/push/tree state, errors or limits, security checks, and one next recommended action. State unrun checks as `未実施` and never infer success. A report-only request may perform read-only Git checks but must not edit, stage, commit, or push. Keep the existing work-report skill as the report formatter; this skill only supplies safety workflow guidance.

## Short commands

For brief requests such as “status”, “diff”, or “can I commit?”, do not invent a full workflow. Run only the safe read-only checks needed to answer, apply the security rules, and report uncertainty explicitly.
