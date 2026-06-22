---
description: Run a lean code-producing loop for a feature or fix.
argument-hint: [--plan] [--review] [--test] [--auto] [--codex] <feature or fix>
---

You are the orchestrator of a lean development loop. The default path should produce code quickly:
clarify only what changes the implementation, edit the repo, run the right gates, then report.

## Request
$ARGUMENTS

## Flags
- `--plan` -> write a short plan to `docs/plans/<feature>.md` before coding.
- `--review` -> run the reviewer before finishing, even for small changes.
- `--test` -> run the end-user tester before finishing, even when e2e/manual acceptance is not obviously needed.
- `--auto` -> continue through implementation, verification, review fixes, and acceptance fixes without stopping for phase approval. Still stop for genuinely blocking ambiguity.
- `--codex` -> ask the reviewer to include a Codex/GPT second opinion if the reviewer runs.

## Default Loop

0. **Size the task yourself.**
   - If the request is clear and small, proceed directly.
   - Ask at most 1-3 questions only when the answer would materially change the build.
   - Use `--plan`, or choose planning yourself, for broad UI changes, cloud/RLS work, parser/analyzer behavior, cross-page changes, migrations, or risky refactors.

1. **Plan only when useful.**
   - Small change: write a 3-6 bullet working plan in the conversation and code.
   - Larger/riskier change: spawn `architect` and have it write `docs/plans/<feature>.md`.
   - Do not run a planning phase just to restate an obvious one-file edit.

2. **Implement.**
   - Spawn `implementer` with the request or plan path.
   - If returning from review/test feedback, pass the specific findings and ask for the smallest fix.
   - The implementer must keep changes scoped and report files changed plus verification.

3. **Verify hard gates.**
   - Always require `npm run build` and `npm run test:smoke` for app-code changes.
   - Run `npm run check:syntax` for JS/module changes.
   - Run `npm run test:e2e` after page HTML, analyzer UI, parser/analyzer core, or canvas rendering changes.
   - Do not advance with a failing build or smoke test.

4. **Review only when it buys signal.**
   - Run `reviewer` when `--review` is set, the diff is non-trivial, or the change touches shared logic, auth/cloud/RLS, parser/analyzer core, export/rendering, or migrations.
   - Save reviewer output to `docs/reviews/<feature>.md` when a plan/review artifact exists.
   - If `CHANGES_REQUESTED`, loop back to implementation with the concrete findings.

5. **Acceptance test only for user-visible behavior.**
   - Run `tester` when `--test` is set, the change affects visible flows, or review/verification leaves uncertainty about UX behavior.
   - If `FAIL`, loop back to implementation with the observed user-facing issue.

6. **Finish.**
   - Summarize changed files, verification commands, remaining risk, and any artifact paths.
   - Do not commit unless explicitly asked.

## Loop Guards
- Max 2 fix cycles after the initial implementation. If still failing, stop and explain the blocker.
- If the same issue recurs twice, stop and recommend re-planning.
- Subagents do not spawn subagents; all delegation goes through you.

## Status Format
Post concise phase updates:
`[scope: small] [implement ✓] [build ✓] [smoke ✓] [review skipped: low risk]`
