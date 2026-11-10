'use client';

import { FormEvent, useState } from 'react';
import { PasswordField } from '../components/password-field';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function post(path: string, body: Record<string, string>) {
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'register') {
        await post('/auth/register', { email, password });
        setPassword('');
        setMessage('If this address can be registered, a verification code has been sent. Enter it on the verification page to activate your account.');
      } else {
        await post('/auth/email/resend', { email });
        setMessage('If this address has a pending account, a new verification code will be sent.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
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
    <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
      Local setup uses Mailpit to capture email at{' '}
      <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wine)', fontWeight: 600 }}>
        localhost:8025
      </a>{' '}
      instead of delivering externally. Configure a real SMTP provider to email users' inboxes.
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
      {message && <a href={`/verify-email?email=${encodeURIComponent(email.trim())}`} style={{ color: 'var(--wine)', fontWeight: 600 }}>
        Enter your verification code
      </a>}
      <button className="button" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Send verification code'}</button>
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>
      {mode === 'register' ? 'Already registered? ' : 'Need an account? '}
      <button type="button" className="textButton" onClick={() => { setMode(mode === 'register' ? 'resend' : 'register'); setError(''); setMessage(''); }}>
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
