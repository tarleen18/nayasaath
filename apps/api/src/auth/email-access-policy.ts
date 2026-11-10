const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmailList(setting: string): Set<string> {
  return new Set(
    (process.env[setting] ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const blockedEmails = readEmailList('AUTH_EMAIL_BLOCKLIST');
  if (blockedEmails.has(normalizedEmail)) return false;

  const allowedEmails = readEmailList('AUTH_EMAIL_ALLOWLIST');
  return allowedEmails.size === 0 || allowedEmails.has(normalizedEmail);
}

export function validateEmailAccessLists(): void {
  for (const setting of ['AUTH_EMAIL_ALLOWLIST', 'AUTH_EMAIL_BLOCKLIST']) {
    if ([...readEmailList(setting)].some((email) => !emailPattern.test(email))) {
      throw new Error(`${setting} must contain only comma-separated email addresses.`);
    }
  }
}
