[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — Central control system

Internal process and quality-standard platform: approved catalogs/routes, BOM, versioned process editing/review, dispatch, playback/product status, FQC/IQC/IPQC and equipment. Traditional Chinese and Vietnamese UI. Quality reports, routine inspection and FPY still have framework-only areas.

## Find the right source

- [AGENTS](AGENTS.md): engineering rules; use this checkout, branch, HEAD and uncommitted work.
- [Current requirements](docs/specs/current/README.md), [implementation](AI_CONTEXT/AI_CONTEXT.md), [data model](AI_CONTEXT/DATA_MODEL.md).
- [HANDOFF](HANDOFF.md): current phase; [documentation index](docs/DOCUMENTATION_INDEX.md): all documents, archives and unresolved conflicts.
- [Employee workflow](EMPLOYEE_WORKFLOW.en.md); [Canonical/Local procedure](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md).
- Task-specific [backup](BACKUP_AND_RESTORE.en.md), [BOM](BOM_SEARCH.en.md), [master data](MASTER_ADMIN_UI.en.md), [deployment](DEPLOYMENT.md).

## Run and check

Use package.json engines/scripts. A fresh clone needs dependency installation and collaboration:setup; routine edits do not require reinstalling tools. npm run dev normally prints a loopback /process/ URL. Existing adopted Local storage follows HANDOFF/runtime guidance; do not accidentally rerun initialization.

Select affected fixture/type/build checks for code changes and desktop/narrow bilingual checks for UI. Documentation-only changes need links/diff checks, not the whole suite. data:export/data:sync mutate Local data: use only for an applicable task, stop dev and protect unexported changes. Git pull/merge does not update databases.

Work branches and PRs require Frank review/merge; no direct main push. The Local hook is not server-side protection. Keep private accounts, credentials, Local D1/R2, original media and backups outside Git. Production/Site publication follows DEPLOYMENT with exact-SHA approval. Counts, flags and bootstrap/image policy are maintained only in their linked sources.
