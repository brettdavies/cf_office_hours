# D1 seed data

`d1_seed.sql` is generated from the production backup and is gitignored (it contains PII). Regenerate it from the
plain-text cluster dump, scrubbing real identities to neutral demo values:

```bash
python3 scripts/convert_backup_to_d1.py \
  .context/db_cluster-<date>.backup \
  apps/api/seeds/d1_seed.sql \
  --replace "real.person@example.com=demo.account@example.com" \
  --replace "Real Name=Demo User"
```

Load it into a local D1 database:

```bash
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --local
npx wrangler d1 execute cf-office-hours --local --file=seeds/d1_seed.sql
```

For the remote database, swap `--local` for `--remote` (requires `CLOUDFLARE_API_TOKEN`).

The seed is self-correcting: `convert_backup_to_d1.py` appends a footer that shapes the raw dump into a realistic demo
(a demand-driven booking rate, ~20% confirmed / ~80% pending) and anchors every timestamp to load time, so a freshly
loaded database needs no manual fixes. The date portion lives in `scripts/bump-seed-dates.sql`, which the API Worker's
weekly Cron Trigger also runs against staging and production (the `scheduled` handler in `apps/api/src/index.ts`) to
keep an already-loaded demo current. See `docs/archive/stories/0.20.story.md` for the intended shape.

`--replace old=new` applies a global substring scrub to every text field; `--email-map old=new` rewrites whole email
addresses. Use them to keep real names and emails out of the demo data.
