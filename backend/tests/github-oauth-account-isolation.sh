#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compiled_dir="$(mktemp -d /tmp/real-temp-mail-oauth-policy.XXXXXX)"
trap 'rm -rf -- "$compiled_dir"' EXIT

"$repo_root/node_modules/.bin/tsc" \
  "$repo_root/backend/src/modules/auth/oauth-link-policy.ts" \
  --target ES2022 \
  --module ES2022 \
  --moduleResolution bundler \
  --skipLibCheck \
  --outDir "$compiled_dir"

node --input-type=module - "$compiled_dir/oauth-link-policy.js" <<'JS'
import { pathToFileURL } from 'node:url'

const policy = await import(pathToFileURL(process.argv[2]).href)
const cases = [
  [null, 'create'],
  [{ is_active: true }, 'reject_unlinked'],
  [{ is_active: 1 }, 'reject_unlinked'],
  [{ is_active: false }, 'reject_disabled'],
  [{ is_active: 0 }, 'reject_disabled']
]

for (const [input, expected] of cases) {
  const actual = policy.decideOAuthEmailCollision(input)
  if (actual !== expected) {
    throw new Error(`OAuth collision policy returned ${actual}; expected ${expected}`)
  }
}
JS

echo "GitHub OAuth account-isolation policy passed"
