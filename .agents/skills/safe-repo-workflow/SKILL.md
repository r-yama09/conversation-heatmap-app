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

## Autonomy levels (自走レベル)

Use the autonomy level stated in the user's instruction. When it is omitted, default to **Level 2**. The level permits only the investigation, repair, and revalidation described here; it never overrides the security, privacy, scope, or prohibited-operation rules in this skill.

Codex instructions can state the level concisely:

```text
自走レベル：2
```

For Level 3, the instruction must also explicitly authorize integration, normal push, and CI confirmation:

```text
自走レベル：3
main統合・通常push・CI確認を許可する
```

### Level 1 — conservative operation

- Use for high-risk work, including parser changes, IndexedDB schema changes, security work, and Git history cleanup.
- If an unexpected problem or any validation failure occurs, stop and report it. Do not investigate-and-repair autonomously.

### Level 2 — bounded investigation and repair

- For the current purpose and approved change scope, investigate the cause, repair it, and revalidate for up to **three loops**.
- May autonomously repair failures from tests, lint, build, and diff checks.
- May add necessary tests and create additional commits on the same branch when required by those repairs.
- Use for normal feature work, UI fixes, documentation, and CI fixes.

### Level 3 — delivery-authorized operation

- Includes all Level 2 permissions.
- Only when the user explicitly grants the Level 3 authorization shown above, may fast-forward integrate into `main`, perform a normal push, and confirm CI.
- If CI fails due to a minor issue caused by the current change, may repair, revalidate, and push again up to **two times**.
- Without explicit `main` integration or push authorization, do not integrate or push.

### Shared stop conditions

Stop and report before making the relevant change when any of the following applies:

- The permitted repair-loop count would be exceeded.
- Adding an external dependency is required.
- A parser, IndexedDB schema, public schema, or security-policy change is required.
- A change to a file outside the specified scope is required.
- A human decision is needed between multiple valid specifications.
- Data loss or a compatibility break may occur.
- Force push, rebase, reset, or any history rewrite is required.
- Unexpected uncommitted changes, remote updates, a Git lock, or branch inconsistency is detected.
- Access to real logs or an unapproved local location is required.

### Parallel-work rules

- Do not operate multiple Codex Chats concurrently on the same repository and working tree.
- Parallel work is allowed only when each operation uses a separate Git worktree.
- If parallel work without worktrees is detected, stop and report it.
- Even across separate worktrees, do not concurrently edit the same branch or the same file.

## Security and privacy

- Never read `D:\chatgpt-exports`, project-external logs, or real ChatGPT exports. Use only fictional or explicitly supplied anonymized data.
- Do not add conversations, export ZIPs, `.env` files, credentials, API keys, tokens, cookies, session IDs, personal data, or generated artifacts.
- Do not send data to external APIs, OpenAI APIs, analytics, cloud databases, or tracking services unless the user explicitly changes scope.
- Inspect tracked and new files for secret patterns and personal data when preparing a commit. Report only filename, line, and type; mask values.
- Mask credentials in remote URLs and reports. Do not expose environment-variable values.

## Prohibited operations

Do not run `git reset --hard`, `git clean`, `git restore`, `git checkout -- .`, force push, rebase, history rewriting, branch deletion, bulk deletion, or unapproved merge. Do not change Git configuration, remotes, hooks, `config.toml`, or run `npm audit fix --force`. Do not use `git add .`. Level 3 does not relax these prohibitions; it permits only explicitly authorized `merge --ff-only` and normal (non-force) push.

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
- Use the exact user-approved commit message. After committing, confirm `status --short --branch`, `rev-parse HEAD`, and the commit summary. Do not amend. Additional commits require authorization, except that Level 2 or 3 may create a same-branch follow-up commit needed to repair an allowed validation failure.

## Branch and merge

- Create or switch branches only when requested, preserving the requested naming convention.
- For a requested fast-forward, verify ancestry first and use only `merge --ff-only`. If it fails, stop and report the refs and reason; do not resolve with merge commits or rebase.
- Never switch to `main` or delete a branch unless the user explicitly requests it. Treat a requested `main` fast-forward as Level 3 work: require both the explicit Level 3 authorization and successful ancestry verification.

## Push and GitHub

- Push only after explicit authorization and a successful clean-tree/security review. Level 3 authorization may supply that authorization; otherwise, obtain it separately. Confirm the intended owner/repository, remote privacy when available, branch, and upstream; mask any credentials in URLs.
- For first push use the user-approved upstream form (normally `push -u origin <branch>`). Afterward compare local and remote refs and confirm no unexpected divergence.
- If GitHub CLI authentication fails, do not retry repeatedly or change credentials. Report the failure and tell the user to run `gh auth login` or refresh authentication in PowerShell before resuming.
- A non-fast-forward or remote mismatch is a stop condition; do not pull, rebase, merge, or force push to work around it.

## Completion report

Finish repository tasks with `CODEX_WORK_REPORT` (normally via the existing `work-report` skill). Include purpose, work performed, files, validation actually run, Git branch/commit/push/tree state, errors or limits, security checks, and one next recommended action. State unrun checks as `未実施` and never infer success. A report-only request may perform read-only Git checks but must not edit, stage, commit, or push. Keep the existing work-report skill as the report formatter; this skill only supplies safety workflow guidance.

## Short commands

For brief requests such as “status”, “diff”, or “can I commit?”, do not invent a full workflow. Run only the safe read-only checks needed to answer, apply the security rules, and report uncertainty explicitly.
