[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## Collaboration workflow

Stop dev, export approved data, review diff/scans, commit/push a branch and open a PR. Frank decides merge; others pull main and sync with dev stopped. Never directly push main.

## Conflicts and deletion

Unexported edits or competing same-ID updates stop sync. Preserve both versions for manual resolution; there is no last-writer winner. Delete with deletedAt; absence is not deletion. After manual business resolution, data:manifest regenerates derived metadata without selecting a winner.

## Submission checks

task:status shows versions/unexported edits; task:submit exports, validates, scans and reports diff without uploading. task:start refuses automatic pulls when a remote exists; update/sync manually. Do not put employee email addresses in documentation.

Frank and employees must use work branch → commit → branch push → PR → GitHub Actions → Frank review → Frank merge. Nobody may directly or force push main, delete main, merge employee PRs as an employee, or use Owner/admin privileges to bypass the daily workflow. Green CI does not replace Frank review. The Local hook blocks pushes while on main and pushes targeting main. See EMPLOYEE_WORKFLOW.en.md.

This Private repository uses GitHub Free with no server-side Branch Protection. GitHub currently does not prevent Write collaborators from directly pushing main or merging PRs. Frank-only merge is the company rule; the Local hook prevents mistakes, not server-side enforcement. CODEOWNERS identifies Frank as the final reviewer for code and Canonical but does not enforce approval under this plan. Do not retry paid protection, change visibility or add an open-source LICENSE.

npm install enables the versioned Local pre-push guard through postinstall. Run npm run collaboration:setup afterward to verify it; this is required if install scripts were disabled. Setup changes only this repository and refuses to replace existing custom hooks.
