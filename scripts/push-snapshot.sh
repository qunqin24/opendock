#!/usr/bin/env bash
set -euo pipefail

branch="${1:?Usage: push-snapshot.sh <branch>}"

# A short GitHub outage must not discard a successful crawl and build.
# Rebase before each attempt so a concurrent manual push is preserved.
# Never force-push or retry a failed rebase (which may require a human).
for attempt in 1 2 3; do
  git pull --rebase origin "$branch"
  if git push origin "HEAD:$branch"; then
    exit 0
  fi

  if [ "$attempt" -eq 3 ]; then
    echo 'Snapshot push failed after 3 attempts.' >&2
    exit 1
  fi

  delay=$((attempt * 5))
  echo "Snapshot push failed; retrying in ${delay}s (${attempt}/3)." >&2
  sleep "$delay"
done
