import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '../../context/LanguageContext';
import { LoaderButton } from '../PremiumUI';

/** Builds a Word-compatible .doc from the CV data (pure HTML + mso styles -
 *  opens perfectly in Microsoft Word, handles Arabic RTL). */
const buildWordDoc = (cv, isArabic) => {
    const { header = {}, summary = '', skills = [], softSkills = [], experience = [], education = [], certifications = [], languages = [], projects = [] } = cv || {};
    const dir = isArabic ? 'rtl' : 'ltr';
    const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const section = (title, body) =>
        `<h3 style="font-family:Arial;color:#0c4a6e;font-size:12pt;font-weight:bold;letter-spacing:0.04em;margin:16px 0 6px;border-bottom:2px solid #0d9488;padding-bottom:3px;">${esc(title)}</h3>${body}`;

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>CV - ${esc(header.name)}</title></head>
<body dir="${dir}" style="font-family:Arial, 'Cairo', sans-serif;color:#0f172a;font-size:11pt;line-height:1.5;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="border-bottom:3px solid #0c4a6e;padding-bottom:8px;">
<h1 style="font-size:24pt;margin:0;color:#0c4a6e;letter-spacing:-0.01em;">${esc(header.name)}</h1>
<div style="font-size:12pt;color:#0d9488;font-weight:bold;">${esc(header.title)}</div>
<div style="font-size:10pt;color:#475569;margin:4px 0 0;">${[header.email, header.phone, header.location, header.linkedin].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</div>
</td>
</tr></table>`;

    if (summary) html += section(isArabic ? 'الملخص المهني' : 'Professional Summary', `<p style="margin:6px 0;">${esc(summary)}</p>`);

    if (skills.length || softSkills.length) {
        let body = '';
        if (skills.length) body += `<p><strong>${isArabic ? 'تقنية' : 'Technical'}:</strong> ${skills.map(esc).join(', ')}</p>`;
        if (softSkills.length) body += `<p><strong>${isArabic ? 'شخصية' : 'Soft'}:</strong> ${softSkills.map(esc).join(', ')}</p>`;
        html += section(isArabic ? 'المهارات' : 'Skills', body);
    }

    if (experience.length) {
        const body = experience.map((j) =>
            `<p style="margin:8px 0 2px;"><strong>${esc(j.role)}</strong> - ${esc(j.company)}<span style="color:#475569;"> ${j.dates ? '· ' + esc(j.dates) : ''}</span></p>` +
            (j.bullets && j.bullets.length ? `<ul style="margin:2px 0 6px 20px;">${j.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : '')
        ).join('');
        html += section(isArabic ? 'الخبرة العملية' : 'Work Experience', body);
    }

    if (education.length) {
        const body = education.map((e) => `<p style="margin:6px 0;"><strong>${esc(e.degree)}</strong> - ${esc(e.institution)}<span style="color:#475569;"> ${e.years ? '· ' + esc(e.years) : ''}${e.gpa ? ' · GPA ' + esc(e.gpa) : ''}</span></p>`).join('');
        html += section(isArabic ? 'التعليم' : 'Education', body);
    }

    if (certifications.length) {
        const body = certifications.map((c) => `<p style="margin:6px 0;"><strong>${esc(c.name)}</strong><span style="color:#475569;"> ${c.issuer ? '- ' + esc(c.issuer) : ''}${c.year ? ' · ' + esc(c.year) : ''}</span></p>`).join('');
        html += section(isArabic ? 'الشهادات' : 'Certifications', body);
    }

    if (languages.length) {
        html += section(isArabic ? 'اللغات' : 'Languages', `<p>${languages.map((l) => `${esc(l.name)} - ${esc(l.level)}`).join(' &nbsp;•&nbsp; ')}</p>`);
    }

    if (projects.length) {
        const body = projects.map((p) => `<p style="margin:6px 0;"><strong>${esc(p.name)}</strong><br/>${esc(p.description)}</p>`).join('');
        html += section(isArabic ? 'المشاريع' : 'Projects', body);
    }

    html += `</body></html>`;
    return html;
};

const CVDownload = ({ cv, fileName = 'PortNova-CV' }) => {
    const { isArabic } = useLanguage();
    const [busy, setBusy] = useState(null);

    const downloadWord = () => {
        const html = buildWordDoc(cv, isArabic);
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.doc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const downloadPdf = async () => {
        const area = document.getElementById('cv-print-area');
        if (!area) return;
        setBusy('pdf');
        try {
            const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: null });
            const img = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = 210;
            const pageH = 297;
            const imgW = pageW;
            const imgH = (canvas.height * imgW) / canvas.width;
            let heightLeft = imgH;
            let position = 0;
            pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) {
                position -= pageH;
                pdf.addPage();
                pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
                heightLeft -= pageH;
            }
            pdf.save(`${fileName}.pdf`);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('PDF export failed', error);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="cv-download">
            <LoaderButton variant="gold" loading={busy === 'pdf'} onClick={downloadPdf}>
                {busy === 'pdf' ? (isArabic ? 'جارٍ إنشاء PDF...' : 'Creating PDF…') : `⬇ ${isArabic ? 'تحميل PDF' : 'Download PDF'}`}
            </LoaderButton>
            <LoaderButton variant="primary" loading={busy === 'doc'} onClick={downloadWord}>
                {busy === 'doc' ? (isArabic ? 'جارٍ إنشاء...' : 'Creating…') : `⬇ ${isArabic ? 'تحميل Word' : 'Download Word'}`}
            </LoaderButton>
        </div>
    );
};

export default CVDownload;
