export type OAuthEmailPolicyDecision =
  | 'create'
  | 'reject_disabled'
  | 'reject_unlinked'

/**
 * Email equality is not identity proof because local registration does not
 * verify mailbox ownership. Existing OAuth links are resolved before this
 * policy runs; every remaining collision must be rejected.
 */
export function decideOAuthEmailCollision(
  existingUser: { is_active: boolean | number } | null
): OAuthEmailPolicyDecision {
  if (!existingUser) return 'create'
  return existingUser.is_active === false || existingUser.is_active === 0
    ? 'reject_disabled'
    : 'reject_unlinked'
}
