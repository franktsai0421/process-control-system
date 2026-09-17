[Tiếng Việt](EMPLOYEE_WORKFLOW.md) | [繁體中文](EMPLOYEE_WORKFLOW.zh-TW.md) | [English](EMPLOYEE_WORKFLOW.en.md)

# Employee workflow

## Repository and responsibilities

Frank and employees must use work branch → commit → branch push → PR → GitHub Actions → Frank review → Frank merge. Nobody may directly or force push main, delete main, merge employee PRs as an employee, or use Owner/admin privileges to bypass the daily workflow. Green CI does not replace Frank review. The Local hook blocks pushes while on main and pushes targeting main. See EMPLOYEE_WORKFLOW.en.md.

This Private repository uses GitHub Free with no server-side Branch Protection. GitHub currently does not prevent Write collaborators from directly pushing main or merging PRs. Frank-only merge is the company rule; the Local hook prevents mistakes, not server-side enforcement. CODEOWNERS identifies Frank as the final reviewer for code and Canonical but does not enforce approval under this plan. Do not retry paid protection, change visibility or add an open-source LICENSE.

## First clone

npm install enables the versioned Local pre-push guard through postinstall. Run npm run collaboration:setup afterward to verify it; this is required if install scripts were disabled. Setup changes only this repository and refuses to replace existing custom hooks.

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
npm install
npm run collaboration:setup
npm run dev
```

## Update and create a work branch

Stop dev first. Keep existing edits; resolve conflicts without resetting Local data.

```sh
git switch main
git pull --ff-only
npm run data:sync
git switch -c work/task-name
```

## Submit code or approved data

Stop dev before data:export. Review only approved changes and exclude accounts, identity fields and operation history. Open a PR to main after pushing the branch; employees never merge. Frank reviews code and Canonical after CI passes, then merges in GitHub.

```sh
npm run data:export
git diff
npm run build
npx --no-install tsc --noEmit
npm run test:collaboration
npm run github:preflight
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin work/task-name
```

## Get merged data

Stop dev before pulling and syncing. Unexported edits or competing changes stop synchronization for manual review.

```sh
git switch main
git pull --ff-only
npm run data:sync
npm run dev
```

## Data and safety

Git contains code, migrations, Canonical, documents, tests and Actions. Never commit Local D1/SQLite/WAL/SHM, R2 blobs, Sessions/cookies, passwords/tokens/secrets, .env/.dev.vars, backups, archives or diagnostics. Local never connects to Staging or Production. Clone/pull/fetch/commit and normal GitHub web PR merge remain available. Setup failure requires maintainer review; do not overwrite existing hooks. Demo shortcuts remain open by default in testing; only Frank decides when to close them.
