[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## Collaboration workflow

Stop dev, export approved data, review diff/scans, commit/push a branch and open a PR. Frank decides merge; others pull main and sync with dev stopped. Never directly push main.

## Conflicts and deletion

Unexported edits or competing same-ID updates stop sync. Preserve both versions for manual resolution; there is no last-writer winner. Delete with deletedAt; absence is not deletion. After manual business resolution, data:manifest regenerates derived metadata without selecting a winner.

## Submission checks

task:status shows versions/unexported edits; task:submit exports, validates, scans and reports diff without uploading. task:start refuses automatic pulls when a remote exists; update/sync manually. Do not put employee email addresses in documentation.
