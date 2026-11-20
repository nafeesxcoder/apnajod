# Server scripts

Run these on the server from the repo root (`~/apnajod`).

| Script | What it does |
| --- | --- |
| `deploy.sh` | Pull, install, run the tests, build, then restart the backend (checked on `/health`) and publish the frontend. A failed test or build puts the code back and changes nothing live. Options: `--migrate`, `--backend-only`, `--frontend-only`, `--skip-tests` (emergencies only) |
| `backup-db.sh` | Gzipped MySQL dump into `~/backups/milaan`, keeps 14 days (same disk as the server) |
| `backup-offsite.sh` | Database dump + all uploads (photos, chat, stories, music) copied to cloud storage with rclone. Keeps 30 days of dumps and of deleted files |
| `cleanup-disk.sh` | Frees disk space (logs, caches, old builds) |

## First time

```bash
chmod +x scripts/ops/*.sh
bash scripts/ops/cleanup-disk.sh
bash scripts/ops/backup-db.sh        # test one backup by hand
```

## Off-site backup (Backblaze B2)

The database and the photos live on one disk. If that disk dies, everything
is gone - so a copy goes to Backblaze B2 every night (first 10 GB free).

1. On backblaze.com: sign up, then **B2 Cloud Storage -> Buckets -> Create a
   Bucket**. Name it e.g. `apnajoda-backups`, files **Private**.
2. **Application Keys -> Add a New Application Key**: access to that bucket
   only, Read and Write. Copy the **keyID** and the **applicationKey** (it is
   shown once).
3. On the server:

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config create b2 b2 account <keyID> key <applicationKey>
BACKUP_REMOTE=b2:apnajoda-backups bash scripts/ops/backup-offsite.sh   # first run, by hand
```

4. Every night at 03:00 server time:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * BACKUP_REMOTE=b2:apnajoda-backups bash $HOME/apnajod/scripts/ops/backup-offsite.sh >> $HOME/backups/backup.log 2>&1") | crontab -
```

Check it now and then: `tail -20 ~/backups/backup.log` should end with
"Backup done". For an alert when a night is missed, make a free check on
healthchecks.io and add `BACKUP_PING_URL=<its URL>` to the cron line.

Google Drive or S3 work the same way: make an rclone remote for them with
`rclone config`, and use its name in `BACKUP_REMOTE`.

## Restore

The database, from a local dump:

```bash
gunzip -c ~/backups/milaan/<file>.sql.gz | mysql -u <user> -p <database>
```

From Backblaze (a new server):

```bash
rclone copy b2:apnajoda-backups/db/<file>.sql.gz .
gunzip -c <file>.sql.gz | mysql -u <user> -p <database>
rclone copy b2:apnajoda-backups/uploads/current ~/apnajod/backend/uploads
```

A file deleted by mistake: it is in `uploads/deleted/<day>/` for 30 days.
