'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PasswordField } from '../components/password-field';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (!API) throw new Error('Password recovery is temporarily unavailable because the authentication service is not configured.');
      const response = await fetch(`${API}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(detail || 'The request could not be completed.');
      }
      setPassword('');
      setConfirmPassword('');
      setMessage(data.notice || 'Your password has been reset. You can now sign in.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell" style={{ maxWidth: 520, paddingTop: 70, paddingBottom: 80 }}>
    <a className="brand" href="/">NayaSaath.</a>
    <p className="eyebrow" style={{ marginTop: 38 }}>ACCOUNT RECOVERY</p>
    <h1 className="serif" style={{ fontSize: 42, marginTop: 12 }}>Choose a new password.</h1>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Reset links expire after 30 minutes and can only be used once.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, marginTop: 28 }}>
      <label>New password (at least 12 characters)
        <PasswordField required minLength={12} autoComplete="new-password" value={password} onChange={setPassword} style={fieldStyle} />
      </label>
      <label>Confirm new password
        <PasswordField required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} style={fieldStyle} />
      </label>
      {error && <p role="alert" style={{ color: '#a22', lineHeight: 1.6, margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: '#356647', lineHeight: 1.6, margin: 0 }}>{message}</p>}
      {!message && <button className="button" disabled={busy || !token}>{busy ? 'Resetting…' : 'Reset password'}</button>}
      {!token && !message && <p role="alert" style={{ color: '#a22', lineHeight: 1.6, margin: 0 }}>This reset link is missing or invalid. Request a new one.</p>}
    </form>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 22 }}>Remembered it? <a href="/login" style={{ color: 'var(--wine)', fontWeight: 600 }}>Sign in</a></p>
    <a className="button secondary" href="/forgot-password" style={{ marginTop: 12 }}>Request another reset link</a>
  </main>;
}

const fieldStyle: React.CSSProperties = {
  display: 'block', padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10,
  background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7,
};
