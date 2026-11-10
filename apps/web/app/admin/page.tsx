'use client';

import { useCallback, useEffect, useState } from 'react';
import { PasswordField } from '../components/password-field';

type CaseItem = {
  id: string; type: string; status: string; claimedMaritalStatus: string | null; submittedAt: string;
  user: { id: string; email: string | null; phoneE164: string | null; profile: { displayName: string; maritalStatus: string } | null };
  documents: { id: string; kind: string; originalFilename: string; mimeType: string; fileSizeBytes: number; uploadedAt: string }[];
};
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true); setError('');
    try { setCases(await request('/admin/verification-queue')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load queue'); }
    finally { setBusy(false); }
  }, [request, token]);

  useEffect(() => { if (token) void load(); }, [token, load]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setToken(result.accessToken); setPassword(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed'); }
    finally { setBusy(false); }
  }

  async function review(id: string, status: string) {
    setBusy(true); setError('');
    try {
      await request(`/admin/verification-cases/${id}/review`, { method: 'POST', body: JSON.stringify({ status, reason: reasons[id] || undefined }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Review failed'); }
    finally { setBusy(false); }
  }

  if (!token) return <main className="shell" style={{ maxWidth: 520, paddingTop: 90, paddingBottom: 90 }}>
    <a className="brand" href="/">NayaSaath</a><p className="eyebrow" style={{ marginTop: 38 }}>RESTRICTED STAFF AREA</p>
    <h1 className="serif" style={{ fontSize: 42 }}>Admin sign in</h1>
    <p style={{ color: '#6c6a63', lineHeight: 1.7 }}>Only provisioned staff accounts can access member verification records.</p>
    <form onSubmit={login} style={{ display: 'grid', gap: 14, marginTop: 28 }}>
      <label>Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle}/></label>
      <label>Password<PasswordField required autoComplete="current-password" value={password} onChange={setPassword} style={fieldStyle}/></label>
      {error && <p role="alert" style={{ color: '#a22' }}>{error}</p>}
      <button className="button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
    </form>
  </main>;

  const visible = filter === 'ALL' ? cases : cases.filter(item => item.type === filter);
  return <main className="shell" style={{ paddingTop: 35, paddingBottom: 80 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div><a className="brand" href="/">NayaSaath</a><p className="eyebrow" style={{ marginTop: 16 }}>ADMIN · VERIFICATION REVIEW</p><h1 className="serif" style={{ fontSize: 40, margin: '8px 0' }}>Review queue</h1></div>
      <button className="button secondary" onClick={() => { setToken(''); setCases([]); }}>Sign out</button>
    </header>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '22px 0', flexWrap: 'wrap' }}>
      <select aria-label="Filter verification type" value={filter} onChange={e => setFilter(e.target.value)} style={fieldStyle}>
        <option value="ALL">All verification types</option><option value="IDENTITY">Identity</option><option value="MARITAL_STATUS">Marital status</option><option value="EMPLOYMENT">Employment</option><option value="EDUCATION">Education</option>
      </select>
      <button className="button secondary" onClick={() => void load()} disabled={busy}>Refresh queue</button>
      <span style={{ color: '#6c6a63', fontSize: 13 }}>{visible.length} cases</span>
    </div>
    {error && <p role="alert" style={{ color: '#a22' }}>{error}</p>}
    {visible.length === 0 && <section className="feature"><h3>No cases in this queue</h3><p>Newly submitted verification cases will appear here.</p></section>}
    <div style={{ display: 'grid', gap: 16 }}>
      {visible.map(item => <article key={item.id} className="feature" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><span className="eyebrow">{item.type.replaceAll('_', ' ')}</span><h2 className="serif" style={{ margin: '8px 0', fontSize: 25 }}>{item.user.profile?.displayName ?? 'Profile not completed'}</h2><p style={{ color: '#6c6a63', margin: 0, fontSize: 13 }}>{item.user.email ?? 'No email'} · {item.user.phoneE164 ?? 'No phone'} · Submitted {new Date(item.submittedAt).toLocaleString('en-IN')}</p></div>
          <span style={{ height: 30, padding: '7px 12px', borderRadius: 20, background: '#eee5d8', color: '#713b4b', fontSize: 11, fontWeight: 700 }}>{item.status.replaceAll('_', ' ')}</span>
        </div>
        <p style={{ fontSize: 14, color: '#514e48' }}>Claimed status: <strong>{item.claimedMaritalStatus ?? item.user.profile?.maritalStatus ?? 'Not applicable'}</strong></p>
        <div style={{ borderTop: '1px solid #e9e1d5', paddingTop: 14 }}><strong style={{ fontSize: 13 }}>Submitted document metadata</strong>
          {item.documents.length ? item.documents.map(doc => <p key={doc.id} style={{ fontSize: 13, color: '#6c6a63' }}>{doc.kind.replaceAll('_', ' ')} · {doc.originalFilename} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>) : <p style={{ color: '#a22', fontSize: 13 }}>No documents attached yet.</p>}
        </div>
        <label style={{ display: 'block', marginTop: 12, fontSize: 13 }}>Reviewer note / reason<textarea value={reasons[item.id] ?? ''} onChange={e => setReasons(old => ({ ...old, [item.id]: e.target.value }))} rows={2} style={{ ...fieldStyle, width: '100%', marginTop: 6 }} placeholder="Record objective evidence or request missing information"/></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {item.status === 'PENDING' && <button className="button" disabled={busy} onClick={() => void review(item.id, 'IN_REVIEW')}>Start review</button>}
          {item.status === 'NEEDS_INFORMATION' && <button className="button" disabled={busy} onClick={() => void review(item.id, 'IN_REVIEW')}>Resume review</button>}
          {item.status === 'IN_REVIEW' && <>
            <button className="button" disabled={busy} onClick={() => void review(item.id, 'APPROVED')}>Approve</button>
            <button className="button secondary" disabled={busy || !(reasons[item.id] ?? '').trim()} onClick={() => void review(item.id, 'NEEDS_INFORMATION')}>Request information</button>
            <button className="button secondary" disabled={busy || !(reasons[item.id] ?? '').trim()} onClick={() => void review(item.id, 'REJECTED')}>Reject with reason</button>
          </>}
        </div>
        <p style={{ color: '#8a6a43', fontSize: 11, lineHeight: 1.5, marginBottom: 0 }}>Document previews are intentionally not exposed until private object storage and short-lived, audited document access are configured.</p>
      </article>)}
    </div>
  </main>;
}
const fieldStyle: React.CSSProperties = { padding: '12px 13px', border: '1px solid #e2d8ca', borderRadius: 10, background: '#fffdf8', color: '#20201d', font: 'inherit', width: '100%', marginTop: 7 };
