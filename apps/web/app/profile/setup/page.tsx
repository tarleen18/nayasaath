'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MemberSessionExpiredError, memberApiFetch } from '../../session';
import { useMemberSession } from '../../use-member-session';

type ProfileValues = {
  displayName: string;
  gender: string;
  selfDescribedGender: string;
  dateOfBirth: string;
  city: string;
  state: string;
  education: string;
  profession: string;
  languages: string;
  interests: string;
  bio: string;
  maritalStatus: string;
  maritalStatusDetails: string;
  hasChildren: string;
  childrenCount: string;
  childrenLivingArrangement: string;
};

type PreferenceValues = {
  minAge: string;
  maxAge: string;
  preferredCities: string;
  acceptedMaritalStatuses: string[];
  openToPartnerWithChildren: string;
  educationPreferences: string;
  languagePreferences: string;
};

type SavedProfile = {
  displayName: string;
  gender: string;
  selfDescribedGender: string | null;
  city: string | null;
  state: string | null;
  education: string | null;
  profession: string | null;
  bio: string | null;
  maritalStatus: string;
  maritalStatusDetails: string | null;
  hasChildren: boolean | null;
  childrenCount: number | null;
  childrenLivingArrangement: string | null;
  languages: string[];
  interests: string[];
  profileVisible: boolean;
  user?: { dateOfBirth: string | null };
  preference?: {
    minAge: number | null;
    maxAge: number | null;
    preferredCities: string[];
    acceptedMaritalStatuses: string[];
    openToPartnerWithChildren: boolean | null;
    willingToRelocate: boolean | null;
    educationPreferences: string[];
    languagePreferences: string[];
  } | null;
};

type ApiResult = {
  profile?: SavedProfile | null;
  message?: string | string[];
};

const emptyProfile: ProfileValues = {
  displayName: '',
  gender: '',
  selfDescribedGender: '',
  dateOfBirth: '',
  city: '',
  state: '',
  education: '',
  profession: '',
  languages: '',
  interests: '',
  bio: '',
  maritalStatus: '',
  maritalStatusDetails: '',
  hasChildren: '',
  childrenCount: '',
  childrenLivingArrangement: '',
};

const emptyPreferences: PreferenceValues = {
  minAge: '',
  maxAge: '',
  preferredCities: '',
  acceptedMaritalStatuses: [],
  openToPartnerWithChildren: '',
  educationPreferences: '',
  languagePreferences: '',
};

const genderToApi: Record<string, string> = {
  Woman: 'WOMAN',
  Man: 'MAN',
  'Non-binary': 'NON_BINARY',
  'Self-describe': 'SELF_DESCRIBED',
};
const genderFromApi = Object.fromEntries(Object.entries(genderToApi).map(([label, value]) => [value, label]));
const statusToApi: Record<string, string> = {
  'Never married': 'NEVER_MARRIED',
  Divorced: 'DIVORCED',
  Widowed: 'WIDOWED',
  'Legally separated': 'LEGALLY_SEPARATED',
  Annulled: 'ANNULLED',
  Other: 'OTHER',
};
const statusFromApi = Object.fromEntries(Object.entries(statusToApi).map(([label, value]) => [value, label]));
const splitList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

function responseMessage(data: ApiResult, fallback: string): string {
  if (Array.isArray(data.message)) return data.message.join(' ');
  return typeof data.message === 'string' ? data.message : fallback;
}

function profileValuesFromApi(profile: SavedProfile): ProfileValues {
  return {
    ...emptyProfile,
    displayName: profile.displayName ?? '',
    gender: genderFromApi[profile.gender] ?? '',
    selfDescribedGender: profile.selfDescribedGender ?? '',
    dateOfBirth: profile.user?.dateOfBirth?.slice(0, 10) ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    education: profile.education ?? '',
    profession: profile.profession ?? '',
    languages: profile.languages?.join(', ') ?? '',
    interests: profile.interests?.join(', ') ?? '',
    bio: profile.bio ?? '',
    maritalStatus: statusFromApi[profile.maritalStatus] ?? '',
    maritalStatusDetails: profile.maritalStatusDetails ?? '',
    hasChildren: profile.hasChildren == null ? '' : profile.hasChildren ? 'Yes' : 'No',
    childrenCount: profile.childrenCount == null ? '' : String(profile.childrenCount),
    childrenLivingArrangement: profile.childrenLivingArrangement ?? '',
  };
}

function preferencesFromApi(preference: SavedProfile['preference']): PreferenceValues {
  if (!preference) return emptyPreferences;
  return {
    minAge: preference.minAge == null ? '' : String(preference.minAge),
    maxAge: preference.maxAge == null ? '' : String(preference.maxAge),
    preferredCities: preference.preferredCities.join(', '),
    acceptedMaritalStatuses: preference.acceptedMaritalStatuses.map(status => statusFromApi[status] ?? status),
    openToPartnerWithChildren: preference.openToPartnerWithChildren == null ? '' : preference.openToPartnerWithChildren ? 'Yes' : 'No',
    educationPreferences: preference.educationPreferences.join(', '),
    languagePreferences: preference.languagePreferences.join(', '),
  };
}

const fieldStyle: React.CSSProperties = {
  display: 'block',
  padding: '12px 13px',
  border: '1px solid #e2d8ca',
  borderRadius: 10,
  background: '#fffdf8',
  color: '#20201d',
  font: 'inherit',
  width: '100%',
  marginTop: 7,
};

export default function ProfileSetupPage() {
  const memberSession = useMemberSession();
  const [step, setStep] = useState(0);
  const [profileValues, setProfileValues] = useState<ProfileValues>(emptyProfile);
  const [preferenceValues, setPreferenceValues] = useState<PreferenceValues>(emptyPreferences);
  const [profileExists, setProfileExists] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const filled = useMemo(
    () => Object.values(profileValues).filter(value => value.trim().length > 0).length,
    [profileValues],
  );
  const updateProfileValue = (name: keyof ProfileValues, value: string) => {
    setProfileValues(current => ({ ...current, [name]: value }));
    setMessage('');
    setError('');
  };
  const updatePreferenceValue = (name: keyof PreferenceValues, value: string | string[]) => {
    setPreferenceValues(current => ({ ...current, [name]: value }));
    setMessage('');
    setError('');
  };

  useEffect(() => {
    if (memberSession.status !== 'authenticated') return;
    let active = true;
    setPageStatus('loading');
    setError('');

    async function loadProfile() {
      try {
        const response = await memberApiFetch('/profiles/me');
        if (response.status === 404) {
          if (active) setPageStatus('unavailable');
          return;
        }
        const data = await response.json().catch(() => ({} as ApiResult)) as ApiResult;
        if (!response.ok) throw new Error(responseMessage(data, 'Could not load your profile.'));
        if (data.profile) {
          setProfileValues(profileValuesFromApi(data.profile));
          setPreferenceValues(preferencesFromApi(data.profile.preference));
          setProfileExists(true);
          setProfileVisible(data.profile.profileVisible);
        }
        if (active) setPageStatus('ready');
      } catch (loadError) {
        if (loadError instanceof MemberSessionExpiredError) {
          memberSession.retry();
          return;
        }
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load your profile.');
          setPageStatus('error');
        }
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, [memberSession.status, memberSession.retry, loadAttempt]);

  async function saveProfile() {
    setError('');
    setMessage('');
    if (!profileValues.displayName.trim() || !profileValues.gender || !profileValues.dateOfBirth || !profileValues.maritalStatus) {
      setError('Name, gender, date of birth, and marital status are required.');
      return;
    }
    setBusy(true);
    try {
      const response = await memberApiFetch('/profiles/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profileValues.displayName.trim(),
          gender: genderToApi[profileValues.gender],
          selfDescribedGender: profileValues.gender === 'Self-describe' ? profileValues.selfDescribedGender.trim() : undefined,
          dateOfBirth: profileValues.dateOfBirth,
          maritalStatus: statusToApi[profileValues.maritalStatus],
          maritalStatusDetails: profileValues.maritalStatusDetails.trim() || undefined,
          city: profileValues.city.trim() || undefined,
          state: profileValues.state.trim() || undefined,
          education: profileValues.education.trim() || undefined,
          profession: profileValues.profession.trim() || undefined,
          bio: profileValues.bio.trim() || undefined,
          hasChildren: profileValues.hasChildren === '' ? undefined : profileValues.hasChildren === 'Yes',
          childrenCount: profileValues.hasChildren === 'Yes' && profileValues.childrenCount ? Number(profileValues.childrenCount) : undefined,
          childrenLivingArrangement: profileValues.hasChildren === 'Yes' ? profileValues.childrenLivingArrangement.trim() || undefined : undefined,
          languages: splitList(profileValues.languages),
          interests: splitList(profileValues.interests),
        }),
      });
      const data = await response.json().catch(() => ({} as ApiResult)) as ApiResult;
      if (!response.ok) throw new Error(responseMessage(data, 'Could not save your profile.'));
      setProfileExists(true);
      setProfileVisible(data.profile?.profileVisible ?? false);
      setMessage(responseMessage(data, 'Your profile is saved privately. Publish it when you are ready.'));
    } catch (saveError) {
      if (saveError instanceof MemberSessionExpiredError) {
        memberSession.retry();
      } else {
        setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function savePreferences() {
    setError('');
    setMessage('');
    if (!profileExists) {
      setError('Save your basic profile before saving partner preferences.');
      return;
    }
    setBusy(true);
    try {
      const response = await memberApiFetch('/profiles/me/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minAge: preferenceValues.minAge ? Number(preferenceValues.minAge) : undefined,
          maxAge: preferenceValues.maxAge ? Number(preferenceValues.maxAge) : undefined,
          preferredCities: splitList(preferenceValues.preferredCities),
          acceptedMaritalStatuses: preferenceValues.acceptedMaritalStatuses.map(status => statusToApi[status]),
          openToPartnerWithChildren: preferenceValues.openToPartnerWithChildren === '' ? undefined : preferenceValues.openToPartnerWithChildren === 'Yes',
          educationPreferences: splitList(preferenceValues.educationPreferences),
          languagePreferences: splitList(preferenceValues.languagePreferences),
        }),
      });
      const data = await response.json().catch(() => ({} as ApiResult)) as ApiResult;
      if (!response.ok) throw new Error(responseMessage(data, 'Could not save partner preferences.'));
      setMessage('Your partner preferences are saved privately.');
    } catch (saveError) {
      if (saveError instanceof MemberSessionExpiredError) {
        memberSession.retry();
      } else {
        setError(saveError instanceof Error ? saveError.message : 'Could not save partner preferences.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeVisibility(visible: boolean) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const response = await memberApiFetch(`/profiles/me/${visible ? 'publish' : 'hide'}`, { method: 'POST' });
      const data = await response.json().catch(() => ({} as ApiResult)) as ApiResult;
      if (!response.ok) throw new Error(responseMessage(data, 'Could not update profile visibility.'));
      setProfileVisible(visible);
      setMessage(responseMessage(data, visible ? 'Your profile is visible to eligible members.' : 'Your profile is hidden from discovery.'));
    } catch (visibilityError) {
      if (visibilityError instanceof MemberSessionExpiredError) {
        memberSession.retry();
      } else {
        setError(visibilityError instanceof Error ? visibilityError.message : 'Could not update profile visibility.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (memberSession.status === 'loading') {
    return <main className="shell" style={{ maxWidth: 520, paddingTop: 70 }}><p role="status">Checking your sign-in…</p></main>;
  }
  if (memberSession.status === 'error') {
    return <main className="shell" style={{ maxWidth: 520, paddingTop: 70 }}>
      <p className="eyebrow">MEMBER SIGN IN</p><h1 className="serif">We couldn’t verify your session.</h1>
      <p role="alert">{memberSession.error}</p><button className="button" type="button" onClick={memberSession.retry}>Try again</button>
      <Link className="button secondary" href="/login/" style={{ marginTop: 12 }}>Return to sign in</Link>
    </main>;
  }
  if (pageStatus === 'loading') {
    return <main className="shell" style={{ maxWidth: 520, paddingTop: 70 }}><p role="status">Loading your private profile…</p></main>;
  }
  if (pageStatus === 'unavailable') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70, paddingBottom: 80 }}>
      <Link className="brand" href="/">NayaSaath.</Link><p className="eyebrow" style={{ marginTop: 38 }}>PROFILE SETUP</p>
      <h1 className="serif" style={{ fontSize: 40 }}>Profile services aren’t enabled yet.</h1>
      <p role="status" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>Your sign-in is protected, but the live API is still in auth-only mode. This page will not collect profile details until profile saving is available.</p>
      <Link className="button" href="/dashboard/">Return to dashboard</Link>
    </main>;
  }
  if (pageStatus === 'error') {
    return <main className="shell" style={{ maxWidth: 620, paddingTop: 70, paddingBottom: 80 }}>
      <Link className="brand" href="/">NayaSaath.</Link><p className="eyebrow" style={{ marginTop: 38 }}>PROFILE SETUP</p>
      <h1 className="serif" style={{ fontSize: 40 }}>We couldn’t load your profile.</h1><p role="alert">{error}</p>
      <button className="button" type="button" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>
      <Link className="button secondary" href="/dashboard/" style={{ marginTop: 12 }}>Return to dashboard</Link>
    </main>;
  }

  const sectionTitles = ['Your introduction', 'Life journey', 'Partner preferences', 'Privacy'];
  return <main className="setup-page">
    <header className="setup-header">
      <Link className="brand" href="/">NayaSaath<span>.</span></Link>
      <div className="setup-header-right"><span>PROFILE SETUP</span><Link href="/dashboard/">Exit to dashboard</Link></div>
    </header>
    <div className="setup-layout">
      <aside className="setup-aside">
        <span className="eyebrow">YOUR INTRODUCTION</span><h1 className="serif">A little more about you.</h1>
        <p>Share only what feels right. Your profile stays hidden until you choose to publish it.</p>
        <div className="setup-progress"><div><span>FIELDS COMPLETED</span><strong>{filled}</strong></div><div className="progress-track"><span style={{ width: `${Math.min(filled * 6, 100)}%` }} /></div></div>
        <nav className="step-nav" aria-label="Profile sections">
          {sectionTitles.map((title, index) => <button type="button" key={title} onClick={() => setStep(index)} className={index === step ? 'step-item selected' : 'step-item'}>
            <span className="step-dot">{String(index + 1).padStart(2, '0')}</span><span>{title}</span><span className="step-chevron">›</span>
          </button>)}
        </nav>
        <div className="privacy-note"><span>♧</span><div><strong>Your information belongs to you.</strong><p>Date of birth and private preferences are never shown on public discovery cards.</p></div></div>
      </aside>
      <section className="setup-form-wrap">
        <div className="form-topline"><span>STEP {step + 1} OF {sectionTitles.length}</span><span>{memberSession.email}</span></div>
        <div className="form-card">
          <div className="eyebrow">{step === 1 ? 'YOUR JOURNEY' : step === 2 ? 'WHAT MATTERS TO YOU' : step === 3 ? 'YOUR CHOICES' : 'GETTING TO KNOW YOU'}</div>
          <h2 className="serif">{sectionTitles[step]}</h2>
          <p className="form-subtitle">{step === 2 ? 'These preferences are saved privately and used to filter member discovery where matching fields are available.' : 'Only profile fields supported by the member API are collected here. You can leave optional details blank.'}</p>

          {step === 0 && <div className="field-grid">
            <label className="field">Name you want members to see<input required minLength={2} maxLength={80} autoComplete="name" style={fieldStyle} value={profileValues.displayName} onChange={event => updateProfileValue('displayName', event.target.value)} /></label>
            <label className="field">Gender<select required style={fieldStyle} value={profileValues.gender} onChange={event => updateProfileValue('gender', event.target.value)}><option value="">Choose an option</option>{Object.keys(genderToApi).map(option => <option key={option}>{option}</option>)}</select></label>
            {profileValues.gender === 'Self-describe' && <label className="field">Describe your gender<input required maxLength={60} style={fieldStyle} value={profileValues.selfDescribedGender} onChange={event => updateProfileValue('selfDescribedGender', event.target.value)} /></label>}
            <label className="field">Date of birth<input required type="date" max={new Date().toISOString().slice(0, 10)} style={fieldStyle} value={profileValues.dateOfBirth} onChange={event => updateProfileValue('dateOfBirth', event.target.value)} /><em>You must be at least 18. Eligibility is checked by the server.</em></label>
            <label className="field">Current city<input maxLength={100} style={fieldStyle} value={profileValues.city} onChange={event => updateProfileValue('city', event.target.value)} /></label>
            <label className="field">State<input maxLength={100} style={fieldStyle} value={profileValues.state} onChange={event => updateProfileValue('state', event.target.value)} /></label>
            <label className="field">Education<input maxLength={100} style={fieldStyle} value={profileValues.education} onChange={event => updateProfileValue('education', event.target.value)} /></label>
            <label className="field">Profession<input maxLength={100} style={fieldStyle} value={profileValues.profession} onChange={event => updateProfileValue('profession', event.target.value)} /></label>
            <label className="field field-wide">Languages <small>Separate entries with commas</small><input style={fieldStyle} value={profileValues.languages} onChange={event => updateProfileValue('languages', event.target.value)} /></label>
            <label className="field field-wide">Interests <small>Separate entries with commas</small><input style={fieldStyle} value={profileValues.interests} onChange={event => updateProfileValue('interests', event.target.value)} /></label>
            <label className="field field-wide">A little about you<textarea rows={4} maxLength={1200} style={fieldStyle} value={profileValues.bio} onChange={event => updateProfileValue('bio', event.target.value)} /></label>
          </div>}

          {step === 1 && <div className="field-grid">
            <label className="field">Current marital status<select required style={fieldStyle} value={profileValues.maritalStatus} onChange={event => updateProfileValue('maritalStatus', event.target.value)}><option value="">Choose an option</option>{Object.keys(statusToApi).map(option => <option key={option}>{option}</option>)}</select></label>
            <label className="field field-wide">Anything you would like a potential partner to understand?<textarea maxLength={1000} rows={4} style={fieldStyle} value={profileValues.maritalStatusDetails} onChange={event => updateProfileValue('maritalStatusDetails', event.target.value)} /></label>
            <label className="field">Do you have children?<select style={fieldStyle} value={profileValues.hasChildren} onChange={event => updateProfileValue('hasChildren', event.target.value)}><option value="">Choose an option</option><option>Yes</option><option>No</option></select></label>
            {profileValues.hasChildren === 'Yes' && <>
              <label className="field">Number of children<input type="number" min={1} max={10} style={fieldStyle} value={profileValues.childrenCount} onChange={event => updateProfileValue('childrenCount', event.target.value)} /></label>
              <label className="field">Living arrangement<input maxLength={100} style={fieldStyle} value={profileValues.childrenLivingArrangement} onChange={event => updateProfileValue('childrenLivingArrangement', event.target.value)} /></label>
            </>}
            <div className="field-guidance field-wide"><strong>Share carefully</strong><p>Do not enter children’s names, schools, identity numbers, or legal documents.</p></div>
          </div>}

          {step === 2 && <div className="field-grid">
            <label className="field">Preferred minimum age<input type="number" min={18} max={99} style={fieldStyle} value={preferenceValues.minAge} onChange={event => updatePreferenceValue('minAge', event.target.value)} /></label>
            <label className="field">Preferred maximum age<input type="number" min={18} max={99} style={fieldStyle} value={preferenceValues.maxAge} onChange={event => updatePreferenceValue('maxAge', event.target.value)} /></label>
            <label className="field field-wide">Preferred cities <small>Separate entries with commas</small><input style={fieldStyle} value={preferenceValues.preferredCities} onChange={event => updatePreferenceValue('preferredCities', event.target.value)} /></label>
            <label className="field field-wide">Marital statuses you are open to<select multiple size={6} style={fieldStyle} value={preferenceValues.acceptedMaritalStatuses} onChange={event => updatePreferenceValue('acceptedMaritalStatuses', Array.from(event.target.selectedOptions, option => option.value))}>{Object.keys(statusToApi).map(option => <option key={option}>{option}</option>)}</select><em>Use Ctrl or Command to select more than one.</em></label>
            <label className="field">Open to a partner with children?<select style={fieldStyle} value={preferenceValues.openToPartnerWithChildren} onChange={event => updatePreferenceValue('openToPartnerWithChildren', event.target.value)}><option value="">No preference</option><option>Yes</option><option>No</option></select></label>
            <label className="field">Education preferences <small>Separate entries with commas</small><input style={fieldStyle} value={preferenceValues.educationPreferences} onChange={event => updatePreferenceValue('educationPreferences', event.target.value)} /></label>
            <label className="field">Language preferences <small>Separate entries with commas</small><input style={fieldStyle} value={preferenceValues.languagePreferences} onChange={event => updatePreferenceValue('languagePreferences', event.target.value)} /></label>
          </div>}

          {step === 3 && <div className="field-guidance">
            <strong>Profile visibility: {profileVisible ? 'Visible' : 'Hidden'}</strong>
            <p>{profileVisible ? 'Eligible members can discover the profile fields you chose to share.' : 'Your profile is private and will not appear in member discovery.'} Email, phone, date of birth, and partner preferences are not included in public discovery results.</p>
            {!profileExists && <p>Save your required profile details before changing visibility.</p>}
            <button type="button" className="button" disabled={busy || !profileExists} onClick={() => void changeVisibility(!profileVisible)}>{profileVisible ? 'Hide my profile' : 'Publish my profile'}</button>
          </div>}

          {(error || message) && <p role={error ? 'alert' : 'status'} style={{ color: error ? '#a22' : '#356647', lineHeight: 1.6 }}>{error || message}</p>}
          <div className="form-actions">
            <button type="button" className="outline-button" disabled={busy || step === 0} onClick={() => setStep(value => value - 1)}>Back</button>
            {(step === 0 || step === 1) && <button type="button" className="outline-button" disabled={busy} onClick={() => void saveProfile()}>{busy ? 'Saving…' : profileExists ? 'Save profile' : 'Save privately'}</button>}
            {step === 2 && <button type="button" className="outline-button" disabled={busy} onClick={() => void savePreferences()}>{busy ? 'Saving…' : 'Save preferences'}</button>}
            <button type="button" className="button" disabled={busy || step === sectionTitles.length - 1} onClick={() => setStep(value => Math.min(value + 1, sectionTitles.length - 1))}>Continue <span>→</span></button>
          </div>
        </div>
        <p className="form-footnote">Only details supported by the API are collected. Do not enter Aadhaar numbers, passwords, or upload legal documents here.</p>
      </section>
    </div>
  </main>;
}
