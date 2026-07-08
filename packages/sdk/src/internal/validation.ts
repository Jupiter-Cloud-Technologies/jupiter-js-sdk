const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function validateProjectId(str: string) {
  if (!UUID_REGEX.test(str)) {
    throw new Error('@supabase/auth-js: Expected parameter to be UUID but is not')
  }
}
