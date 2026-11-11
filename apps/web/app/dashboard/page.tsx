'use client';

import { useEffect, useState } from 'react';
import { getMemberEmail } from '../session';

const demoMatches = [
  { initials: 'A', name: 'Aarav, 29', city: 'Chandigarh', details: 'Software professional · Punjabi · Never married', tone: 'lavender' },
  { initials: 'S', name: 'Simran, 27', city: 'Ludhiana', details: 'Architect · Punjabi, Hindi · Never married', tone: 'sage' },
  { initials: 'R', name: 'Riya, 31', city: 'Delhi NCR', details: 'Business owner · Hindi, English · Divorced', tone: 'peach' },
];
const quickLinks = [
  { icon: '♡', title: 'Interests', desc: 'See who would like to connect', meta: 'Explore' },
  { icon: '◷', title: 'Profile visitors', desc: 'Discover who has viewed you', meta: 'Explore' },
  { icon: '✧', title: 'Verification', desc: 'Build trust, one check at a time', meta: 'Begin' },
  { icon: '⌘', title: 'Privacy & safety', desc: 'Your profile, your boundaries', meta: 'Manage' },
];
export default function DashboardPage() {
  const [memberEmail, setMemberEmail] = useState<string | null>(null);

  useEffect(() => {
    setMemberEmail(getMemberEmail());
  }, []);

  const memberInitial = memberEmail?.charAt(0).toUpperCase() ?? 'G';

  return <main className="app-page redesign-dashboard">
    <aside className="app-sidebar">
      <a className="brand app-brand" href="/">NayaSaath<span>.</span></a>
      <div className="sidebar-label">YOUR SPACE</div>
      <a className="side-link active" href="/dashboard"><span>⌂</span> Home</a>
      <a className="side-link" href="/profile/setup"><span>◉</span> My profile</a>
      <a className="side-link" href="#matches"><span>♡</span> Discover matches</a>
      <a className="side-link" href="#interests"><span>✉</span> Interests</a>
      <a className="side-link" href="#messages"><span>☏</span> Messages</a>
      <div className="sidebar-label side-gap">YOUR ACCOUNT</div>
      <a className="side-link" href="#verification"><span>✧</span> Verification</a>
      <a className="side-link" href="#privacy"><span>⚙</span> Privacy & safety</a>
      <div className="sidebar-note"><span>✦</span><p>Meaningful connections begin with being yourself.</p></div>
      <div className="sidebar-bottom"><div className="mini-avatar">{memberInitial}</div><div><strong>{memberEmail ?? 'Guest member'}</strong><small>{memberEmail ? 'Signed in for this tab' : 'Preview account'}</small></div><span className="more">···</span></div>
    </aside>
    <section className="app-main">
      <header className="app-topbar"><div><span className="crumb">Your space</span><span className="crumb-sep">/</span><strong>Home</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button><div className="top-avatar">{memberInitial}</div></div></header>
      <div className="dashboard-content redesigned-content">
        <section className="welcome-hero">
          <div className="welcome-copy"><span className="eyebrow">A NEW CHAPTER, AT YOUR PACE</span><h1 className="serif">{memberEmail ? 'Welcome back.' : 'Good to have you here.'}</h1><p>{memberEmail ? 'You are signed in. Your profile setup is currently a preview and does not save details yet.' : 'Make space for a connection that feels right. Start with a little introduction about yourself.'}</p><a className="button" href="/profile/setup">{memberEmail ? 'Open profile preview' : 'Create your profile'} <span>↗</span></a></div>
          <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="art-sun">✦</div><div className="art-caption">A meaningful<br/>beginning</div></div>
        </section>
        <div className="preview-alert"><span>i</span><div><strong>Preview experience</strong><br/>The sample introductions are illustrative. Profile editing and member matches are not connected to the API yet.</div></div>
        <div className="dashboard-grid redesigned-grid">
          <section className="profile-progress card-panel redesigned-card"><div className="panel-head"><div><span className="eyebrow">YOUR PROFILE JOURNEY</span><h2>Let them get to know you.</h2></div><span className="progress-number">25<small>%</small></span></div><div className="progress-track"><span style={{width:'25%'}} /></div><div className="progress-caption"><span>You're off to a lovely start</span><span>1 of 5 steps</span></div><ul className="todo-list"><li className="done"><span>✓</span><div><strong>Account created</strong><small>Your NayaSaath space is ready</small></div></li><li><span>02</span><div><strong>Personal introduction</strong><small>Share the details that describe you</small></div></li><li><span>03</span><div><strong>Background & values</strong><small>Tell us what matters to you</small></div></li><li><span>04</span><div><strong>Your ideal partnership</strong><small>Set preferences at your own pace</small></div></li><li><span>05</span><div><strong>Privacy choices</strong><small>Choose what others can see</small></div></li></ul><a href="/profile/setup" className="text-link">Continue your introduction <span>→</span></a></section>
          <section className="trust-panel redesigned-note"><div className="note-flower">✿</div><span className="eyebrow">A LITTLE REMINDER</span><h2 className="serif">Your story is yours to tell.</h2><p>There is no one path to a meaningful marriage. Share your journey in your own words, and choose what feels comfortable to reveal.</p><a href="#privacy">Your privacy matters <span>↗</span></a><div className="note-decoration">N</div></section>
        </div>
        <section className="quick-section" id="interests"><div className="section-heading"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h2>Your shortcuts</h2><p>Everything you need, thoughtfully in one place.</p></div></div><div className="quick-grid redesigned-quick">{quickLinks.map((item)=><a className="quick-card redesigned-quick-card" href={item.title==='Verification'?'#verification':item.title==='Privacy & safety'?'#privacy':'#matches'} key={item.title}><span className="quick-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.desc}</p><span className="quick-meta">{item.meta} <b>→</b></span></div></a>)}</div></section>
        <section className="matches-section redesigned-matches" id="matches"><div className="section-heading"><div><span className="eyebrow">THOUGHTFUL INTRODUCTIONS</span><h2>People you may like to meet</h2><p>As your profile grows, introductions can become more relevant to you.</p></div><a className="text-link" href="#matches">Explore all <span>→</span></a></div><div className="match-grid">{demoMatches.map((m)=><article className="match-card redesigned-match" key={m.name}><div className={`match-art ${m.tone}`}><span className="match-initials">{m.initials}</span><span className="preview-tag">SAMPLE PROFILE</span><span className="match-sparkle">✧</span></div><div className="match-info"><strong>{m.name}</strong><span className="match-city">⌖ {m.city}</span><p>{m.details}</p><button className="outline-button" type="button" disabled>Available after launch</button></div></article>)}</div></section>
        <footer className="app-footer"><span>© 2026 NayaSaath</span><span>Privacy first · Respect always · Marriage with intention</span></footer>
      </div>
    </section>
  </main>;
}
