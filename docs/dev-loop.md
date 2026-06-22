# Lean Development Loop

A small code-producing loop for feature and fix work in this repo. The default path is:
clarify only what matters, make the smallest correct code change, run the right gates,
review/test only when they add signal, then report.

## When To Use It

Use the loop for normal implementation work. Skip the heavier planning/review phases for
obvious one-file fixes. Add them back when the change is broad, risky, user-visible, or
security-sensitive.

## Loop

1. **Scope**
   - Read the relevant files first.
   - Ask only questions that materially change the implementation.
   - For small changes, keep the plan in the conversation.
   - For broad/risky changes, write `docs/plans/<feature>.md`.

2. **Implement**
   - Make the smallest correct change.
   - Match the existing ES module style and local patterns.
   - Keep parser/analyzer modules pure.
   - Avoid unrelated refactors.

3. **Verify**
   - App-code changes: `npm run build` and `npm run test:smoke`.
   - JS/module changes: also run `npm run check:syntax`.
   - Page HTML, analyzer UI, parser/analyzer core, or canvas rendering:
     also run `npm run test:e2e`.
   - Do not advance with a failing build or smoke test.

4. **Review**
   - Review the diff when it touches shared logic, auth/cloud/RLS, parser/analyzer core,
     export/rendering, migrations, or a non-trivial user flow.
   - Save formal review output to `docs/reviews/<feature>.md` when there is a matching
     plan/review artifact.
   - Fix only concrete blocking findings.

5. **Acceptance**
   - For visible behavior, run or inspect the app the way a user would.
   - Use Playwright screenshots when visual layout or rendering matters.
   - Judge the user-observable outcome, not just command success.

6. **Finish**
   - Summarize files changed, verification run, remaining risk, and artifact paths.
   - Do not commit unless the user explicitly asks.

## Guards

- Limit to 2 fix cycles after the initial implementation.
- Stop if the same issue recurs twice; the plan likely needs to change.
- Build and smoke failures are hard gates.
- Keep loop artifacts under `docs/{plans,reviews}/` only when they are useful.

## Claude Usage

Claude Code can run this through:

```text
/feature <request>
/feature --plan <request>
/feature --review <request>
/feature --test <request>
/feature --auto <request>
/feature --codex <request>
```

The command lives at `.claude/commands/feature.md`. Claude-specific subagents live in
`.claude/agents/`, but they follow this same loop.

## Codex Usage

Codex does not need Claude subagents to use the loop. Tell Codex to "use the lean dev
loop" or point it at this file. Codex should then:

- use this document and `AGENTS.md` as the operating contract,
- implement directly for clear/small work,
- create `docs/plans/<feature>.md` only for broad or risky changes,
- use its native code-review stance for the review step,
- run the same verification gates,
- and optionally call the GitHub/Codex tooling available in the current environment.

For a second opinion from Codex inside Claude, run `/feature --codex ...`. For Codex as
the primary agent, no flag is needed; this file is the shared process.
