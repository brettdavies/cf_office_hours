#!/usr/bin/env python3
"""Convert a plain-text Postgres cluster dump into a Cloudflare D1 (SQLite) seed.

Reads the `COPY public.<table> (...) FROM stdin;` blocks for the application
tables and emits batched multi-row INSERT statements with SQLite-compatible
values: booleans become 0/1, Postgres timestamps are normalized to ISO-8601 UTC,
and JSON/text is single-quote escaped. Numeric columns rely on SQLite column
affinity to coerce the quoted values.

Usage:
  convert_backup_to_d1.py <backup.sql> <out.sql> [--email-map old=new ...]

The generated seed ends with a self-correcting footer (a demand-driven booking
shape, then bump-seed-dates.sql) so a freshly loaded database needs no manual
post-seed fixes.
"""

import argparse
import os
import re
import sys

# Tables to load, in parent-first order.
TARGET_TABLES = [
    "portfolio_companies",
    "users",
    "user_profiles",
    "user_urls",
    "taxonomy",
    "entity_tags",
    "availability",
    "time_slots",
    "bookings",
    "user_match_cache",
    "tier_override_requests",
]

# Columns stored as SQLite INTEGER booleans.
BOOL_COLUMNS = {"is_approved", "is_booked"}

# Kept small so each multi-row INSERT stays under D1's per-statement size limit.
ROWS_PER_INSERT = 10

COPY_HEADER = re.compile(r"^COPY public\.(\w+) \((.*)\) FROM stdin;$")
PG_TIMESTAMP = re.compile(
    r"^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?(\+00(?::00)?|Z)?$"
)

_UNESCAPE = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\"}

# Appended to every generated seed so a freshly loaded database is correct with no
# manual post-seed step: a demand-driven booking shape, then the date bump read
# from bump-seed-dates.sql (the same file the weekly scheduled job runs).
BOOKING_SHAPE_SQL = """\
-- Seed shape: demand-driven booking rate + status mix. The raw backup books ~50%
-- of all slots and assigns a random mentee, which over-subscribes the small
-- mentee pool; keep a random 3-8 bookings per mentee, free the rest of the slots,
-- and set a ~20% confirmed / ~80% pending mix.
DROP TABLE IF EXISTS _keep_count;
CREATE TABLE _keep_count AS
  SELECT mentee_id, 3 + abs(random() % 6) AS k FROM bookings GROUP BY mentee_id;
DELETE FROM bookings WHERE id IN (
  SELECT id FROM (
    SELECT b.id AS id,
           ROW_NUMBER() OVER (PARTITION BY b.mentee_id ORDER BY b.id) AS rn,
           kc.k AS k
    FROM bookings b
    JOIN _keep_count kc ON kc.mentee_id = b.mentee_id
  )
  WHERE rn > k
);
UPDATE time_slots
  SET is_booked = 0, booking_id = NULL
  WHERE booking_id IS NOT NULL
    AND booking_id NOT IN (SELECT id FROM bookings);
UPDATE bookings SET status = CASE WHEN abs(random() % 100) < 20 THEN 'confirmed' ELSE 'pending' END;
DROP TABLE _keep_count;
"""


def seed_corrections() -> str:
    """Self-correcting footer for the generated seed: the demand-driven booking
    shape, then the date bump read from bump-seed-dates.sql (the same file the
    weekly scheduled job runs). A freshly loaded seed needs no manual fixes."""
    bump_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bump-seed-dates.sql")
    with open(bump_path, "r", encoding="utf-8") as fh:
        bump_sql = fh.read()
    return (
        "\n-- === Self-correcting seed footer (applied on every load) ===\n"
        + BOOKING_SHAPE_SQL
        + "\n"
        + bump_sql
    )


def unescape_copy(value: str) -> str:
    """Decode the backslash escapes used inside a COPY field."""
    return re.sub(r"\\(.)", lambda m: _UNESCAPE.get(m.group(1), m.group(1)), value)


def normalize_timestamp(value: str) -> str:
    """Normalize a Postgres timestamp to ISO-8601 with millisecond precision and Z."""
    m = PG_TIMESTAMP.match(value)
    if not m:
        return value
    date, time, frac, _tz = m.groups()
    millis = ""
    if frac:
        millis = "." + (frac[1:] + "000")[:3]
    return f"{date}T{time}{millis}Z"


def sql_literal(raw: str, column: str, email_map: dict, replacements: list) -> str:
    """Render one COPY field as a SQLite SQL literal."""
    if raw == r"\N":
        return "NULL"

    value = unescape_copy(raw)

    # Global substring scrubs (e.g. replacing PII) apply to every text field.
    for old, new in replacements:
        if old in value:
            value = value.replace(old, new)

    if column in BOOL_COLUMNS:
        return "1" if value == "t" else "0"

    if column == "email" and value in email_map:
        value = email_map[value]

    value = normalize_timestamp(value)

    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def emit_table(
    out, table: str, columns: list, rows: list, email_map: dict, replacements: list
) -> None:
    """Write batched INSERT statements for one table's rows."""
    if not rows:
        return
    col_list = ", ".join(columns)
    out.write(f"-- {table}: {len(rows)} rows\n")
    for start in range(0, len(rows), ROWS_PER_INSERT):
        batch = rows[start : start + ROWS_PER_INSERT]
        out.write(f"INSERT INTO {table} ({col_list}) VALUES\n")
        values = []
        for fields in batch:
            literals = [
                sql_literal(fields[i], columns[i], email_map, replacements)
                for i in range(len(columns))
            ]
            values.append("  (" + ", ".join(literals) + ")")
        out.write(",\n".join(values))
        out.write(";\n")
    out.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup")
    parser.add_argument("out")
    parser.add_argument("--email-map", action="append", default=[])
    parser.add_argument(
        "--replace",
        action="append",
        default=[],
        help="Global substring scrub applied to every text field, as old=new",
    )
    args = parser.parse_args()

    email_map = {}
    for pair in args.email_map:
        old, new = pair.split("=", 1)
        email_map[old] = new

    replacements = []
    for pair in args.replace:
        old, new = pair.split("=", 1)
        replacements.append((old, new))

    collected = {}
    with open(args.backup, "r", encoding="utf-8") as fh:
        line = fh.readline()
        while line:
            header = COPY_HEADER.match(line.rstrip("\n"))
            if header:
                table = header.group(1)
                columns = [c.strip() for c in header.group(2).split(",")]
                rows = []
                line = fh.readline()
                while line and line.rstrip("\n") != r"\.":
                    rows.append(line.rstrip("\n").split("\t"))
                    line = fh.readline()
                if table in TARGET_TABLES:
                    collected[table] = (columns, rows)
            line = fh.readline()

    with open(args.out, "w", encoding="utf-8") as out:
        out.write("-- Generated D1 seed from the production backup. Do not edit by hand.\n\n")
        for table in TARGET_TABLES:
            if table in collected:
                columns, rows = collected[table]
                emit_table(out, table, columns, rows, email_map, replacements)
            else:
                print(f"warning: no data block for {table}", file=sys.stderr)
        out.write(seed_corrections())

    total = sum(len(rows) for _, rows in collected.values())
    print(f"Wrote {args.out}: {len(collected)} tables, {total} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
