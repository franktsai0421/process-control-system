# PROCESS OS Development Rules

These rules apply to the whole repository.

## Before development

- Frank and employees use work branches and Pull Requests for every change. Never directly or force push main, delete main or use Owner/admin privileges to bypass the daily workflow. CI passing still requires Frank's review and final merge.
- This Private repository uses GitHub Free without server-side Branch Protection. Local pre-push hooks only prevent mistakes; Write collaborators can technically push main or merge PRs, but company rules prohibit it. Do not retry paid protection, change visibility, invite employees or merge without Frank's applicable authorization.

- Inspect the current implementation before editing. Identify the smallest set of modules and files required by the request.
- Reuse existing components, utilities, APIs, data flows, and business rules before adding alternatives.
- Keep each task to the minimum necessary change. Do not perform unrelated refactors or redesigns.
- Preserve backward compatibility and existing production data. Never invent schema, entities, features, or behavior to satisfy documentation.
- Treat verified current code and schema as the source of truth when documentation disagrees.

- Use the complete release procedure in `DEPLOYMENT.md` for every Staging or approved Production release: verify latest reviewed main/SHA and target DB/R2 bindings, backup and restore-test target D1 before mutations, then code, migrations, full Canonical sync, safe passwordless demo seed, immutable images and Smoke Test. A code-only upload or Git merge is not a complete release. Preserve non-managed records/credentials/history and require Frank's applicable Production approval for the exact main SHA.
- In this project, a request to publish a new or updated web page means publishing the exact approved merged source to the existing ChatGPT Site URL recorded in `.openai/hosting.json`, not only pushing GitHub or deploying the separate Workers URL. Unless Frank explicitly names another target, keep that ChatGPT Site URL and its audience/bindings, then verify the live URL after publication.

## Data and security

- Do not alter production records, seed data, credentials, backup contents, or deployment access unless the task explicitly requires it.
- Do not expose passwords, API keys, tokens, backup encryption keys, or private user data in documentation, logs, tests, or completion reports.
- Preserve the existing D1 binding name `DB`, shared-state revision checks, role enforcement, backup safeguards, and approval gates unless the request directly changes them.
- Test data changes with isolated fixtures. Remove test artifacts after verification.

## UI and mobile acceptance

- Every new or changed form, dialog, modal, navigation item, workflow, editor, table, and action must be checked for common iPhone-size use as well as desktop use.
- Check touch targets, text readability, focus and keyboard access, virtual-keyboard obstruction, scrolling distance, horizontal overflow, table/canvas usability, and access to Save/Confirm/Cancel.
- Avoid hover-only behavior and actions that require excessive scrolling. Do not fix one viewport by breaking the other.
- Preserve Traditional Chinese and Vietnamese localization compatibility.

## Testing

- Run the relevant existing checks before completion and assess regression risk to unrelated flows.
- UI changes require a mobile-behavior check. Never report a test as passing if it was not run.
- If a required check is unavailable, state that clearly in the completion report.

## Documentation impact check

Before completing every development task:

1. Finish and verify the code change.
2. Decide which documentation is actually affected.
3. Update only the affected files below.
4. Replace or remove obsolete current-state text instead of appending contradictory descriptions.
5. Confirm planned behavior is not described as implemented.
6. Remove duplication and keep the documents concise.

Documentation rules:

- `AI_CONTEXT/AI_CONTEXT.md`: update when functionality, user-visible behavior, flows, major modules, permissions, important UI/mobile behavior, capabilities, or limitations change. It describes current state, not history.
- `AI_CONTEXT/DATA_MODEL.md`: update only for schema, entities, important fields, relationships, persistence, ownership, source-of-truth, or material API data-flow changes.
- `AI_CONTEXT/CHANGELOG.md`: update for meaningful features, behavior changes, important fixes, schema/data-model changes, compatibility changes, or releases. Do not record trivial styling, spacing, typography, or internal refactors.
- `AGENTS.md`: update only when a permanent development, testing, documentation, or project-wide engineering rule changes.

## Progressive context loading

- Always read `AGENTS.md` for repository rules.
- Read `AI_CONTEXT/AI_CONTEXT.md` when a task touches system behavior, modules, pages, roles, user flows, or UI behavior.
- Read `AI_CONTEXT/DATA_MODEL.md` when a task touches data, persistence, schema, entities, relationships, or API data flow.
- Read `AI_CONTEXT/CHANGELOG.md` only when release history, prior behavior, build history, or regression context is relevant.
- Do not load unrelated context by default or copy large source files into documentation.

## Parallel work safety

- Never overwrite or revert unrelated changes from another task.
- Preserve newer documentation and merge concurrent documentation changes semantically.
- Report conflicts and run relevant regression checks after resolving them.
- Use separate branches or worktrees when concurrent tasks must substantially edit the same core area.

## Completion report

Use this concise structure:

```text
Task:
<request summary>

Changed:
- <important files/modules>

Tests:
- PASS / FAIL / Not available: <check>

Documentation updated:
- <filename and repository-relative path>
```

Also state whether there was a data-model impact and list only material regression risks, or `None identified`.
