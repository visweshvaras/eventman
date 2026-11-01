#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. Install Node.js 20.9 or later, then try again." >&2
  exit 1
fi

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)'; then
  echo "Node.js 20 or later is required. Upgrade Node.js, then try again." >&2
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "Could not find package.json. Run this script from the EventGenie project." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing project dependencies..."
  npm install
fi

if [[ -f .next/dev/lock ]]; then
  set +e
  node <<'NODE'
const fs = require("node:fs");

try {
  const lock = JSON.parse(fs.readFileSync(".next/dev/lock", "utf8"));
  const pid = Number(lock.pid);
  const port = Number(lock.port);
  const hostname = typeof lock.hostname === "string" ? lock.hostname : "127.0.0.1";

  if (!Number.isInteger(pid) || !Number.isInteger(port)) {
    console.error("A Next.js dev lock exists, but its process details are invalid.");
    console.error("Check for a running EventGenie server before removing .next/dev/lock.");
    process.exit(2);
  }

  let processIsRunning = true;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error.code === "ESRCH") processIsRunning = false;
  }

  if (!processIsRunning) {
    fs.unlinkSync(".next/dev/lock");
    console.log(`Removed stale Next.js dev lock for stopped PID ${pid}.`);
    process.exit(1);
  }

  (async () => {
    try {
      const response = await fetch(`http://${hostname}:${port}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = await response.text();
      if (!page.includes("<title>EventGenie")) {
        throw new Error("the responding service is not the EventGenie app");
      }

      console.log(`EventGenie is already running at http://${hostname}:${port}`);
      console.log("Reusing the existing server; no second Next.js process was started.");
      process.exit(0);
    } catch {
      console.error(`Next.js reports PID ${pid} on port ${port}, but it is not responding.`);
      console.error("Stop that specific server process and retry; this script will not kill it for you.");
      process.exit(2);
    }
  })();
} catch (error) {
  console.error("Could not read the Next.js dev lock:", error.message);
  console.error("Check for a running EventGenie server before removing .next/dev/lock.");
  process.exit(2);
}
NODE
  lock_status=$?
  set -e

  if [[ "$lock_status" -eq 0 ]]; then
    exit 0
  elif [[ "$lock_status" -ne 1 ]]; then
    exit "$lock_status"
  fi
fi

if [[ ! -f .env.local ]]; then
  echo "Note: .env.local is missing. Copy .env.example to .env.local to connect Supabase and NVIDIA NIM."
elif ! grep -Eq '^NEXT_PUBLIC_SUPABASE_URL=.+$' .env.local ||
  ! grep -Eq '^NEXT_PUBLIC_SUPABASE_ANON_KEY=.+$' .env.local; then
  echo "Note: Supabase is not fully configured in .env.local. The landing page works, but saved events and sign-in require Supabase."
fi

if [[ ! -f .env.local ]] || ! grep -Eq '^NVIDIA_NIM_API_KEY=.+$' .env.local ||
  ! grep -Eq '^NVIDIA_NIM_MODEL=.+$' .env.local; then
  echo "Note: Configure NVIDIA_NIM_API_KEY and NVIDIA_NIM_MODEL in .env.local to enable the AI assistant."
fi

DEV_ARGS=(--hostname 127.0.0.1)
if [[ -n "${PORT:-}" ]]; then
  DEV_ARGS+=(--port "$PORT")
fi

echo
echo "Starting EventGenie on localhost. Next.js will choose an available port."
echo "Press Ctrl+C to stop the local server."
exec npm run dev -- "${DEV_ARGS[@]}"
