#!/usr/bin/env bash
# Lists every package whose resolved version in package-lock.json is newer on
# one branch than on the other, collapsed to one line per package name so
# nested copies and hoisting moves do not show up as drift.
#
# Usage: scripts/release-drift.sh [base-ref] [head-ref]
#   default: origin/dev origin/main
#
# Exit 1 when the head ref (main) resolves anything newer than the base ref
# (dev); that is the state a release must not be cut from, because the release
# branch overlays dev's tree onto main and would revert the newer version.
set -euo pipefail

base=${1:-origin/dev}
head=${2:-origin/main}

# name  version  scope, keeping only the highest version per name.
versions() {
  git show "$1:package-lock.json" \
    | jq -r '.packages | to_entries[]
        | select(.key | contains("node_modules/"))
        | select(.value.version != null)
        | "\(.key | sub(".*node_modules/"; "")) \(.value.version) \(if .value.dev then "dev" else "runtime" end)"' \
    | sort -k1,1 -k2,2V \
    | awk '{ last[$1] = $0 } END { for (k in last) print last[k] }' \
    | sort -k1,1
}

head_newer=0
base_newer=0
head_lines=""
base_lines=""

while read -r name base_ver _ head_ver head_scope; do
  [ "$base_ver" = "$head_ver" ] && continue
  newest=$(printf '%s\n%s\n' "$base_ver" "$head_ver" | sort -V | tail -1)
  line=$(printf '  %-8s %-44s %s=%-12s %s=%s' "$head_scope" "$name" "$base" "$base_ver" "$head" "$head_ver")
  if [ "$newest" = "$head_ver" ]; then
    head_newer=$((head_newer + 1))
    head_lines+="$line"$'\n'
  else
    base_newer=$((base_newer + 1))
    base_lines+="$line"$'\n'
  fi
done < <(join <(versions "$base") <(versions "$head"))

printf '%s newer than %s: %d\n' "$head" "$base" "$head_newer"
[ -n "$head_lines" ] && printf '%s' "$head_lines"
printf '%s newer than %s: %d (routine updates awaiting release)\n' "$base" "$head" "$base_newer"

[ "$head_newer" -eq 0 ]
