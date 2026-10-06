import type { ReactNode } from 'react'
import { ArrowUpRight, Mail } from 'lucide-react'
import { profile } from '../data/profile'
import { translations } from '../i18n/translations'
import type { Language } from '../i18n/translations'

export function ProfileSection({ language, children }: { language: Language; children: ReactNode }) {
  const t = translations[language]

  return <section id="profile" className="section profile-section container" aria-labelledby="profile-title" tabIndex={-1}>
    <div className="section-index">{t.profile.kicker}</div>
    <div className="profile-card">
      <div className="profile-portrait">
        <img className="profile-photo" src="/images/avatar.jpg" alt={t.profile.photoAlt} width={900} height={1600} loading="lazy" />
      </div>
      <div className="profile-content">
        <p className="profile-role">{t.hero.eyebrow}</p>
        <h2 id="profile-title">{t.hero.title}</h2>
        <p className="profile-bio">{t.hero.text}</p>
        <dl className="profile-facts">
          <div><dt>{t.profile.username}</dt><dd>{profile.brand}</dd></div>
          <div><dt>{t.profile.course}</dt><dd>{t.profile.year}</dd></div>
          <div><dt>{t.profile.university}</dt><dd>{t.about.university}</dd></div>
          <div><dt>{t.profile.specialty}</dt><dd>{t.profile.specialtyValue}</dd></div>
        </dl>
        <a className="button button-primary profile-contact" href={`mailto:${profile.contacts.email}`}><Mail size={17} />{t.profile.contact}<ArrowUpRight size={17} /></a>
        <div className="profile-networks">
          <p>{t.profile.social}</p>
          {children}
        </div>
      </div>
    </div>
  </section>
}
