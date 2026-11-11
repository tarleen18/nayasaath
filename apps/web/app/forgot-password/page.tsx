'use client';

import { FormEvent, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!API) throw new Error('Password recovery is temporarily unavailable because the authentication service is not configured.');
      const response = await fetch(`${API}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(detail || 'The request could not be completed.');
      }
      setMessage(data.notice || 'If an account exists for this address, password reset instructions will be sent.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell" style={{ maxWidth: 520, paddingTop: 70, paddingBottom: 80 }}>
    <a className="brand" href="/">NayaSaath.</a>
    <p className="eyebrow" style={{ marginTop: 38 }}>ACCOUNT RECOVERY</p>
    <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>Reset your password.</h1>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Enter your account email. If it is eligible, we will send a one-time reset link.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 28 }}>
      <label>Email address
        <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} style={fieldStyle} />
      </label>
      {error && <p role="alert" style={{ color: '#a22', lineHeight: 1.6, margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: '#356647', lineHeight: 1.6, margin: 0 }}>{message}</p>}
      <button className="button" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>Remembered it? <a href="/login" style={{ color: 'var(--wine)', fontWeight: 600 }}>Sign in</a></p>
    <a className="button secondary" href="/" style={{ marginTop: 12 }}>Back to home</a>
  </main>;
}

const fieldStyle: React.CSSProperties = {
  display: 'block', padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10,
  background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7,
};
