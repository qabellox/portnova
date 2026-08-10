import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { submitApplication } from '../services/applications';
import { Badge, GlassCard, PremiumButton } from './PremiumUI';

/* Modal for applying to a job: collects a CV plus rich profile data (exactly
   the structured youth data the platform wants). Styled with the same premium
   glass theme; pure DOM — no 3D — so it opens instantly and never stutters. */
const JobApplicationModal = ({ job, onClose }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const cvInputRef = useRef(null);

    const [fullName, setFullName] = useState(user?.user_metadata?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [status, setStatus] = useState('looking');
    const [education, setEducation] = useState('bachelor');
    const [experienceYears, setExperienceYears] = useState('');
    const [skills, setSkills] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [expectedSalary, setExpectedSalary] = useState('');
    const [availability, setAvailability] = useState('immediate');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [referral, setReferral] = useState('social');
    const [cvName, setCvName] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [stored, setStored] = useState('');

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const onPickCv = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setCvFile(file);
            setCvName(file.name);
        }
    };

    const fieldLabel = (text) => (
        <label className="filter-label" style={{ textTransform: 'none' }}>{text}</label>
    );

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        if (!cvName) {
            setError(t('appCvRequired'));
            return;
        }
        if (!phone.trim()) {
            setError(t('appPhoneRequired'));
            return;
        }
        setSubmitting(true);
        const result = await submitApplication({
            jobId: job.id,
            userId: user?.id,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            city: city.trim(),
            status,
            education,
            experienceYears: experienceYears.trim(),
            skills: skills.trim(),
            coverLetter: coverLetter.trim(),
            expectedSalary: expectedSalary.trim(),
            availability,
            portfolioUrl: portfolioUrl.trim(),
            linkedin: linkedin.trim(),
            referral,
            cvFile,
            cvName,
        });
        setSubmitting(false);
        if (result?.ok) {
            setStored(result.stored || '');
            setDone(true);
        } else {
            setError(t('appSubmitError'));
        }
    };

    const header = (
        <div className="app-modal__head">
            <div className="course-cover" aria-hidden="true">{job.emoji}</div>
            <div>
                <Badge tone={job.tone}>{job.salary}</Badge>
                <h3 className="card-title">{job.role}</h3>
                <span className="card-copy">{job.company} · {job.location}</span>
            </div>
        </div>
    );

    return (
        <div
            className="app-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={job.role}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <GlassCard className="app-modal">
                <button type="button" className="app-modal__close" onClick={onClose} aria-label="Close">×</button>
                {header}

                {!user ? (
                    <div className="app-modal__body app-signin">
                        <strong>{t('appSignIn')}</strong>
                        <p className="muted">{t('appSignInDesc')}</p>
                        <PremiumButton to="/login" variant="gold">{t('homeSignIn')}</PremiumButton>
                    </div>
                ) : done ? (
                    <div className="app-modal__body app-success">
                        <div className="app-success__mark" aria-hidden="true">✓</div>
                        <strong>{t('appSuccessTitle')}</strong>
                        <p className="muted">{t('appSuccessDesc')}</p>
                        {stored === 'local' ? <p className="muted" style={{ color: '#fcd34d', fontSize: '0.8rem' }}>{t('appLocalNote')}</p> : null}
                        <PremiumButton variant="gold" onClick={onClose}>{t('appClose')}</PremiumButton>
                    </div>
                ) : (
                    <div className="app-modal__body">
                        {error ? <p className="muted" style={{ color: '#fecaca' }}>{error}</p> : null}
                        <form onSubmit={handleSubmit}>
                            <div className="app-cv">
                                <span className="filter-label">{t('appCvLabel')}</span>
                                <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={onPickCv} />
                                {cvName ? (
                                    <div className="cv-card__attached">
                                        <span className="cv-card__file-icon" aria-hidden="true">📄</span>
                                        <div>
                                            <strong>{cvName}</strong>
                                            <span className="muted">{t('cvAttached')}</span>
                                        </div>
                                        <PremiumButton
                                            variant="ghost"
                                            onClick={() => {
                                                setCvFile(null);
                                                setCvName('');
                                                if (cvInputRef.current) cvInputRef.current.value = '';
                                            }}
                                        >
                                            {t('cvRemove')}
                                        </PremiumButton>
                                    </div>
                                ) : (
                                    <div
                                        className="app-cv__empty"
                                        role="button"
                                        tabIndex="0"
                                        onClick={() => cvInputRef.current?.click()}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') cvInputRef.current?.click();
                                        }}
                                    >
                                        <span className="app-cv__icon" aria-hidden="true">📄</span>
                                        <span className="muted">{t('appCvPick')}</span>
                                        <span className="muted" style={{ fontSize: '0.72rem' }}>{t('cvFileHint')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="app-form">
                                <div>
                                    {fieldLabel(t('appFullName'))}
                                    <input className="field" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                </div>
                                <div>
                                    {fieldLabel(t('appEmail'))}
                                    <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div>
                                    {fieldLabel(t('appPhone'))}
                                    <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                                </div>
                                <div>
                                    {fieldLabel(t('appCity'))}
                                    <input className="field" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appStatus'))}
                                    <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                                        {[['looking', 'optLooking'], ['student', 'optStudent'], ['graduate', 'optGraduate'], ['employed', 'optEmployed']].map(([v, k]) => (
                                            <option key={v} value={v}>{t(k)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    {fieldLabel(t('appEducation'))}
                                    <select className="select" value={education} onChange={(e) => setEducation(e.target.value)}>
                                        {[['highschool', 'eduHigh'], ['diploma', 'eduDiploma'], ['bachelor', 'eduBachelor'], ['master', 'eduMaster'], ['other', 'eduOther']].map(([v, k]) => (
                                            <option key={v} value={v}>{t(k)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    {fieldLabel(t('appExperience'))}
                                    <input className="field" type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appAvailability'))}
                                    <select className="select" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                                        {[['immediate', 'availImmediate'], ['2weeks', 'avail2weeks'], ['1month', 'avail1month']].map(([v, k]) => (
                                            <option key={v} value={v}>{t(k)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="app-form__wide">
                                    {fieldLabel(t('appSkills'))}
                                    <input className="field" type="text" placeholder={t('appSkillsPlaceholder')} value={skills} onChange={(e) => setSkills(e.target.value)} />
                                </div>
                                <div className="app-form__wide">
                                    {fieldLabel(t('appCover'))}
                                    <textarea className="field" rows="3" placeholder={t('appCoverPlaceholder')} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appSalary'))}
                                    <input className="field" type="text" placeholder="$500/mo" value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appPortfolio'))}
                                    <input className="field" type="url" placeholder="github.com/you" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appLinkedin'))}
                                    <input className="field" type="url" placeholder="linkedin.com/in/you" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                                </div>
                                <div>
                                    {fieldLabel(t('appReferral'))}
                                    <select className="select" value={referral} onChange={(e) => setReferral(e.target.value)}>
                                        {[['social', 'refSocial'], ['friend', 'refFriend'], ['school', 'refSchool'], ['other', 'refOther']].map(([v, k]) => (
                                            <option key={v} value={v}>{t(k)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <PremiumButton type="submit" variant="gold" disabled={submitting} style={{ marginTop: '1rem', width: '100%' }}>
                                {submitting ? t('appSubmitting') : t('appSubmit')}
                            </PremiumButton>
                        </form>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default JobApplicationModal;
