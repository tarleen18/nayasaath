'use client';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

let accessToken: string | null = null;
let refreshToken: string | null = null;
let memberEmail: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let refreshInFlightRevision = -1;
let sessionRevision = 0;

export class MemberSessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'MemberSessionExpiredError';
  }
}

export function setMemberSession(access: string, refresh: string, email: string): void {
  sessionRevision++;
  accessToken = access;
  refreshToken = refresh;
  memberEmail = email;
}

export function setMemberEmail(email: string): void {
  memberEmail = email;
}

export function clearMemberSession(): void {
  sessionRevision++;
  accessToken = null;
  refreshToken = null;
  memberEmail = null;
}

export function getMemberAccessToken(): string | null {
  return accessToken;
}

export function getMemberRefreshToken(): string | null {
  return refreshToken;
}

export function getMemberEmail(): string | null {
  return memberEmail;
}

async function refreshMemberSession(): Promise<boolean> {
  if (refreshInFlight && refreshInFlightRevision === sessionRevision) return refreshInFlight;
  const currentRefreshToken = getMemberRefreshToken();
  if (!currentRefreshToken) {
    clearMemberSession();
    return false;
  }
  if (!API) throw new Error('The authentication service is not configured.');
  const revision = sessionRevision;

  const refreshPromise = (async () => {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (sessionRevision !== revision) return false;
    if (!response.ok) {
      clearMemberSession();
      return false;
    }
    if (
      typeof data.accessToken !== 'string' ||
      typeof data.refreshToken !== 'string' ||
      typeof data.user?.email !== 'string'
    ) {
      clearMemberSession();
      throw new Error('The authentication service returned an invalid session.');
    }
    setMemberSession(data.accessToken, data.refreshToken, data.user.email);
    return true;
  })();
  refreshInFlight = refreshPromise;
  refreshInFlightRevision = revision;

  try {
    return await refreshPromise;
  } finally {
    if (refreshInFlight === refreshPromise) {
      refreshInFlight = null;
      refreshInFlightRevision = -1;
    }
  }
}

export async function memberApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API) throw new Error('The member service is not configured.');
  const token = getMemberAccessToken();
  if (!token) throw new MemberSessionExpiredError();

  const request = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API}${path}`, { ...init, headers });
  };

  let response = await request(token);
  if (response.status !== 401) return response;

  let renewedAccessToken = getMemberAccessToken();
  if (!renewedAccessToken || renewedAccessToken === token) {
    if (!(await refreshMemberSession())) throw new MemberSessionExpiredError();
    renewedAccessToken = getMemberAccessToken();
  }
  if (!renewedAccessToken) {
    clearMemberSession();
    throw new MemberSessionExpiredError();
  }

  response = await request(renewedAccessToken);
  if (response.status === 401) {
    clearMemberSession();
    throw new MemberSessionExpiredError();
  }
  return response;
}

export async function logoutMemberSession(): Promise<void> {
  const token = getMemberRefreshToken();
  clearMemberSession();
  if (!token) return;
  if (!API) throw new Error('The authentication service is not configured.');

  const response = await fetch(`${API}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
  if (!response.ok) throw new Error('The server could not confirm sign-out.');
}
