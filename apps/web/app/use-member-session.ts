'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearMemberSession,
  getMemberRefreshToken,
  memberApiFetch,
  MemberSessionExpiredError,
  setMemberEmail,
} from './session';

type MemberSessionState =
  | { status: 'loading'; email: null; error: null }
  | { status: 'authenticated'; email: string; error: null }
  | { status: 'error'; email: null; error: string };

export function useMemberSession() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MemberSessionState>({
    status: 'loading',
    email: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    if (!getMemberRefreshToken()) {
      clearMemberSession();
      router.replace('/login/');
      return () => { active = false; };
    }

    async function verifySession() {
      try {
        const response = await memberApiFetch('/auth/me');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.message === 'string' ? data.message : 'Could not verify your session.');
        }
        if (typeof data.email !== 'string') {
          throw new Error('The authentication service returned an invalid member profile.');
        }
        setMemberEmail(data.email);
        if (active) setState({ status: 'authenticated', email: data.email, error: null });
      } catch (error) {
        if (error instanceof MemberSessionExpiredError) {
          clearMemberSession();
          router.replace('/login/');
          return;
        }
        if (active) {
          setState({
            status: 'error',
            email: null,
            error: error instanceof Error ? error.message : 'Could not verify your session.',
          });
        }
      }
    }

    void verifySession();
    return () => { active = false; };
  }, [attempt, router]);

  const retry = useCallback(() => {
    setState({ status: 'loading', email: null, error: null });
    setAttempt(value => value + 1);
  }, []);

  return { ...state, retry };
}
