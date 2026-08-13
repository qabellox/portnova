import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/** Renders the generated CV as a crisp, printable sheet. This exact DOM is
 *  also what the PDF downloader captures, so it stays styled, self-contained
 *  and bilingual (Arabic RTL included). */
const CVPreview = ({ cv, template = 'modern' }) => {
    const { isArabic } = useLanguage();
    const dir = isArabic ? 'rtl' : 'ltr';
    const { header = {}, summary = '', skills = [], softSkills = [], experience = [], education = [], certifications = [], languages = [], projects = [] } = cv || {};

    const section = (title, children) => (
        <section className="cv-section">
            <h3 className="cv-section__title">{title}</h3>
            <div className="cv-section__body">{children}</div>
        </section>
    );

    const listItems = (items) =>
        items && items.length ? (
            <ul className="cv-list">
                {items.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>
        ) : null;

    const contactItems = [header.email, header.phone, header.location, header.linkedin].filter(Boolean);

    /* ----- reusable section fragments ----- */
    const summarySec = summary ? section(isArabic ? 'الملخص المهني' : 'Professional Summary', <p className="cv-text">{summary}</p>) : null;

    const skillsSec = (skills.length || softSkills.length) &&
        section(isArabic ? 'المهارات' : 'Skills', (
            <div className="cv-skills">
                {skills.length ? (
                    <div className="cv-skills__group">
                        <strong>{isArabic ? 'مهارات تقنية' : 'Technical'}</strong>
                        <div className="cv-tags">
                            {skills.map((s, i) => (
                                <span key={i} className="cv-tag">{s}</span>
                            ))}
                        </div>
                    </div>
                ) : null}
                {softSkills.length ? (
                    <div className="cv-skills__group">
                        <strong>{isArabic ? 'مهارات شخصية' : 'Soft skills'}</strong>
                        <div className="cv-tags">
                            {softSkills.map((s, i) => (
                                <span key={i} className="cv-tag">{s}</span>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        ));

    const expSec = experience.length
        ? section(isArabic ? 'الخبرة العملية' : 'Work Experience', (
              <div className="cv-entries">
                  {experience.map((job, i) => (
                      <div key={i} className="cv-entry">
                          <div className="cv-entry__head">
                              <strong>{job.role}</strong>
                              <span className="cv-entry__right">{job.company}{job.dates ? ` · ${job.dates}` : ''}</span>
                          </div>
                          {listItems(job.bullets)}
                      </div>
                  ))}
              </div>
          ))
        : null;

    const eduSec = education.length
        ? section(isArabic ? 'التعليم' : 'Education', (
              <div className="cv-entries">
                  {education.map((edu, i) => (
                      <div key={i} className="cv-entry">
                          <div className="cv-entry__head">
                              <strong>{edu.degree}</strong>
                              <span className="cv-entry__right">{edu.institution}{edu.years ? ` · ${edu.years}` : ''}</span>
                          </div>
                          {edu.gpa ? <p className="cv-text cv-text--small">{isArabic ? 'المعدل' : 'GPA'}: {edu.gpa}</p> : null}
                      </div>
                  ))}
              </div>
          ))
        : null;

    const certSec = certifications.length
        ? section(isArabic ? 'الشهادات' : 'Certifications', (
              <div className="cv-entries">
                  {certifications.map((cert, i) => (
                      <div key={i} className="cv-entry">
                          <div className="cv-entry__head">
                              <strong>{cert.name}</strong>
                              <span className="cv-entry__right">{cert.issuer}{cert.year ? ` · ${cert.year}` : ''}</span>
                          </div>
                      </div>
                  ))}
              </div>
          ))
        : null;

    const langSec = languages.length
        ? section(isArabic ? 'اللغات' : 'Languages', (
              <div className="cv-langs">
                  {languages.map((lang, i) => (
                      <span key={i} className="cv-lang">{lang.name} - {lang.level}</span>
                  ))}
              </div>
          ))
        : null;

    const projSec = projects.length
        ? section(isArabic ? 'المشاريع' : 'Projects', (
              <div className="cv-entries">
                  {projects.map((proj, i) => (
                      <div key={i} className="cv-entry">
                          <div className="cv-entry__head"><strong>{proj.name}</strong></div>
                          <p className="cv-text">{proj.description}</p>
                      </div>
                  ))}
              </div>
          ))
        : null;

    const headerBlock = (
        <header className="cv-header">
            <h1 className="cv-header__name">{header.name || '-'}</h1>
            {header.title ? <div className="cv-header__title">{header.title}</div> : null}
            <div className="cv-header__meta">
                {contactItems.map((item, i) => (
                    <span key={i}>{item}</span>
                ))}
            </div>
        </header>
    );

    /* ---- Professional: two-column layout with a dark sidebar ---- */
    if (template === 'professional') {
        return (
            <div id="cv-print-area" className="cv-sheet cv-sheet--professional" dir={dir}>
                <div className="cv-sheet__grid">
                    <aside className="cv-sheet__aside">
                        <div className="cv-aside__head">
                            <h1 className="cv-aside__name">{header.name || '-'}</h1>
                            {header.title ? <div className="cv-aside__title">{header.title}</div> : null}
                        </div>
                        {contactItems.length ? (
                            <div className="cv-aside__contact">
                                {contactItems.map((item, i) => (
                                    <span key={i}>{item}</span>
                                ))}
                            </div>
                        ) : null}
                        {skillsSec}
                        {langSec}
                        {certSec}
                    </aside>
                    <main className="cv-sheet__main">
                        {summarySec}
                        {expSec}
                        {eduSec}
                        {projSec}
                    </main>
                </div>
            </div>
        );
    }

    /* ---- Modern & Marine: single column ---- */
    return (
        <div id="cv-print-area" className={`cv-sheet cv-sheet--${template}`} dir={dir}>
            <div className="cv-sheet__body">
                {headerBlock}
                {summarySec}
                {skillsSec}
                {expSec}
                {eduSec}
                {certSec}
                {langSec}
                {projSec}
            </div>
        </div>
    );
};

export default CVPreview;
