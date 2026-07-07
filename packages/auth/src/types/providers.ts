/** One of the providers supported by GoTrue. Use the `custom:` prefix for custom OIDC providers (e.g. `custom:my-oidc-provider`). */
export type Provider =
  | 'apple'
  | 'azure'
  | 'bitbucket'
  | 'discord'
  | 'facebook'
  | 'figma'
  | 'github'
  | 'gitlab'
  | 'google'
  | 'kakao'
  | 'keycloak'
  | 'linkedin'
  | 'linkedin_oidc'
  | 'notion'
  | 'slack'
  | 'slack_oidc'
  | 'spotify'
  | 'twitch'
  /** Uses OAuth 1.0a */
  | 'twitter'
  /** Uses OAuth 2.0 */
  | 'x'
  | 'workos'
  | 'zoom'
  | 'fly'
  | `custom:${string}`
