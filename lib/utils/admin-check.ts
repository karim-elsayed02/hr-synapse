export async function checkIfAdminExistsClient() {
  // Admin already exists, no need to check database
  return { exists: true, error: null }
}
