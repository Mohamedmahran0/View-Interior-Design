/**
 * Canonical Site URL and Professional Engineering Project URL Helper
 */

export function getCanonicalSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Keep localhost for local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
  }

  if (envUrl && !envUrl.includes('placeholder')) {
    return envUrl.startsWith('http') ? envUrl.replace(/\/+$/, '') : `https://${envUrl.replace(/\/+$/, '')}`;
  }

  // Official production custom domain
  return 'https://www.viewinteriordesign.com';
}

/**
 * Generates the professional client-facing project URL under the custom domain
 * and engineer account name:
 * e.g. https://www.viewinteriordesign.com/view/qasiomar4/33b28b5e-...
 */
export function getProjectShareUrl(
  usernameOrEmail?: string | null,
  projectId?: string,
  locale: string = 'ar'
): string {
  const baseUrl = getCanonicalSiteUrl();
  const id = projectId || '';

  let rawName = 'engineer';
  if (usernameOrEmail) {
    if (usernameOrEmail.includes('@')) {
      rawName = usernameOrEmail.split('@')[0];
    } else {
      rawName = usernameOrEmail;
    }
  }

  // Support Arabic and alphanumeric characters in the slug
  let cleanUser = rawName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');

  if (!cleanUser || cleanUser === '-') {
    cleanUser = 'engineer';
  }

  return `${baseUrl}/${locale}/view/${encodeURIComponent(cleanUser)}/${id}`;
}
