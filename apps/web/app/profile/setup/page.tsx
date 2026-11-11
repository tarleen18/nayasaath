'use client';
import { useMemo, useState } from 'react';

type Field = { name: string; label: string; type?: 'text'|'select'|'textarea'|'number'|'date'; placeholder?: string; options?: string[]; hint?: string; optional?: boolean };
type Section = { title: string; subtitle: string; fields: Field[] };
const requiredFields = ['displayName','gender','dateOfBirth','city','maritalStatus'];
const sections: Section[] = [
 { title:'Basic details', subtitle:'Start with the details that help people understand who you are.', fields:[
  {name:'displayName',label:'Name you want members to see',placeholder:'Your preferred name'},
  {name:'gender',label:'Gender',type:'select',options:['Woman','Man','Non-binary','Prefer to self-describe','Prefer not to say']},
  {name:'dateOfBirth',label:'Date of birth',type:'date',hint:'You must be at least 18 to use NayaSaath.'},
  {name:'height',label:'Height',type:'select',options:['Below 5 ft','5 ft – 5 ft 3 in','5 ft 4 in – 5 ft 6 in','5 ft 7 in – 5 ft 9 in','5 ft 10 in – 6 ft','Above 6 ft','Prefer not to say']},
  {name:'city',label:'Current city',placeholder:'e.g. Ludhiana'}, {name:'state',label:'State',type:'select',options:['Punjab','Chandigarh','Delhi','Haryana','Himachal Pradesh','Rajasthan','Uttar Pradesh','Maharashtra','Gujarat','Karnataka','Tamil Nadu','West Bengal','Other']},
  {name:'motherTongue',label:'Mother tongue',type:'select',options:['Punjabi','Hindi','English','Urdu','Bengali','Gujarati','Marathi','Tamil','Telugu','Kannada','Malayalam','Odia','Assamese','Other','Prefer not to say']},
  {name:'languages',label:'Other languages you speak',placeholder:'e.g. Hindi, English, Punjabi'}]},
 { title:'Religion & community', subtitle:'These details are optional. You can keep each one private or choose not to answer.', fields:[
  {name:'religion',label:'Religion',type:'select',options:['Hindu','Sikh','Muslim','Christian','Buddhist','Jain','Parsi','Jewish','Tribal / Indigenous faith','Spiritual / Other','No religion','Prefer not to say']},
  {name:'religionOther',label:'If you selected “Other”, you may specify',placeholder:'Optional'},
  {name:'religionDenomination',label:'Denomination / sect (if relevant)',placeholder:'Optional'},
  {name:'socialCategory',label:'Social / reservation category (optional)',type:'select',options:['General','OBC','SC','ST','Other','Prefer not to say']},
  {name:'community',label:'Community / cultural identity',placeholder:'e.g. Punjabi, Kashmiri, Tamil'},
  {name:'caste',label:'Caste / biradari',placeholder:'Enter only if you wish to share'},
  {name:'subCaste',label:'Sub-caste / gotra (if relevant)',placeholder:'Optional'},
  {name:'horoscopeMatching',label:'Horoscope matching',type:'select',options:['Important to me','Open to it','Not important','Prefer not to say']},
  {name:'manglikStatus',label:'Manglik status (optional)',type:'select',options:['Manglik','Non-Manglik','Anshik Manglik','Do not know','Prefer not to say']},
  {name:'backgroundVisibility',label:'Who can see religion and community details?',type:'select',options:['PRIVATE — only me','CONNECTIONS — accepted connections','PUBLIC — visible on my profile'] ,hint:'You can change this later.'}]},
 { title:'Education & career', subtitle:'Share your learning, work and aspirations in the amount of detail you are comfortable with.', fields:[
  {name:'education',label:'Highest education',type:'select',options:['High school','Diploma','Bachelor’s degree','Master’s degree','Doctorate / PhD','Professional qualification','Other','Prefer not to say']},
  {name:'educationDetails',label:'Course, college or specialisation',placeholder:'e.g. B.Tech in Computer Science'},
  {name:'profession',label:'Profession / role',placeholder:'e.g. Software engineer, teacher, entrepreneur'},
  {name:'employmentType',label:'Employment type',type:'select',options:['Private sector','Government','Self-employed / Business','Freelancer','Family business','Student','Not currently working','Other','Prefer not to say']},
  {name:'workLocation',label:'Work location',placeholder:'City or remote'},
  {name:'annualIncomeRange',label:'Annual income (optional)',type:'select',options:['Prefer not to disclose','Below ₹3 lakh','₹3–5 lakh','₹5–8 lakh','₹8–12 lakh','₹12–20 lakh','₹20–35 lakh','₹35 lakh–₹50 lakh','Above ₹50 lakh']}]},
 { title:'Family background', subtitle:'Family information is optional. Never share children’s names, schools or identifying details.', fields:[
  {name:'familyType',label:'Family type',type:'select',options:['Nuclear','Joint','Extended','Prefer not to say']},
  {name:'familyValues',label:'Family values',type:'select',options:['Traditional','Moderate','Liberal','A blend / depends','Prefer not to say']},
  {name:'familyLocation',label:'Family based in',placeholder:'City / state'},
  {name:'fatherOccupation',label:'Father’s occupation (optional)',placeholder:'Optional'},
  {name:'motherOccupation',label:'Mother’s occupation (optional)',placeholder:'Optional'},
  {name:'siblingsCount',label:'Number of siblings',type:'select',options:['0','1','2','3','4 or more','Prefer not to say']}]},
 { title:'Lifestyle & interests', subtitle:'A few everyday details can help start more natural conversations.', fields:[
  {name:'diet',label:'Diet',type:'select',options:['Vegetarian','Eggetarian','Non-vegetarian','Vegan','Jain','Other','Prefer not to say']},
  {name:'smoking',label:'Smoking',type:'select',options:['No','Occasionally','Yes','Prefer not to say']},
  {name:'drinking',label:'Alcohol',type:'select',options:['No','Socially','Yes','Prefer not to say']},
  {name:'interests',label:'Interests & hobbies',type:'textarea',placeholder:'e.g. travelling, music, fitness, cooking, reading'},
  {name:'bio',label:'A little about you',type:'textarea',placeholder:'What matters to you? What does a happy, meaningful life look like? (Up to 1,200 characters)'}]},
 { title:'Marriage & life journey', subtitle:'Every journey is different. Choose the description that accurately reflects your legal and personal circumstances.', fields:[
  {name:'maritalStatus',label:'Current marital status',type:'select',options:['Never married','Divorced','Widowed','Legally separated','Marriage annulled by court','Other','Prefer to discuss privately']},
  {name:'maritalStatusDetails',label:'Anything you would like a potential partner to understand? (optional)',type:'textarea',placeholder:'Share only what feels comfortable. Avoid uploading legal documents here.'},
  {name:'marriageYear',label:'Year of previous marriage (if relevant)',type:'number',placeholder:'YYYY'},
  {name:'hasChildren',label:'Do you have children?',type:'select',options:['No','Yes','Prefer to discuss privately']},
  {name:'childrenCount',label:'Number of children (if you wish to share)',type:'select',options:['1','2','3','4 or more','Prefer not to say']},
  {name:'childrenLivingArrangement',label:'Living arrangement (optional)',type:'select',options:['Live with me','Live with their other parent','Shared arrangement','Other / prefer to discuss privately']}]},
 { title:'Partner preferences', subtitle:'Preferences help with discovery. Keep them realistic, respectful and flexible.', fields:[
  {name:'preferredAge',label:'Preferred age range',placeholder:'e.g. 26–34'},
  {name:'preferredCities',label:'Preferred cities / regions',placeholder:'e.g. Punjab, Chandigarh, Delhi NCR'},
  {name:'preferredMaritalStatus',label:'Marital statuses you are open to',type:'select',options:['Never married','Divorced','Widowed','Legally separated','Annulled','Open to different journeys']},
  {name:'preferredReligion',label:'Religion preference (optional)',type:'select',options:['No preference','Hindu','Sikh','Muslim','Christian','Buddhist','Jain','Other / open to discussion']},
  {name:'preferredCommunity',label:'Community preference (optional)',placeholder:'Enter a preference only if it matters to you'},
  {name:'preferredCaste',label:'Caste / biradari preference (optional)',placeholder:'Only if relevant to your choice'},
  {name:'partnerChildren',label:'Open to a partner who has children?',type:'select',options:['Yes','No','Open to discussion','Prefer not to say']},
  {name:'relocation',label:'Open to relocating?',type:'select',options:['Yes','No','Maybe, depending on circumstances']},
  {name:'partnerValues',label:'What matters most in a life partner?',type:'textarea',placeholder:'e.g. kindness, emotional maturity, shared values, communication'}]},
 { title:'Privacy & verification', subtitle:'You stay in control. Verification labels describe checks completed, not a guarantee about a person.', fields:[
  {name:'photoVisibility',label:'Who can see your photos?',type:'select',options:['Only after I accept a connection','Registered members','Everyone on NayaSaath']},
  {name:'profileVisibility',label:'Profile discovery',type:'select',options:['Visible to members I match with','Visible to all registered members','Keep my profile hidden']},
  {name:'contactVisibility',label:'Phone number and email',type:'select',options:['Always private (recommended)','Share only after I approve']},
  {name:'verificationConsent',label:'Verification',type:'select',options:['I want to review verification options later','I am ready to begin identity verification']}]}
];
export default function ProfileSetupPage(){
 const [step,setStep]=useState(0); const [values,setValues]=useState<Record<string,string>>({}); const [saved,setSaved]=useState(false);
 const current=sections[step];
 const filled=useMemo(()=>Object.values(values).filter(v=>typeof v==='string'&&v.trim().length>0).length,[values]);
 const progress=Math.round(((step+1)/sections.length)*100);
 function update(name:string,value:string){setValues(v=>({...v,[name]:value}));setSaved(false)}
 return <main className="setup-page"><header className="setup-header"><a className="brand" href="/">NayaSaath<span>.</span></a><div className="setup-header-right"><span>PROFILE SETUP</span><a href="/dashboard">Exit to dashboard</a></div></header>
  <div className="setup-layout"><aside className="setup-aside"><span className="eyebrow">YOUR INTRODUCTION</span><h1 className="serif">A little more about you.</h1><p>There is no perfect profile. Just an honest introduction, at your own pace.</p><div className="setup-progress"><div><span>YOUR PROGRESS</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div></div><nav className="step-nav">{sections.map((s,i)=><button type="button" key={s.title} onClick={()=>setStep(i)} className={i===step?'step-item selected':i<step?'step-item completed':'step-item'}><span className="step-dot">{i<step?'✓':String(i+1).padStart(2,'0')}</span><span>{s.title}</span><span className="step-chevron">›</span></button>)}</nav><div className="privacy-note"><span>♧</span><div><strong>Your information belongs to you.</strong><p>Optional fields stay optional. You can edit visibility and remove details later.</p></div></div></aside>
   <section className="setup-form-wrap"><div className="form-topline"><span>STEP {step+1} OF {sections.length}</span><span>{filled} fields filled</span></div><div className="form-card"><div className="eyebrow">{step===1?'YOUR BACKGROUND':step===5?'YOUR JOURNEY':'GETTING TO KNOW YOU'}</div><h2 className="serif">{current.title}</h2><p className="form-subtitle">{current.subtitle}</p><div className="field-grid">{current.fields.map(f=><label className={`field ${f.type==='textarea'?'field-wide':''}`} key={f.name}><span>{f.label}<small>{requiredFields.includes(f.name)?'REQUIRED':'OPTIONAL'}</small></span>{f.type==='select'?<select value={values[f.name]||''} onChange={e=>update(f.name,e.target.value)}><option value="">Choose an option</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:f.type==='textarea'?<textarea rows={4} maxLength={f.name==='bio'?1200:undefined} placeholder={f.placeholder} value={values[f.name]||''} onChange={e=>update(f.name,e.target.value)}/>:<input type={f.type==='number'?'number':f.type==='date'?'date':'text'} placeholder={f.placeholder} value={values[f.name]||''} onChange={e=>update(f.name,e.target.value)} />}{f.hint&&<em>{f.hint}</em>}</label>)}</div>
  {step===1&&<div className="field-guidance"><strong>About caste and community fields</strong><p>These are optional cultural details, not eligibility requirements. You may leave them blank, use your own wording, and control who can see them.</p></div>}
  {step===5&&<div className="field-guidance"><strong>Accuracy matters</strong><p>“Legally separated” is not the same as “divorced”. Choose the status that matches your current legal circumstances. A separate, secure review may be requested later.</p></div>}
  <div className="form-actions"><button type="button" className="outline-button" onClick={()=>step===0?window.location.assign('/dashboard'):setStep(s=>s-1)}>Back</button><button type="button" className="button" onClick={()=>{setSaved(true);if(step<sections.length-1)setStep(s=>s+1)}}>{step===sections.length-1?'Save preview':'Save & continue'} ↗</button></div>
  {saved&&<p className="saved-note">Preview updated in this session. Persistent account saving will be enabled when the profile API is connected.</p>}
  </div><p className="form-footnote">You can skip optional questions and return to them later. Please do not enter Aadhaar numbers, passwords, or upload legal documents in this profile form.</p></section>
  </div></main>;
}
