import React from 'react';
import { Badge, BilingualLine, GlassCard, PremiumButton, ProgressBar, SectionHeading } from '../components/PremiumUI';

const jobs = [
    { company: 'Nova Labs', role: 'Frontend Product Intern', salary: '$450/mo', location: 'Port Said', fit: 94, tone: 'blue' },
    { company: 'HarborX', role: 'Operations Coordinator', salary: '$700/mo', location: 'Hybrid', fit: 87, tone: 'gold' },
    { company: 'BlueWave', role: 'Community Designer', salary: '$600/mo', location: 'Remote', fit: 91, tone: 'success' },
    { company: 'Atlas Port', role: 'Business Analyst', salary: '$900/mo', location: 'Onsite', fit: 84, tone: 'blue' },
];

const Jobs = () => (
    <div className="page-shell">
        <SectionHeading
            kicker="الفرص / Opportunities"
            title="وظائف واضحة، حية، ومناسبة لشباب بورسعيد"
            subtitle="بطاقات زجاجية، وتوافق متحرك، ولمسات ذهبية تجعل سوق الوظائف يبدو محليًا ومميزًا."
        />

        <div className="card-grid card-grid--compact">
            {jobs.map((job) => (
                <GlassCard key={job.role} interactive className="data-card">
                    <div className="card-head">
                        <div>
                            <div className="company-mark">{job.company.slice(0, 2)}</div>
                            <h3 className="card-title" style={{ marginTop: '0.85rem' }}>
                                {job.role}
                            </h3>
                            <BilingualLine
                                ar={`${job.company} · ${job.location}`}
                                en={`${job.company} · ${job.location}`}
                                className="card-copy"
                            />
                        </div>
                        <Badge tone={job.tone}>{job.salary}</Badge>
                    </div>

                    <div className="card-meta">
                        <Badge tone="blue">نشطة / Active</Badge>
                        <Badge tone="gold">توافق قوي / High match</Badge>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <div className="upload-meter__label">
                            <span>درجة التوافق / Fit score</span>
                            <strong>{job.fit}%</strong>
                        </div>
                        <ProgressBar value={job.fit} />
                    </div>

                    <div className="inline-actions" style={{ marginTop: '1rem' }}>
                        <PremiumButton variant="primary">قدّم الآن / Apply</PremiumButton>
                        <PremiumButton variant="ghost">معاينة / Preview</PremiumButton>
                    </div>
                </GlassCard>
            ))}
        </div>
    </div>
);

export default Jobs;