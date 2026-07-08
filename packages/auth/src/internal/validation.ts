const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function validateProjectId(str: string) {
  if (!UUID_REGEX.test(str)) {
    throw new Error('Invalid Project ID. Project Id must be a valid UUID')
  }
}

export function validateUUID(str: string) {
  if (!UUID_REGEX.test(str)) {
    throw new Error('Invalid Project ID. Project Id must be a valid UUID')
  }
}
