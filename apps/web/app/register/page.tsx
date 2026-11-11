'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PasswordField } from '../components/password-field';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

async function post(path: string, body: Record<string, string>) {
  if (!API) throw new Error('Account registration is temporarily unavailable because the authentication service is not configured.');
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(' ') : data.message;
    throw new Error(message || 'The request could not be completed.');
  }
  return data;
}

export default function RegisterPage() {
  const [mode, setMode] = useState<'register' | 'resend'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resultStatus, setResultStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [publicSiteOnly, setPublicSiteOnly] = useState(true);
  const [launchStatusLoaded, setLaunchStatusLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadLaunchStatus() {
      try {
        if (!API) throw new Error('API is not configured.');
        const response = await fetch(`${API}/health/launch-status`);
        if (!response.ok) throw new Error('Could not load launch status.');
        const result = await response.json() as { publicSiteOnly?: boolean };
        if (active) setPublicSiteOnly(result.publicSiteOnly !== false);
      } catch {
        if (active) setPublicSiteOnly(true);
      } finally {
        if (active) setLaunchStatusLoaded(true);
      }
    }
    void loadLaunchStatus();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publicSiteOnly) return;
    setBusy(true);
    setError('');
    setMessage('');
    setResultStatus('');
    try {
      if (mode === 'register') {
        const result = await post('/auth/register', { email, password });
        setPassword('');
        setResultStatus(result.status ?? '');
        setMessage(result.notice || 'The request could not be completed.');
      } else {
        const result = await post('/auth/email/resend', { email });
        setResultStatus(result.status ?? '');
        setMessage(result.notice || 'The request could not be completed.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!launchStatusLoaded || publicSiteOnly) {
    return <main className="shell" style={{ maxWidth: 560, paddingTop: 70, paddingBottom: 80 }}>
      <a className="brand" href="/">NayaSaath.</a>
      <p className="eyebrow" style={{ marginTop: 38 }}>COMING SOON</p>
      <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>We’re preparing a thoughtful launch.</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>New member registration and profile editing are currently closed while we complete privacy, photo-safety, verification, and support safeguards. We are not collecting waitlist details on this page.</p>
      <a className="button secondary" href="/" style={{ marginTop: 12 }}>Back to home</a>
    </main>;
  }

  return <main className="shell" style={{ maxWidth: 560, paddingTop: 70, paddingBottom: 80 }}>
    <a className="brand" href="/">NayaSaath.</a>
    <p className="eyebrow" style={{ marginTop: 38 }}>{mode === 'register' ? 'CREATE AN ACCOUNT' : 'EMAIL VERIFICATION'}</p>
    <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>
      {mode === 'register' ? 'A new chapter starts here.' : 'Resend your verification code.'}
    </h1>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
      {mode === 'register'
        ? 'Create your account with an email address you can access. We will email you a six-digit code that you must enter before signing in.'
        : 'Enter the email address you registered with. If it has a pending account, we will send another code.'}
    </p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 28 }}>
      <label>Email address
        <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} style={fieldStyle} />
      </label>
      {mode === 'register' && <label>Password (at least 12 characters)
        <PasswordField required minLength={12} autoComplete="new-password" value={password} onChange={setPassword} style={fieldStyle} />
      </label>}
      {error && <p role="alert" style={{ color: '#a22', margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: '#356647', lineHeight: 1.6, margin: 0 }}>{message}</p>}
      {(resultStatus === 'verification_sent' || resultStatus === 'verification_recently_sent') && <a href={`/verify-email?email=${encodeURIComponent(email.trim())}`} style={{ color: 'var(--wine)', fontWeight: 600 }}>
        Enter your verification code
      </a>}
      {resultStatus === 'already_registered' && <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <a href="/login" style={{ color: 'var(--wine)', fontWeight: 600 }}>Sign in</a>
        <a href="/forgot-password" style={{ color: 'var(--wine)', fontWeight: 600 }}>Reset your password</a>
      </div>}
      <button className="button" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Send verification code'}</button>
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>
      {mode === 'register' ? 'Already registered? ' : 'Need an account? '}
      <button type="button" className="textButton" onClick={() => { setMode(mode === 'register' ? 'resend' : 'register'); setError(''); setMessage(''); setResultStatus(''); }}>
        {mode === 'register' ? 'Resend verification' : 'Create one'}
      </button>
    </p>
    <p style={{ color: 'var(--muted)', fontSize: 14 }}>Already verified? <a href="/login" style={{ color: 'var(--wine)', fontWeight: 600 }}>Sign in</a></p>
    <a className="button secondary" href="/" style={{ marginTop: 12 }}>Back to home</a>
  </main>;
}

const fieldStyle: React.CSSProperties = {
  display: 'block', padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10,
  background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7,
};
