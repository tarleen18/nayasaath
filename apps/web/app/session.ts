'use client';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let memberEmail: string | null = null;

export function setMemberSession(access: string, refresh: string, email: string): void {
  accessToken = access;
  refreshToken = refresh;
  memberEmail = email;
}

export function clearMemberSession(): void {
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
