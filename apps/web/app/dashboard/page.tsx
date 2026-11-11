'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logoutMemberSession } from '../session';
import { useMemberSession } from '../use-member-session';

const quickLinks = [
  { icon: '◉', title: 'My profile', desc: 'Choose what you share and when', meta: 'Manage', href: '/profile/setup/' },
  { icon: '♡', title: 'Discover matches', desc: 'Search eligible member profiles', meta: 'Explore', href: '/discover/' },
];
export default function DashboardPage() {
  const router = useRouter();
  const memberSession = useMemberSession();
  const [signingOut, setSigningOut] = useState(false);
  const memberEmail = memberSession.status === 'authenticated' ? memberSession.email : null;

  const memberInitial = memberEmail?.charAt(0).toUpperCase() ?? 'G';

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
          <div className="welcome-copy"><span className="eyebrow">A NEW CHAPTER, AT YOUR PACE</span><h1 className="serif">{memberEmail ? 'Welcome back.' : 'Good to have you here.'}</h1><p>{memberEmail ? 'Your account is ready. Set up a private profile and choose when it becomes visible.' : 'Make space for a connection that feels right. Start with a little introduction about yourself.'}</p><Link className="button" href="/profile/setup/">{memberEmail ? 'Manage your profile' : 'Create your profile'} <span>↗</span></Link></div>
          <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-sun">✦</div><div className="art-caption">A meaningful<br/>beginning</div></div>
        </section>
        <div className="preview-alert"><span>i</span><div><strong>Member discovery is being prepared</strong><br/>No sample or unverified profiles are shown. You can search real, eligible member profiles when discovery is available.</div></div>
        <div className="dashboard-grid redesigned-grid">
          <section className="profile-progress card-panel redesigned-card"><div className="panel-head"><div><span className="eyebrow">YOUR PROFILE JOURNEY</span><h2>Let them get to know you.</h2></div><span className="progress-number">25<small>%</small></span></div><div className="progress-track"><span style={{width:'25%'}} /></div><div className="progress-caption"><span>You're off to a lovely start</span><span>1 of 5 steps</span></div><ul className="todo-list"><li className="done"><span>✓</span><div><strong>Account created</strong><small>Your NayaSaath space is ready</small></div></li><li><span>02</span><div><strong>Personal introduction</strong><small>Share the details that describe you</small></div></li><li><span>03</span><div><strong>Background & values</strong><small>Tell us what matters to you</small></div></li><li><span>04</span><div><strong>Your ideal partnership</strong><small>Set preferences at your own pace</small></div></li><li><span>05</span><div><strong>Privacy choices</strong><small>Choose what others can see</small></div></li></ul><Link href="/profile/setup/" className="text-link">Continue your introduction <span>→</span></Link></section>
          <section className="trust-panel redesigned-note"><div className="note-flower">✿</div><span className="eyebrow">A LITTLE REMINDER</span><h2 className="serif">Your story is yours to tell.</h2><p>There is no one path to a meaningful marriage. Share your journey in your own words, and choose what feels comfortable to reveal.</p><a href="#privacy">Your privacy matters <span>↗</span></a><div className="note-decoration">N</div></section>
        </div>
        <section className="quick-section" id="interests"><div className="section-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h2>Your shortcuts</h2><p>Everything you need, thoughtfully in one place.</p></div></div><div className="quick-grid redesigned-quick">{quickLinks.map((item)=><Link className="quick-card redesigned-quick-card" href={item.href} key={item.title}><span className="quick-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.desc}</p><span className="quick-meta">{item.meta} <b>→</b></span></div></Link>)}</div></section>
        <section className="matches-section redesigned-matches" id="matches"><div className="section-heading"><div><span className="eyebrow">THOUGHTFUL INTRODUCTIONS</span><h2>Discover members</h2><p>Search eligible member profiles using your preferences.</p></div><Link className="text-link" href="/discover/">Open discovery <span>→</span></Link></div><p className="empty-state">No sample profiles are shown. Open discovery to search real member profiles when the service is available.</p></section>
        <footer className="app-footer"><span>© 2026 NayaSaath</span><span>Privacy first · Respect always · Marriage with intention</span></footer>
      </div>
    </section>
  </main>;
}
