import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Badge, GlassCard, ProgressBar, SectionHeading, StatCounter } from '../components/PremiumUI';
import { useLanguage } from '../context/LanguageContext';

const mockUsers = [
    { email: 'youth@portnova.app', role: 'youth', status: 'Active', joined: 'Aug 2026' },
    { email: 'expert@portnova.app', role: 'expert', status: 'Active', joined: 'Aug 2026' },
    { email: 'company@portnova.app', role: 'company', status: 'Active', joined: 'Aug 2026' },
];

const Admin = () => {
    const { user } = useAuth();
    const { isArabic } = useLanguage();
    const role = user?.user_metadata?.role || user?.app_metadata?.role || 'youth';
    const [users, setUsers] = useState(mockUsers);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadUsers = async () => {
            const { data } = await supabase.from('users').select('*').limit(50);
            if (mounted && data && data.length) {
                setUsers(
                    data.map((u) => ({
                        email: u.email || u.id || 'user',
                        role: u.role || 'youth',
                        status: 'Active',
                        joined: 'Aug 2026',
                    }))
                );
            }
            setLoading(false);
        };

        loadUsers();

        return () => {
            mounted = false;
        };
    }, []);

    const isAdmin = role === 'admin';

    const metrics = useMemo(
        () => [
            { label: isArabic ? 'المستخدمون' : 'Users', value: 128, suffix: '' },
            { label: isArabic ? 'الوظائف' : 'Jobs', value: 46, suffix: '' },
            { label: isArabic ? 'الدورات' : 'Courses', value: 38, suffix: '' },
            { label: isArabic ? 'السير الذاتية' : 'CV Requests', value: 64, suffix: '' },
        ],
        [isArabic]
    );

    if (!isAdmin) {
        return (
            <div className="page-shell">
                <GlassCard className="empty-state">
                    <h3 className="card-title">{isArabic ? 'غير مصرح' : 'Access restricted'}</h3>
                    <p className="muted">
                        {isArabic ? 'هذه اللوحة مخصصة للمديرين فقط.' : 'This dashboard is for administrators only.'}
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="page-shell page-shell__grid">
            <SectionHeading
                kicker={isArabic ? 'الإدارة' : 'Admin'}
                title={isArabic ? 'لوحة إدارة المنصة' : 'Platform administration'}
                subtitle={isArabic ? 'نظرة على المستخدمين والوظائف والدورات وطلبات السيرة الذاتية.' : 'Overview of users, jobs, courses, and CV requests.'}
            />

            <div className="stats-grid">
                {metrics.map((metric) => (
                    <StatCounter key={metric.label} label={metric.label} value={metric.value} suffix={metric.suffix} />
                ))}
            </div>

            <div className="split-grid">
                <GlassCard>
                    <SectionHeading kicker={isArabic ? 'الأداء' : 'Performance'} title={isArabic ? 'صحة المنصة' : 'Platform health'} />
                    <div className="mini-bars">
                        {[
                            { label: isArabic ? 'أداء عام' : 'Overall', value: 94 },
                            { label: isArabic ? 'أمان' : 'Security', value: 97 },
                            { label: isArabic ? 'رضا المستخدم' : 'Satisfaction', value: 89 },
                        ].map((bar) => (
                            <div key={bar.label} className="mini-bars__row">
                                <span className="muted">{bar.label}</span>
                                <div className="mini-bars__track">
                                    <div className="mini-bars__fill" style={{ width: `${bar.value}%` }} />
                                </div>
                                <strong>{bar.value}%</strong>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard>
                    <SectionHeading kicker={isArabic ? 'الأمان' : 'Security'} title={isArabic ? 'إعدادات الأمان' : 'Security status'} />
                    <div className="status-strip">
                        <Badge tone="success">{isArabic ? 'حماية البيانات مفعّلة' : 'Data protection on'}</Badge>
                        <Badge tone="success">{isArabic ? 'مصادقة آمنة' : 'Secure auth'}</Badge>
                        <Badge tone="gold">{isArabic ? 'أدوار محددة' : 'Defined roles'}</Badge>
                    </div>
                    <div className="card-copy" style={{ marginTop: '1rem' }}>
                        {isArabic
                            ? 'سياسات حماية تحافظ على خصوصية بيانات المستخدمين.'
                            : 'Protection policies keep user data private.'}
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div className="upload-meter__label">
                            <span>{isArabic ? 'تغطية الحماية' : 'Protection coverage'}</span>
                            <strong>97%</strong>
                        </div>
                        <ProgressBar value={97} />
                    </div>
                </GlassCard>
            </div>

            <GlassCard>
                <SectionHeading kicker={isArabic ? 'المستخدمون' : 'Users'} title={isArabic ? 'أحدث المستخدمين' : 'Recent users'} subtitle={isArabic ? 'قائمة بالمستخدمين المسجلين على المنصة.' : 'List of registered users on the platform.'} />
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{isArabic ? 'البريد' : 'Email'}</th>
                                <th>{isArabic ? 'الدور' : 'Role'}</th>
                                <th>{isArabic ? 'الحالة' : 'Status'}</th>
                                <th>{isArabic ? 'الانضمام' : 'Joined'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4"><div className="skeleton" style={{ height: '2rem' }} /></td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.email}>
                                        <td>{u.email}</td>
                                        <td><Badge tone="blue">{u.role}</Badge></td>
                                        <td><Badge tone="success">{u.status}</Badge></td>
                                        <td className="muted">{u.joined}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default Admin;
