export function normalizeIpForRateLimit(value: string): string {
  const ip = value.trim().toLowerCase().split('%', 1)[0] || 'unknown'
  if (!ip.includes(':')) return ip

  const halves = ip.split('::')
  if (halves.length > 2) return ip
  const expandPart = (part: string): string[] => {
    if (!part) return []
    const pieces = part.split(':')
    const last = pieces.at(-1)
    if (last?.includes('.')) {
      const octets = last.split('.').map(Number)
      if (
        octets.length !== 4 ||
        octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)
      ) {
        return pieces
      }
      pieces.splice(
        -1,
        1,
        ((octets[0] ?? 0) * 256 + (octets[1] ?? 0)).toString(16),
        ((octets[2] ?? 0) * 256 + (octets[3] ?? 0)).toString(16)
      )
    }
    return pieces
  }

  const left = expandPart(halves[0] ?? '')
  const right = expandPart(halves[1] ?? '')
  const omitted = halves.length === 2 ? 8 - left.length - right.length : 0
  const groups = halves.length === 2
    ? [...left, ...Array.from({ length: Math.max(0, omitted) }, () => '0'), ...right]
    : left
  if (
    groups.length !== 8 ||
    groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return ip
  }

  const numericGroups = groups.map(group => Number.parseInt(group, 16))
  const isMappedIpv4 = numericGroups.slice(0, 5).every(group => group === 0)
    && numericGroups[5] === 0xffff
  if (isMappedIpv4) {
    const high = numericGroups[6] ?? 0
    const low = numericGroups[7] ?? 0
    return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`
  }

  // Treat an IPv6 /64 as one client identity. Privacy-address rotation inside
  // the interface identifier must not reset anonymous endpoint limits.
  return `${groups.slice(0, 4).map(group => group.padStart(4, '0')).join(':')}::/64`
}
