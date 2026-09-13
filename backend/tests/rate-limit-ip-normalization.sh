#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compiled_dir="$(mktemp -d /tmp/real-temp-mail-ip-policy.XXXXXX)"
trap 'rm -rf -- "$compiled_dir"' EXIT

"$repo_root/node_modules/.bin/tsc" \
  "$repo_root/backend/src/utils/ip.ts" \
  --target ES2022 \
  --module ES2022 \
  --moduleResolution bundler \
  --skipLibCheck \
  --outDir "$compiled_dir"

node --input-type=module - "$compiled_dir/ip.js" <<'JS'
import { pathToFileURL } from 'node:url'

const { normalizeIpForRateLimit } = await import(pathToFileURL(process.argv[2]).href)
const cases = [
  ['192.0.2.1', '192.0.2.1'],
  ['::ffff:192.0.2.1', '192.0.2.1'],
  ['0:0:0:0:0:ffff:c000:0201', '192.0.2.1'],
  ['2001:db8:1234:5678::1', '2001:0db8:1234:5678::/64'],
  ['2001:db8:1234:5678:abcd::2', '2001:0db8:1234:5678::/64'],
  ['fe80::1%en0', 'fe80:0000:0000:0000::/64'],
  ['unknown', 'unknown']
]

for (const [input, expected] of cases) {
  const actual = normalizeIpForRateLimit(input)
  if (actual !== expected) {
    throw new Error(`IP normalization returned ${actual}; expected ${expected} for ${input}`)
  }
}
JS

echo "Rate-limit IP normalization passed"
