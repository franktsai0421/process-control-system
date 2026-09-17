[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

## Local backups

Default .local-backups is repository-relative and Git-ignored. PROCESS_BACKUP_PATH can explicitly select a local location; network paths/URLs are rejected. Collaboration never changes or restores older backups.

## Sync and recovery

Before its revision-conditional write, data:sync verifies a physical D1/WAL/SHM, R2 metadata/blob and Session/base-settings backup. Failed verification restores it and retains failed storage separately; restoration failure is a hard stop. Stop dev before CLI.

## Legacy ZIP and access

Legacy Windows host ZIP uses AES-256-GCM, SHA-256 manifests and a separate key excluded from ZIP. Keep the key offline; loss prevents decryption. Legacy restore/delete require ADMIN reauthentication and confirmation; passwordless demo does not replace them. Optional Windows service installation is not run by this GitHub setup.
