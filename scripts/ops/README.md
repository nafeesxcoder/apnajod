# Server scripts

Run these on the EC2 box from the repo root (`~/Milaan2`).

| Script | What it does |
| --- | --- |
| `deploy.sh` | Pull, install, restart the backend, build and publish the frontend. Options: `--migrate`, `--backend-only`, `--frontend-only` |
| `backup-db.sh` | Gzipped MySQL dump into `~/backups/milaan`, keeps 14 days |
| `cleanup-disk.sh` | Frees disk space (logs, caches, old builds) |

## First time

```bash
chmod +x scripts/ops/*.sh
bash scripts/ops/cleanup-disk.sh
bash scripts/ops/backup-db.sh        # test one backup by hand
```

## Daily backup at 03:00 server time

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * bash $HOME/Milaan2/scripts/ops/backup-db.sh >> $HOME/backups/backup.log 2>&1") | crontab -
```

Copy backups off the server now and then (they live on the same disk as the database).

## Restore a backup

```bash
gunzip -c ~/backups/milaan/<file>.sql.gz | mysql -u <user> -p <database>
```
