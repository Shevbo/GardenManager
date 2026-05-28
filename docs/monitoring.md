# Garden Manager — monitoring & ops

## Health check

`GET /api/health` returns JSON with:
- `status` — "ok" | "error"
- `uptime` — process uptime in seconds
- `db.ok` + `db.latencyMs` — Postgres ping
- `env.{nextauth, bridge, dadata, sms, email, telegram}` — booleans of integration presence

Use this for external uptime monitoring (UptimeRobot, statuspage.io, etc.). Trigger:
- 200 status code — healthy
- 503 status code — DB down or critical failure

## PM2 log rotation

On hoster, install `pm2-logrotate`:

```bash
ssh ubuntu@83.69.248.175
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # daily at midnight
```

## Inspecting logs

```bash
pm2 logs garden-manager --lines 200
pm2 logs garden-manager --err --lines 200
ls ~/.pm2/logs/garden-manager-*.log
```

## Restart strategies

```bash
pm2 restart garden-manager
pm2 reload garden-manager --update-env  # after env changes
pm2 stop garden-manager
pm2 start garden-manager
```

## Memory alerts

PM2 ecosystem config sets `max_memory_restart: "700M"`. If memory keeps growing past this regularly, investigate via `pm2 status` and `pm2 describe garden-manager`.

## External uptime monitoring

Recommended free options:
- **UptimeRobot** — 50 free monitors, 5-min interval, email/Telegram alerts
- **Statuspage** — for shared status page across all Shectory apps

Configure to ping `https://garden.shectory.ru/api/health` every 5 min; alert on 5xx or non-200.

## DB backups

Standard Postgres on hoster — backups should be set up via cron (this is a separate, future task).
