> Status: Current reading edition. Canonical maintenance source: [BACKUP_AND_RESTORE.zh-TW.md](BACKUP_AND_RESTORE.zh-TW.md). Shared invariants are maintained there; this translation does not define additional policy.

[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

Before activation, physical restore rejects disabling an enabled session-revocation gate, missing enabled-feature tables, and pre-feedback backups over nonempty current feedback history. Existing adoption supplemental photos, canonical data, schema and settings are verified and restored in full, never skipped.

Physical backups also retain Local features.json. Restore verifies staged files and unions newer session revocations before activating the replacement; each token retains the maximum expires_at/revoked_at. ZIP restore also preserves current revocations and refuses a pre-feedback backup when current feedback history is nonempty. After new business writes, preserve the latest state and use CAS-based compensation instead of replacing the whole database with an old copy. See the [Local integration and recovery record](docs/local-integration/20261009-3020-to-3000.md).

## Local backups

Default .local-backups is repository-relative and Git-ignored. PROCESS_BACKUP_PATH can explicitly select a local location; network paths/URLs are rejected. Collaboration never changes or restores older backups.

## Sync and recovery

Before its revision-conditional write, data:sync verifies a physical D1/WAL/SHM, R2 metadata/blob and Session/base-settings backup. Failed verification restores it and retains failed storage separately; restoration failure is a hard stop. Stop dev before CLI.

## Legacy ZIP and access

Website ZIPs exclude `.env*`, `.dev.vars*` (including nested files), and PEM private keys. Keep security configuration private and separate from public source bundles and Git. Complete recovery also needs private D1/R2, history/media, and required Local Session/feature settings; a website ZIP or Canonical subset alone does not prove full recovery. Missing keys, required configuration, or media means recovery is incomplete.

Legacy Windows host ZIP uses AES-256-GCM, SHA-256 manifests and a separate key excluded from ZIP. Keep the key offline; loss prevents decryption. Legacy restore/delete require ADMIN reauthentication and confirmation; passwordless demo does not replace them. Optional Windows service installation is not run by this GitHub setup.
