import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, BilingualLine, GlassCard, LoaderButton, PremiumButton, ProgressBar, SectionHeading, Timeline } from '../components/PremiumUI';

const statusSteps = [
    { title: 'pending', description: 'تم الرفع وينتظر اهتمام الخبير.' },
    { title: 'assigned', description: 'تم إسناد الطلب إلى خبير.' },
    { title: 'completed', description: 'السيرة المنسقة جاهزة للتسليم.' },
    { title: 'delivered', description: 'تم تسليم النسخة النهائية.' },
];

const CVService = () => {
    const { user } = useAuth();
    const role = user?.user_metadata?.role || 'youth';
    const [sessionToken, setSessionToken] = useState('');
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [requests, setRequests] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const currentStep = useMemo(() => {
        if (!requests.length) {
            return 0;
        }

        const latest = requests[0]?.status || 'pending';
        return statusSteps.findIndex((step) => step.title === latest);
    }, [requests]);

    useEffect(() => {
        let mounted = true;

        const loadToken = async () => {
            const { data } = await supabase.auth.getSession();
            if (mounted) {
                setSessionToken(data.session?.access_token || '');
            }
        };

        loadToken();

        return () => {
            mounted = false;
        };
    }, []);

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
        const endpoint = role === 'expert' ? '/api/cv/pending' : '/api/cv/my-requests';

        if (!sessionToken) return;

        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${sessionToken}`,
            },
        });

        const payload = await response.json();

        if (payload.success) {
            if (role === 'expert') {
                setPendingRequests(payload.data || []);
            } else {
                setRequests(payload.data || []);
            }
        }
    };

    useEffect(() => {
        loadRequests();
    }, [role, sessionToken]);

    const handleUpload = async (event) => {
        event.preventDefault();
        setMessage('');

        if (!sessionToken || !file) {
            setMessage('Please choose a CV file first.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('cvFile', file);
        formData.append('notes', notes);

        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/cv/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${sessionToken}`,
            },
            body: formData,
        });

        const payload = await response.json();
        setUploadProgress(100);
        setMessage(payload.success ? 'CV uploaded successfully.' : payload.error || 'Upload failed.');
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 700);
        await loadRequests();
    };

    const claimRequest = async (cvId) => {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/cv/${cvId}/assign`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessionToken}` },
        });

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
                <div className="hero__grid">
                    <div>
                        <div className="hero__kicker">خدمة السيرة الذاتية / CV Service</div>
                        <h1 className="hero__title">
                            صياغة وتسليم السيرة الذاتية مع <span className="gradient-text">إحساس محلي راقٍ</span>.
                        </h1>
                        <BilingualLine
                            as="p"
                            className="hero__lead"
                            ar="منطقة رفع بالسحب والإفلات، وتتبع تقدّم متحرك، وخط زمني واضح يجعل الخدمة موثوقة وسهلة."
                            en="A drag-drop upload zone, animated progress tracking, and a status timeline make the service feel trusted and premium."
                        />
                        <div className="status-strip">
                            <Badge tone="gold">جاهز للدفع / Payments</Badge>
                            <Badge tone="blue">سحب وإفلات / Drag & drop</Badge>
                            <Badge tone="success">مراجعة خبراء / Expert review</Badge>
                        </div>
                    </div>

                    <GlassCard className="hero__orbital hero__orbital--primary">
                        <div className="upload-meter__label">
                            <span>زخم الرفع / Upload momentum</span>
                            <strong>{uploadProgress}%</strong>
                        </div>
                        <ProgressBar value={uploadProgress} />
                        <div className="timeline-card" style={{ marginTop: '1rem', padding: '1rem' }}>
                            <Timeline steps={statusSteps} currentIndex={currentStep >= 0 ? currentStep : 0} />
                        </div>
                    </GlassCard>
                </div>
            </section>

            <div className="split-grid">
                <GlassCard className="auth-card">
                    <SectionHeading
                        kicker="الرفع / Upload"
                        title="اسقط سيرتك الذاتية هنا"
                        subtitle="منطقة الرفع تضيء عند المرور، وتتبع التقدم، وتحافظ على تجربة واثقة وأنيقة."
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
                                <h3 className="card-title">اسحب الملف وأفلته</h3>
                                <BilingualLine ar="PDF وDOC وDOCX مدعومة. اختر ملفًا أو أسقطه في المساحة المضيئة." en="PDF, DOC, and DOCX supported. Choose a file or drop it into the luminous area." className="card-copy" />
                                <input
                                    className="field"
                                    style={{ marginTop: '1rem' }}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(event) => setFile(event.target.files[0])}
                                />
                                {file ? <p className="muted" style={{ marginBottom: 0 }}>{file.name}</p> : null}
                            </div>
                        </div>

                        <div className="field-group">
                            <textarea
                                className="textarea"
                                placeholder="ملاحظات لفريق السيرة الذاتية"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                            />
                            <div className="inline-actions">
                                <LoaderButton type="submit" variant="gold" loading={isUploading}>
                                    {isUploading ? 'جارٍ الرفع...' : 'رفع السيرة الذاتية / Upload CV'}
                                </LoaderButton>
                                <PremiumButton type="button" variant="ghost" onClick={() => setFile(null)}>
                                    إعادة ضبط
                                </PremiumButton>
                            </div>
                        </div>
                    </form>
                    {message ? <p className="muted" style={{ marginTop: '1rem' }}>{message}</p> : null}
                </GlassCard>

                <GlassCard className="auth-card">
                    <SectionHeading kicker="المسار / Workflow" title="الخط الزمني للحالة" subtitle="كل خطوة تظل واضحة حتى يشعر المستخدم أن العملية تتحرك للأمام." />
                    <Timeline steps={statusSteps} currentIndex={currentStep >= 0 ? currentStep : 0} />

                    <div className="section-block">
                        <SectionHeading kicker="الأسعار / Pricing" title="أسعار مؤقتة بسيطة" subtitle="يمكن ربط الدفع هنا لاحقًا دون تغيير لغة التصميم."
                        />
                        <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <GlassCard>
                                <div className="stat-card__label">عادي / Standard</div>
                                <div className="stat-card__value">$10</div>
                                <div className="stat-card__note">مراجعة سريعة مع تمريرة خبير واحدة.</div>
                            </GlassCard>
                            <GlassCard>
                                <div className="stat-card__label">مميز / Premium</div>
                                <div className="stat-card__value">$24</div>
                                <div className="stat-card__note">معالجة أولوية مع لمسة تسليم نهائية.</div>
                            </GlassCard>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <GlassCard>
                <SectionHeading kicker="الطلبات / Requests" title="طلباتك" subtitle="تابع كل رفع وإسناد وتسليم في قائمة واحدة واضحة."
                />
                <div className="activity-feed">
                    {(requests || []).length ? (
                        requests.map((request) => (
                            <div key={request.id} className="activity-item">
                                <div className="activity-dot" />
                                <div style={{ flex: 1 }}>
                                    <div className="card-head">
                                        <div>
                                            <strong>Request #{request.id}</strong>
                                            <div className="muted">{request.cv_url || 'لا يوجد ملف بعد'}</div>
                                        </div>
                                        <Badge tone="blue">{request.status}</Badge>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">لا توجد طلبات سيرة ذاتية بعد. ارفع واحدة لبدء المسار.</div>
                    )}
                </div>
            </GlassCard>

            {role === 'expert' ? (
                <GlassCard>
                    <SectionHeading kicker="منظور الخبير / Expert view" title="الطلبات المعلّقة" subtitle="يمكن للخبراء حجز الطلبات بخطوة مضيئة واحدة." />
                    <div className="card-grid card-grid--wide">
                        {(pendingRequests || []).length ? (
                            pendingRequests.map((request) => (
                                <GlassCard key={request.id} interactive>
                                    <div className="card-head">
                                        <div>
                                            <div className="badge badge--gold">Request #{request.id}</div>
                                            <h3 className="card-title" style={{ marginTop: '0.75rem' }}>بانتظار المراجعة</h3>
                                        </div>
                                        <Badge tone="blue">{request.status}</Badge>
                                    </div>
                                    <p className="card-copy">{request.notes || 'لا توجد ملاحظات'}</p>
                                    <PremiumButton variant="gold" onClick={() => claimRequest(request.id)}>
                                        استلم الطلب / Claim
                                    </PremiumButton>
                                </GlassCard>
                            ))
                        ) : (
                            <div className="empty-state">لا توجد طلبات معلقة حاليًا.</div>
                        )}
                    </div>
                </GlassCard>
            ) : null}
        </div>
    );
};

export default CVService;