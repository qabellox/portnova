import React from 'react';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading } from '../components/PremiumUI';

const courses = [
    { title: 'Product Design Sprint', provider: 'PortNova Academy', price: 'Free', progress: 72, level: 'Beginner', tone: 'blue' },
    { title: 'Startup Operations', provider: 'Harbor School', price: '$49', progress: 44, level: 'Intermediate', tone: 'gold' },
    { title: 'Career Readiness', provider: 'FutureBridge', price: 'Free', progress: 88, level: 'Foundation', tone: 'success' },
    { title: 'Data Storytelling', provider: 'Nova Labs', price: '$79', progress: 61, level: 'Advanced', tone: 'blue' },
];

const Courses = () => (
    <div className="page-shell">
        <SectionHeading
            kicker="التعلم / Learning"
            title="دورات بروح شبابية ولمسة محلية"
            subtitle="مؤشرات تقدّم متحركة ولمسات سعرية مرتبة تجعل التعلم أقرب وأسهل للناس هنا."
        />

        <div className="card-grid card-grid--compact">
            {courses.map((course) => (
                <GlassCard key={course.title} interactive>
                    <div className="card-head">
                        <div>
                            <Badge tone={course.tone}>{course.price}</Badge>
                            <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                {course.title}
                            </h3>
                            <BilingualLine ar={course.provider} en={course.provider} className="card-copy" />
                        </div>
                        <div className="company-mark">{course.title.slice(0, 2)}</div>
                    </div>

                    <div className="card-meta">
                        <Badge tone="blue">{course.level}</Badge>
                        <Badge tone="gold">تفاعلية / Interactive</Badge>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <div className="upload-meter__label">
                            <span>الإنجاز / Completion</span>
                            <strong>{course.progress}%</strong>
                        </div>
                        <ProgressBar value={course.progress} />
                    </div>

                    <div className="inline-actions" style={{ marginTop: '1rem' }}>
                        <PremiumButton variant="primary">سجّل / Enroll</PremiumButton>
                        <PremiumButton variant="ghost">معاينة / Preview</PremiumButton>
                    </div>
                </GlassCard>
            ))}
        </div>
    </div>
);

export default Courses;