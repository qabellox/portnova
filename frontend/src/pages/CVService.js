import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, BilingualLine, GlassCard, LoaderButton, PremiumButton, ProgressBar, SectionHeading, Timeline } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';
import CVBuilder from '../components/CVBuilder/CVBuilder';

const statusStepKeys = [
    { key: 'pending', titleKey: 'cvStepPending', descKey: 'cvStepPendingDesc' },
    { key: 'assigned', titleKey: 'cvStepAssigned', descKey: 'cvStepAssignedDesc' },
    { key: 'completed', titleKey: 'cvStepCompleted', descKey: 'cvStepCompletedDesc' },
    { key: 'delivered', titleKey: 'cvStepDelivered', descKey: 'cvStepDeliveredDesc' },
];

const CVService = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const role = user?.user_metadata?.role || 'youth';
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [requests, setRequests] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const statusSteps = useMemo(
        () =>
            statusStepKeys.map((step) => ({
                title: t(step.titleKey),
                description: t(step.descKey),
            })),
        [t]
    );

    const currentStep = useMemo(() => {
        if (!requests.length) {
            return 0;
        }

        const latest = requests[0]?.status || 'pending';
        return statusStepKeys.findIndex((step) => step.key === latest);
    }, [requests]);

    useEffect(() => {
        if (!isUploading) {
            setUploadProgress(0);
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setUploadProgress((current) => Math.min(current + 7, 92));
        }, 120);

        return () => window.clearInterval(intervalId);
    }, [isUploading]);

    const loadRequests = async () => {
        if (!user) return;

        if (role === 'expert') {
            const { data } = await supabase
                .from('cv_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            setPendingRequests(data || []);
        } else {
            const { data } = await supabase
                .from('cv_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            setRequests(data || []);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [role, user]);

    const handleUpload = async (event) => {
        event.preventDefault();
        setMessage('');

        if (!user || !file) {
            setMessage(t('cvNeedFile'));
            return;
        }

        setIsUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `${user.id}/${Date.now()}_${safeName}.${ext}`;

            const { error: storageError } = await supabase.storage.from('cvs').upload(fileName, file, {
                contentType: file.type,
                upsert: false,
            });
            if (storageError) throw storageError;

            const { error: insertError } = await supabase.from('cv_requests').insert({
                user_id: user.id,
                status: 'pending',
                notes: notes || null,
                cv_path: fileName,
                request_type: 'upload',
                requester_name: user.user_metadata?.fullName || user.email || 'User',
            });
            if (insertError) throw insertError;

            setUploadProgress(100);
            setMessage(t('cvUploaded'));
            setFile(null);
            setNotes('');
        } catch (err) {
            setMessage(err.message || t('uploadFailed'));
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 700);
            await loadRequests();
        }
    };

    const claimRequest = async (cvId) => {
        if (!user) return;
        await supabase
            .from('cv_requests')
            .update({
                status: 'assigned',
                assigned_expert_id: user.id,
                assigned_expert_name: user.user_metadata?.fullName || user.email || 'Expert',
                assigned_at: new Date().toISOString(),
            })
            .eq('id', cvId);

        await loadRequests();
    };

    const handleFileDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);

        const droppedFile = event.dataTransfer.files?.[0];

        if (droppedFile) {
            setFile(droppedFile);
        }
    };

    return (
        <div className="page-shell page-shell__grid">
            <section className="hero hero--local">
                <div>
                    <div className="hero__kicker">
                        <span className="nautical-tile" aria-hidden="true">🧭</span> {t('cvKicker')}
                    </div>
                    <h1 className="hero__title">
                        {t('cvTitle')}
                    </h1>
                    <BilingualLine
                        as="p"
                        className="hero__lead"
                        ar="سيرتك الذاتية تُصاغ وتُنقّح بعناية احترافية وبأسلوب أنيق ومتقن."
                        en="Your CV is tailored and curated professionally and in a pristine manner."
                    />
                    <div className="status-strip">
                        <Badge tone="success">{t('expertReview')}</Badge>
                        <Badge tone="gold">✨ {t('aiAgent')}</Badge>
                    </div>
                </div>
            </section>

            {/* AI CV Builder Agent - the primary experience */}
            <CVBuilder />

            {/* Human expert review - the complementary service */}
            <div className="cv-expert-divider">
                <SectionHeading
                    kicker={t('expertServiceKicker')}
                    title={t('expertServiceTitle')}
                    subtitle={t('expertServiceSubtitle')}
                />
            </div>

            <div className="split-grid">
                <GlassCard className="auth-card">
                    <SectionHeading
                        kicker={t('uploadKicker')}
                        title={t('uploadTitle')}
                        subtitle={t('uploadSubtitle')}
                    />
                    <form onSubmit={handleUpload}>
                        <div
                            className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                        >
                            <div className="dropzone__inner">
                                <div className="icon-circle" style={{ margin: '0 auto 0.85rem' }}>CV</div>
                                <h3 className="card-title">{t('dragTitle')}</h3>
                                <BilingualLine ar="PDF وDOC وDOCX مدعومة. اختر ملفًا أو أسقطه هنا." en="PDF, DOC, and DOCX are supported. Choose a file or drop it here." className="card-copy" />
                                <input
                                    id="cv-file-input"
                                    style={{ display: 'none' }}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(event) => setFile(event.target.files[0])}
                                />
                                <label
                                    className="premium-button premium-button--gold"
                                    htmlFor="cv-file-input"
                                    style={{ marginTop: '1rem', cursor: 'pointer' }}
                                >
                                    {t('cvChooseFile')}
                                </label>
                                {file ? <p className="muted" style={{ marginBottom: 0 }}>{file.name}</p> : null}
                            </div>
                        </div>

                        <div className="field-group">
                            <textarea
                                className="textarea"
                                placeholder={t('notesPlaceholder')}
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                            />
                            <div className="inline-actions">
                                <LoaderButton type="submit" variant="gold" loading={isUploading}>
                                    {isUploading ? t('uploading') : t('uploadButton')}
                                </LoaderButton>
                                <PremiumButton type="button" variant="ghost" onClick={() => setFile(null)}>
                                    {t('reset')}
                                </PremiumButton>
                            </div>
                        </div>
                    </form>
                    {isUploading ? (
                        <div style={{ marginTop: '1rem' }}>
                            <div className="upload-meter__label">
                                <span>{t('uploadProgress')}</span>
                                <strong>{uploadProgress}%</strong>
                            </div>
                            <ProgressBar value={uploadProgress} />
                        </div>
                    ) : null}
                    {message ? <p className="muted" style={{ marginTop: '1rem' }}>{message}</p> : null}
                </GlassCard>

                <GlassCard className="auth-card">
                    <SectionHeading kicker={t('workflowKicker')} title={t('workflowTitle')} subtitle={t('workflowSubtitle')} />
                    <Timeline steps={statusSteps} currentIndex={currentStep >= 0 ? currentStep : 0} nowLabel={t('cvStepNow')} />

                    <div className="section-block">
                        <SectionHeading kicker={t('pricingKicker')} title={t('pricingTitle')} subtitle={t('pricingSubtitle')}
                        />
                        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <GlassCard>
                                <div className="stat-card__label">{t('standard')}</div>
                                <div className="stat-card__value">$10</div>
                                <div className="stat-card__note">{t('standardNote')}</div>
                            </GlassCard>
                            <GlassCard>
                                <div className="stat-card__label">{t('premium')}</div>
                                <div className="stat-card__value">$24</div>
                                <div className="stat-card__note">{t('premiumNote')}</div>
                            </GlassCard>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <GlassCard>
                <SectionHeading kicker={t('requestsKicker')} title={t('requestsTitle')} subtitle={t('requestsSubtitle')}
                />
                <div className="activity-feed">
                    {(requests || []).length ? (
                        requests.map((request) => (
                            <div key={request.id} className="activity-item">
                                <div className="activity-dot" />
                                <div style={{ flex: 1 }}>
                                    <div className="card-head">
                                        <div>
                                            <strong>{t('requestId')} #{request.id}</strong>
                                            <div className="muted">{request.cv_url || t('noFileYet')}</div>
                                        </div>
                                        <Badge tone="blue">{request.status}</Badge>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">{t('noRequests')}</div>
                    )}
                </div>
            </GlassCard>

            {role === 'expert' ? (
                <GlassCard>
                    <SectionHeading kicker={t('expertKicker')} title={t('expertTitle')} subtitle={t('expertSubtitle')} />
                    <div className="card-grid card-grid--wide">
                        {(pendingRequests || []).length ? (
                            pendingRequests.map((request) => (
                                <GlassCard key={request.id} interactive>
                                    <div className="card-head">
                                        <div>
                                            <div className="badge badge--gold">{t('requestId')} #{request.id}</div>
                                            <h3 className="card-title" style={{ marginTop: '0.75rem' }}>{t('awaitingReview')}</h3>
                                        </div>
                                        <Badge tone="blue">{request.status}</Badge>
                                    </div>
                                    <p className="card-copy">{request.notes || t('noNotes')}</p>
                                    <PremiumButton variant="gold" onClick={() => claimRequest(request.id)}>
                                        {t('claim')}
                                    </PremiumButton>
                                </GlassCard>
                            ))
                        ) : (
                            <div className="empty-state">{t('noPending')}</div>
                        )}
                    </div>
                </GlassCard>
            ) : null}
        </div>
    );
};

export default CVService;