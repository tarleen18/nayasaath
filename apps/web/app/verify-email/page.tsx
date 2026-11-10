'use client';

import { FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') ?? '');
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API}/auth/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(detail || 'Email verification failed.');
      }
      setCode('');
      setMessage(data.notice || 'Email verified. You can now sign in.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell" style={{ maxWidth: 560, paddingTop: 70, paddingBottom: 80 }}>
    <a className="brand" href="/">NayaSaath.</a>
    <p className="eyebrow" style={{ marginTop: 38 }}>EMAIL VERIFICATION</p>
    <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>Confirm your email.</h1>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Enter the six-digit code sent to your email address to activate your account. The code expires after 30 minutes and can only be used once.</p>
    {email && <p style={{ color: 'var(--muted)' }}>Address: <strong>{email}</strong></p>}
    <form onSubmit={verify} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
      <label>Email address<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} style={fieldStyle} /></label>
      <label>Six-digit verification code
        <input required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} style={fieldStyle} />
      </label>
      {error && <p role="alert" style={{ color: '#a22', lineHeight: 1.6, margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: '#356647', lineHeight: 1.6, margin: 0 }}>{message}</p>}
      {!message && <button className="button" disabled={busy || !email || code.length !== 6}>{busy ? 'Verifying…' : 'Verify email address'}</button>}
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>Verified already? <a href="/login" style={{ color: 'var(--wine)', fontWeight: 600 }}>Sign in</a></p>
    <a className="button secondary" href="/register" style={{ marginTop: 12 }}>Resend verification code</a>
  </main>;
}

const fieldStyle: React.CSSProperties = {
  display: 'block', padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10,
  background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7,
};
