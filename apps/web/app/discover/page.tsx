'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MemberSessionExpiredError, memberApiFetch } from '../session';
import { useMemberSession } from '../use-member-session';

type Filters = { city: string; minAge: string; maxAge: string; maritalStatus: string };
type DiscoverProfile = {
  id: string;
  displayName: string;
  gender: string;
  selfDescribedGender: string | null;
  city: string | null;
  state: string | null;
  education: string | null;
  profession: string | null;
  bio: string | null;
  maritalStatus: string;
  hasChildren: boolean | null;
  languages: string[];
  interests: string[];
  age: number;
};
type ApiResult = { profiles?: DiscoverProfile[]; message?: string | string[] };

const emptyFilters: Filters = { city: '', minAge: '', maxAge: '', maritalStatus: '' };
const maritalStatusLabels: Record<string, string> = {
  NEVER_MARRIED: 'Never married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  LEGALLY_SEPARATED: 'Legally separated',
  ANNULLED: 'Annulled',
  OTHER: 'Other',
};
const maritalStatusOptions = Object.keys(maritalStatusLabels);
const tones = ['lavender', 'sage', 'peach'];

function messageFrom(data: ApiResult, fallback: string): string {
  if (Array.isArray(data.message)) return data.message.join(' ');
  return typeof data.message === 'string' ? data.message : fallback;
}

export default function DiscoverPage() {
  const memberSession = useMemberSession();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const searchProfiles = useCallback(async (selectedFilters: Filters) => {
    setBusy(true);
    setError('');
    setNotice('');
    const query = new URLSearchParams({ take: '30' });
    if (selectedFilters.city.trim()) query.set('city', selectedFilters.city.trim());
    if (selectedFilters.minAge) query.set('minAge', selectedFilters.minAge);
    if (selectedFilters.maxAge) query.set('maxAge', selectedFilters.maxAge);
    if (selectedFilters.maritalStatus) query.set('maritalStatus', selectedFilters.maritalStatus);

    try {
      const response = await memberApiFetch(`/profiles/discover?${query.toString()}`);
      const data = await response.json().catch(() => ({} as ApiResult)) as ApiResult;
      if (response.status === 404) {
        setPageStatus('unavailable');
        return;
      }
      if (response.status === 400 && typeof data.message === 'string' && data.message.includes('Create your profile')) {
        setProfiles([]);
        setNotice(data.message);
        setPageStatus('ready');
        return;
      }
      if (response.status === 400) {
        setError(messageFrom(data, 'The search filters are invalid.'));
        setPageStatus('ready');
        return;
      }
      if (!response.ok) throw new Error(messageFrom(data, 'Could not search member profiles.'));
      setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      setPageStatus('ready');
    } catch (searchError) {
      if (searchError instanceof MemberSessionExpiredError) {
        memberSession.retry();
        return;
      }
      setError(searchError instanceof Error ? searchError.message : 'Could not search member profiles.');
      setPageStatus('error');
    } finally {
      setBusy(false);
    }
  }, [memberSession.retry]);

  useEffect(() => {
    if (memberSession.status === 'authenticated') void searchProfiles(emptyFilters);
  }, [memberSession.status, searchProfiles, loadAttempt]);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await searchProfiles(filters);
  }

  if (memberSession.status === 'error') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70 }}>
      <p className="eyebrow">MEMBER SIGN IN</p><h1 className="serif">We couldn’t verify your session.</h1>
      <p role="alert">{memberSession.error}</p><button className="button" type="button" onClick={memberSession.retry}>Try again</button>
      <Link className="button secondary" href="/login/" style={{ marginTop: 12 }}>Return to sign in</Link>
    </main>;
  }
  if (memberSession.status === 'loading' || pageStatus === 'loading') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70 }}><p role="status">Loading member discovery…</p></main>;
  }
  if (pageStatus === 'unavailable') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70, paddingBottom: 80 }}>
      <Link className="brand" href="/">NayaSaath.</Link><p className="eyebrow" style={{ marginTop: 38 }}>MEMBER DISCOVERY</p>
      <h1 className="serif" style={{ fontSize: 40 }}>Discovery isn’t enabled yet.</h1>
      <p role="status" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>The live API is still in auth-only mode. No sample profiles are displayed or collected.</p>
      <Link className="button" href="/dashboard/">Return to dashboard</Link>
    </main>;
  }
  if (pageStatus === 'error') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70, paddingBottom: 80 }}>
      <Link className="brand" href="/">NayaSaath.</Link><p className="eyebrow" style={{ marginTop: 38 }}>MEMBER DISCOVERY</p>
      <h1 className="serif" style={{ fontSize: 40 }}>We couldn’t search profiles.</h1><p role="alert">{error}</p>
      <button className="button" type="button" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>
      <Link className="button secondary" href="/dashboard/" style={{ marginTop: 12 }}>Return to dashboard</Link>
    </main>;
  }

  return <main className="shell" style={{ maxWidth: 1120, paddingTop: 42, paddingBottom: 80 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <Link className="brand" href="/">NayaSaath.</Link><Link href="/dashboard/" className="text-link">Your dashboard →</Link>
    </header>
    <section style={{ marginTop: 42 }}>
      <p className="eyebrow">THOUGHTFUL INTRODUCTIONS</p><h1 className="serif" style={{ fontSize: 42 }}>Discover members</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Only active, published adult profiles appear here. Filters use your choices and never expose your date of birth or private preferences.</p>
      <form onSubmit={submitSearch} className="field-grid" style={{ marginTop: 24 }}>
        <label className="field">City<input value={filters.city} maxLength={100} onChange={event => setFilters(current => ({ ...current, city: event.target.value }))} /></label>
        <label className="field">Minimum age<input type="number" min={18} max={99} value={filters.minAge} onChange={event => setFilters(current => ({ ...current, minAge: event.target.value }))} /></label>
        <label className="field">Maximum age<input type="number" min={18} max={99} value={filters.maxAge} onChange={event => setFilters(current => ({ ...current, maxAge: event.target.value }))} /></label>
        <label className="field">Marital status<select value={filters.maritalStatus} onChange={event => setFilters(current => ({ ...current, maritalStatus: event.target.value }))}><option value="">Use my saved preference</option>{maritalStatusOptions.map(value => <option value={value} key={value}>{maritalStatusLabels[value]}</option>)}</select></label>
        <div className="field" style={{ alignSelf: 'end' }}><button className="button" disabled={busy}>{busy ? 'Searching…' : 'Search profiles'}</button></div>
      </form>
      {notice && <p role="status" style={{ color: 'var(--muted)', marginTop: 20 }}>{notice} <Link href="/profile/setup/" style={{ color: 'var(--wine)', fontWeight: 600 }}>Create your profile</Link></p>}
      {error && <p role="alert" style={{ color: '#a22', marginTop: 20 }}>{error}</p>}
      <section className="match-grid" aria-live="polite" style={{ marginTop: 32 }}>
        {profiles.map((profile, index) => <article className="match-card redesigned-match" key={profile.id}>
          <div className={`match-art ${tones[index % tones.length]}`}><span className="match-initials">{profile.displayName.trim().charAt(0).toUpperCase()}</span></div>
          <div className="match-info">
            <strong>{profile.displayName}, {profile.age}</strong>
            <span className="match-city">⌖ {[profile.city, profile.state].filter(Boolean).join(', ') || 'Location not shared'}</span>
            <p>{[profile.profession, profile.education, maritalStatusLabels[profile.maritalStatus] ?? profile.maritalStatus].filter(Boolean).join(' · ')}</p>
            {profile.bio && <p>{profile.bio}</p>}
            {profile.hasChildren === true && <small>Has children</small>}
            <button type="button" className="outline-button" disabled>Connection actions are coming in a later release</button>
          </div>
        </article>)}
      </section>
      {profiles.length === 0 && !notice && !busy && <p className="empty-state" style={{ marginTop: 24 }}>No profiles match these filters right now. Try widening your search.</p>}
    </section>
  </main>;
}
