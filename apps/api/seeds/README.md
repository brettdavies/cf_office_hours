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

# Apply the post-seed corrections (booking rate first, then dates):
npx wrangler d1 execute cf-office-hours --local --file=../../scripts/fix-seed-booking-rate.sql
npx wrangler d1 execute cf-office-hours --local --file=../../scripts/reanchor-seed-dates.sql
```

For the remote database, swap `--local` for `--remote` (requires `CLOUDFLARE_API_TOKEN`).

The two correction scripts shape the raw dump into a realistic demo: `fix-seed-booking-rate.sql` thins bookings to a
demand-driven per-mentee count and sets the status mix; `reanchor-seed-dates.sql` slides all dates onto the current date
and back-dates each request's `created_at` / `confirmed_at`. See `docs/stories/0.20.story.md` for the intended shape.

`--replace old=new` applies a global substring scrub to every text field; `--email-map old=new` rewrites whole email
addresses. Use them to keep real names and emails out of the demo data.
