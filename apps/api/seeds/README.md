# D1 seed data

`d1_seed.sql` is generated from the production backup and is gitignored (it contains PII). Regenerate it from the
plain-text cluster dump:

```bash
python3 scripts/convert_backup_to_d1.py \
  .context/db_cluster-<date>.backup \
  apps/api/seeds/d1_seed.sql \
  [--email-map old@example.com=new@example.com ...]
```

Load it into a local D1 database:

```bash
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --local
npx wrangler d1 execute cf-office-hours --local --file=seeds/d1_seed.sql
```

For the remote database, swap `--local` for `--remote` (requires `CLOUDFLARE_API_TOKEN`).

`--email-map` rewrites email addresses during conversion (used to move the demo coordinator accounts off the
`@capitalfactory.com` domain).
