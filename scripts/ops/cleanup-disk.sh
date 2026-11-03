#!/usr/bin/env bash
# Frees disk space on the EC2 box without touching the app or its data.
# Safe to re-run. Shows disk usage before and after.
set -uo pipefail

echo "== Before =="; df -h / | tail -1

echo "== pm2 logs =="
pm2 flush >/dev/null 2>&1 && echo "flushed"
command -v pm2 >/dev/null && pm2 install pm2-logrotate >/dev/null 2>&1 || true

echo "== apt cache and unused packages =="
sudo apt-get clean
sudo apt-get autoremove -y >/dev/null 2>&1

echo "== old journal logs (keep 7 days) =="
sudo journalctl --vacuum-time=7d >/dev/null 2>&1

echo "== npm / pnpm caches =="
npm cache clean --force >/dev/null 2>&1
pnpm store prune >/dev/null 2>&1 || true

echo "== temp build output =="
rm -rf "$HOME"/Milaan2/frontend/dist "$HOME"/Milaan2/frontend/.expo 2>/dev/null

echo "== Biggest folders in your home (look for anything old) =="
du -h --max-depth=2 "$HOME" 2>/dev/null | sort -rh | head -8

echo "== After =="; df -h / | tail -1
