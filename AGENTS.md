<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Automatic Work Report

For every repository task that performs implementation, modification, review, diagnosis, verification, or Git operations, include a `CODEX_WORK_REPORT` in the final response so it can be pasted into ChatGPT Work.

The report must include:

1. Work summary
2. Work performed
3. Created or changed files
4. Verification results
5. Git state
6. Errors and limitations
7. Security confirmation
8. Next recommended work
9. Request for Work

Reporting rules:

- Put the report at the end of the final response in Markdown.
- Mark verification that was not run as `未実施`; never infer success.
- State whether commit and push were performed.
- Do not include real conversation contents, secrets, tokens, environment variable values, or personal information.
- Do not read `D:\chatgpt-exports`.
- Do not edit files, create commits, or push solely to produce a report.
- Read-only checks such as `git status` are allowed when needed for the report.
- Omit the report only when the user explicitly says reporting is unnecessary.
- For short answers that do not inspect or change the repository, do not add an excessive report.
- Use the detailed report when `$work-report` is explicitly requested.
