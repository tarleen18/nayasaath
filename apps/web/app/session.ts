'use client';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setMemberSession(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
}

export function clearMemberSession(): void {
  accessToken = null;
  refreshToken = null;
}

export function getMemberAccessToken(): string | null {
  return accessToken;
}

export function getMemberRefreshToken(): string | null {
  return refreshToken;
}
