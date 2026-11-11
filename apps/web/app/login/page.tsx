'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordField } from '../components/password-field';
import { setMemberSession } from '../session';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');

  async function resendVerification() {
    setResending(true);
    setError('');
    setMessage('');
    setVerificationStatus('');
    try {
      if (!API) throw new Error('Email verification is temporarily unavailable because the authentication service is not configured.');
      const response = await fetch(`${API}/auth/email/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(detail || 'Could not request a verification email.');
      }
      setVerificationStatus(data.status ?? '');
      setMessage(data.notice || 'If this email has a pending account, check your inbox for a verification code.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not request a verification email.');
    } finally {
      setResending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setNeedsVerification(false);
    setVerificationStatus('');
    try {
      if (!API) throw new Error('Sign in is temporarily unavailable because the authentication service is not configured.');
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        setNeedsVerification(typeof detail === 'string' && detail.includes('Verify your email address'));
        throw new Error(detail || 'Sign in failed.');
      }
      setMemberSession(data.accessToken, data.refreshToken, data.user.email);
      setPassword('');
      router.push('/dashboard/');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell" style={{ maxWidth: 520, paddingTop: 70, paddingBottom: 80 }}>
    <a className="brand" href="/">NayaSaath.</a>
    <p className="eyebrow" style={{ marginTop: 38 }}>MEMBER SIGN IN</p>
    <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>Welcome back.</h1>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your email must be verified before you can sign in.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 28 }}>
      <label>Email address
        <input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} style={fieldStyle} />
      </label>
      <label>Password
        <PasswordField required autoComplete="current-password" value={password} onChange={setPassword} style={fieldStyle} />
      </label>
      <a href="/forgot-password" style={{ color: 'var(--wine)', fontWeight: 600, fontSize: 14 }}>Forgot password?</a>
      {error && <p role="alert" style={{ color: '#a22', lineHeight: 1.6, margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: '#356647', lineHeight: 1.6, margin: 0 }}>{message}</p>}
      {(verificationStatus === 'verification_sent' || verificationStatus === 'verification_recently_sent') && <a href={`/verify-email?email=${encodeURIComponent(email.trim())}`} style={{ color: 'var(--wine)', fontWeight: 600, fontSize: 14 }}>Enter verification code</a>}
      {needsVerification && <button className="textButton" type="button" disabled={resending || !email} onClick={resendVerification}>
        {resending ? 'Requesting code…' : 'Resend verification code'}
      </button>}
      <button className="button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>Not registered? <a href="/register" style={{ color: 'var(--wine)', fontWeight: 600 }}>Create an account</a></p>
    <a className="button secondary" href="/" style={{ marginTop: 12 }}>Back to home</a>
  </main>;
}

const fieldStyle: React.CSSProperties = {
  display: 'block', padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10,
  background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7,
};
