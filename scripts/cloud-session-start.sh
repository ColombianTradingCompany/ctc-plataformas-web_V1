#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (claude.ai/code, «Cloud» in the desktop app).
# Local sessions never reach this file: the hook in .claude/settings.json only calls it when
# CLAUDE_CODE_REMOTE is "true", which the cloud VM sets and a laptop never does.
# Whatever this prints lands in Claude's context, so npm's own output goes to a log file.

cd "$CLAUDE_PROJECT_DIR" || exit 1
hashes=node_modules/.cloud-install.sha256
log="${TMPDIR:-/tmp}/cloud-npm-ci.log"

# npm ci only when package.json, the lockfile or this script changed since the last good install
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  if npm ci --no-audit --no-fund >"$log" 2>&1; then
    sha256sum scripts/cloud-session-start.sh package.json package-lock.json >"$hashes" || rm -f "$hashes"
    deps="installed with npm ci"
  else
    deps="npm ci FAILED (log: $log); run it again before the gate"
  fi
else
  deps="already installed"
fi

cat <<EOF
CTC cloud session. Dependencies: $deps.
- This VM has no .env.local: no Supabase service-role key and no API keys. Code that needs them
  cannot run here; say so instead of faking a result, and never ask for a secret in the chat.
- Network is «Trusted» (npm, GitHub, Google Fonts). Production Supabase and ctcexport.com are not
  reachable, so the qa-* guardians that read the database or write to production stay for local runs.
- The gate here: npx tsc --noEmit, npx eslint src (baseline 8 warnings), and the offline qa-*
  guardians the batch touches. npm run build may fail for lack of env vars; the Vercel preview
  that every pushed branch gets is the build proof.
- Work on your own branch and open a PR. Never push to main: every push to main deploys production.
- Don't bump APP_VERSION or add the arqlog asiento here: the number is taken when the PR lands on
  main, so a local session may claim it first. Put the CHANGELOG bullets in the PR description.
EOF
exit 0
