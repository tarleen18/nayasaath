'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logoutMemberSession, MemberSessionExpiredError, memberApiFetch } from '../session';
import { useMemberSession } from '../use-member-session';

type DashboardProfile = {
  displayName: string;
  city: string | null;
  state: string | null;
  education: string | null;
  profession: string | null;
  maritalStatus: string;
  preference: { id: string } | null;
};

type ProfileResponse = {
  profile?: DashboardProfile | null;
  message?: string | string[];
};

const quickLinks = [
  { icon: '◉', title: 'My profile', desc: 'Choose what you share and when', meta: 'Manage', href: '/profile/setup/' },
  { icon: '♡', title: 'Discover matches', desc: 'Search eligible member profiles', meta: 'Explore', href: '/discover/' },
];
export default function DashboardPage() {
  const router = useRouter();
  const memberSession = useMemberSession();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [profileError, setProfileError] = useState('');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const memberEmail = memberSession.status === 'authenticated' ? memberSession.email : null;

  const memberInitial = memberEmail?.charAt(0).toUpperCase() ?? 'G';
  const completedSteps = useMemo(() => {
    if (!profile) return 1;
    return 4 + Number(Boolean(profile.preference));
  }, [profile]);
  const progressPercent = completedSteps * 20;

  useEffect(() => {
    if (memberSession.status !== 'authenticated') return;
    let active = true;
    setProfileStatus('loading');
    setProfileError('');

    async function loadProfile() {
      try {
        const response = await memberApiFetch('/profiles/me');
        if (response.status === 404) {
          if (active) setProfileStatus('unavailable');
          return;
        }
        const data = await response.json().catch(() => ({} as ProfileResponse)) as ProfileResponse;
        if (!response.ok) {
          const message = Array.isArray(data.message) ? data.message.join(' ') : data.message;
          throw new Error(typeof message === 'string' ? message : 'Could not load your profile.');
        }
        if (active) {
          setProfile(data.profile ?? null);
          setProfileStatus('ready');
        }
      } catch (error) {
        if (error instanceof MemberSessionExpiredError) {
          memberSession.retry();
          return;
        }
        if (active) {
          setProfileError(error instanceof Error ? error.message : 'Could not load your profile.');
          setProfileStatus('error');
        }
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, [memberSession.status, memberSession.retry, profileAttempt]);

  async function signOut() {
    setSigningOut(true);
    try {
      await logoutMemberSession();
      router.replace('/login/');
    } catch {
      router.replace('/login/?logout=unconfirmed');
    }
  }

  if (memberSession.status === 'loading') {
    return <main className="shell" style={{ maxWidth: 520, paddingTop: 70 }}><p role="status">Checking your sign-in…</p></main>;
  }
  if (memberSession.status === 'error') {
    return <main className="shell" style={{ maxWidth: 520, paddingTop: 70 }}>
      <p className="eyebrow">MEMBER SIGN IN</p>
      <h1 className="serif">We couldn’t verify your session.</h1>
      <p role="alert">{memberSession.error}</p>
      <button className="button" type="button" onClick={memberSession.retry}>Try again</button>
      <a className="button secondary" href="/login/" style={{ marginTop: 12 }}>Return to sign in</a>
    </main>;
  }

  return <main className="app-page redesign-dashboard">
    <aside className="app-sidebar">
      <Link className="brand app-brand" href="/">NayaSaath<span>.</span></Link>
      <div className="sidebar-label">YOUR SPACE</div>
      <Link className="side-link active" href="/dashboard/"><span>⌂</span> Home</Link>
      <Link className="side-link" href="/profile/setup/"><span>◉</span> My profile</Link>
      <Link className="side-link" href="/discover/"><span>♡</span> Discover matches</Link>
      <a className="side-link" href="#interests"><span>✉</span> Interests</a>
      <a className="side-link" href="#messages"><span>☏</span> Messages</a>
      <div className="sidebar-label side-gap">YOUR ACCOUNT</div>
      <Link className="side-link" href="/profile/setup/"><span>⚙</span> Profile & visibility</Link>
      <div className="sidebar-note"><span>✦</span><p>Meaningful connections begin with being yourself.</p></div>
      <div className="sidebar-bottom"><div className="mini-avatar">{memberInitial}</div><div><strong>{memberEmail}</strong><small>Signed in for this tab</small></div><button type="button" disabled={signingOut} onClick={signOut} aria-label="Sign out" style={{ border: 0, background: 'transparent', color: 'var(--wine)', cursor: 'pointer', font: 'inherit' }}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
    </aside>
    <section className="app-main">
      <header className="app-topbar"><div><span className="crumb">Your space</span><span className="crumb-sep">/</span><strong>Home</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button><div className="top-avatar">{memberInitial}</div></div></header>
      <div className="dashboard-content redesigned-content">
        <section className="welcome-hero">
          <div className="welcome-copy"><span className="eyebrow">A NEW CHAPTER, AT YOUR PACE</span><h1 className="serif">{profile?.displayName ? `Welcome, ${profile.displayName}.` : memberEmail ? 'Welcome back.' : 'Good to have you here.'}</h1><p>{profile ? 'Your private profile is saved here. You can review or update it whenever you like.' : memberEmail ? 'Your account is ready. Start your private profile whenever you’re ready.' : 'Make space for a connection that feels right. Start with a little introduction about yourself.'}</p><Link className="button" href="/profile/setup/">{profile ? 'View your profile' : memberEmail ? 'Create your profile' : 'Create your profile'} <span>↗</span></Link></div>
          <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-sun">✦</div><div className="art-caption">A meaningful<br/>beginning</div></div>
        </section>
        <div className="preview-alert"><span>i</span><div><strong>Member discovery is being prepared</strong><br/>No sample or unverified profiles are shown. You can search real, eligible member profiles when discovery is available.</div></div>
        <div className="dashboard-grid redesigned-grid">
          <section className="profile-progress card-panel redesigned-card" aria-labelledby="dashboard-profile-heading">
            <div className="panel-head">
              <div><span className="eyebrow">YOUR PRIVATE PROFILE</span><h2 id="dashboard-profile-heading">{profileStatus === 'loading' ? 'Loading your profile…' : profile?.displayName ?? 'Let them get to know you.'}</h2></div>
              {profile && <span className="quick-meta">Private in this release</span>}
            </div>
            {profileStatus === 'error' && <p role="alert" style={{ color: '#a22' }}>{profileError} <button type="button" className="text-link" onClick={() => setProfileAttempt(value => value + 1)}>Try again</button></p>}
            {profileStatus === 'unavailable' && <p role="status">Private profile saving is not available right now.</p>}
            {profileStatus === 'ready' && profile && <div style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: 13 }}>
              {[profile.city, profile.state].filter(Boolean).join(', ') && <p style={{ margin: '0 0 6px' }}>{[profile.city, profile.state].filter(Boolean).join(', ')}</p>}
              <p style={{ margin: '0 0 6px' }}>{[profile.profession, profile.education].filter(Boolean).join(' · ') || profile.maritalStatus.replaceAll('_', ' ').toLowerCase()}</p>
              <p style={{ margin: '0 0 12px' }}>Your profile is not displayed to other members in this release. Publishing and discovery are not enabled.</p>
            </div>}
            {profileStatus === 'ready' && !profile && <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your profile hasn’t been saved yet. Add your introduction and life journey to see it here.</p>}
            {profileStatus === 'ready' && <><div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div><div className="progress-caption"><span>{profile ? 'Your profile progress' : 'Start when you’re ready'}</span><span>{completedSteps} of 5 steps</span></div></>}
            <ul className="todo-list">
              <li className="done"><span>✓</span><div><strong>Account created</strong><small>Your NayaSaath space is ready</small></div></li>
              <li className={profile ? 'done' : ''}><span>{profile ? '✓' : '02'}</span><div><strong>Personal introduction</strong><small>{profile ? 'Saved to your private profile' : 'Share the details that describe you'}</small></div></li>
              <li className={profile ? 'done' : ''}><span>{profile ? '✓' : '03'}</span><div><strong>Background & values</strong><small>{profile ? 'Your life journey is saved privately' : 'Tell us what matters to you'}</small></div></li>
              <li className={profile?.preference ? 'done' : ''}><span>{profile?.preference ? '✓' : '04'}</span><div><strong>Your ideal partnership</strong><small>{profile?.preference ? 'Preferences saved privately' : 'Set preferences at your own pace'}</small></div></li>
              <li className={profile ? 'done' : ''}><span>{profile ? '✓' : '05'}</span><div><strong>Privacy choices</strong><small>{profile ? 'Your profile is private in this release' : 'Your profile visibility'}</small></div></li>
            </ul>
            <Link href="/profile/setup/" className="text-link">{profile ? 'Review your profile' : 'Create your profile'} <span>→</span></Link>
          </section>
          <section className="trust-panel redesigned-note"><div className="note-flower">✿</div><span className="eyebrow">A LITTLE REMINDER</span><h2 className="serif">Your story is yours to tell.</h2><p>There is no one path to a meaningful marriage. Share your journey in your own words, and choose what feels comfortable to reveal.</p><a href="#privacy">Your privacy matters <span>↗</span></a><div className="note-decoration">N</div></section>
        </div>
        <section className="quick-section" id="interests"><div className="section-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h2>Your shortcuts</h2><p>Everything you need, thoughtfully in one place.</p></div></div><div className="quick-grid redesigned-quick">{quickLinks.map((item)=><Link className="quick-card redesigned-quick-card" href={item.href} key={item.title}><span className="quick-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.desc}</p><span className="quick-meta">{item.meta} <b>→</b></span></div></Link>)}</div></section>
        <section className="matches-section redesigned-matches" id="matches"><div className="section-heading"><div><span className="eyebrow">THOUGHTFUL INTRODUCTIONS</span><h2>Discover members</h2><p>Search eligible member profiles using your preferences.</p></div><Link className="text-link" href="/discover/">Open discovery <span>→</span></Link></div><p className="empty-state">No sample profiles are shown. Open discovery to search real member profiles when the service is available.</p></section>
        <footer className="app-footer"><span>© 2026 NayaSaath</span><span>Privacy first · Respect always · Marriage with intention</span></footer>
      </div>
    </section>
  </main>;
}
