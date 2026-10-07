import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Check, Clipboard, Code2, Layers3, Mail, Menu, Smartphone, Sparkles, X } from 'lucide-react'
import './App.css'
import './Motion.css'
import './Workspace.css'
import { SocialIcon } from './components/SocialIcon'
import { ProfileSection } from './components/ProfileSection'
import { usePortfolioMotion } from './hooks/usePortfolioMotion'
import type { SocialPlatform } from './components/SocialIcon'
import { profile } from './data/profile'
import { projects } from './data/projects'
import { UGCPortfolio } from './components/UGCPortfolio'
import { translations } from './i18n/translations'
import type { Language } from './i18n/translations'

const HeroScene = lazy(() => import('./components/HeroScene').then(module => ({ default: module.HeroScene })))
const socialPlatforms: { platform: SocialPlatform; label: string }[] = [
  { platform: 'instagram', label: 'Instagram' },
  { platform: 'tiktok', label: 'TikTok' },
  { platform: 'whatsapp', label: 'WhatsApp' },
  { platform: 'telegram', label: 'Telegram' },
  { platform: 'github', label: 'GitHub' },
]

const skills = { web: ['HTML/CSS', 'JavaScript'], code: ['Python', 'C++'], mobile: ['Flutter'], data: ['SQL'], design: ['Figma'] }

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('portfolio-language')
    return saved === 'ru' || saved === 'en' ? saved : 'kk'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const siteRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  usePortfolioMotion(siteRef, reducedMotion)
  const t = translations[language]
  useEffect(() => { localStorage.setItem('portfolio-language', language); document.documentElement.lang = language }, [language])
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update) }, [])
  useEffect(() => {
    if (!menuOpen) return
    navigationRef.current?.querySelector('a')?.focus()
    const dismissOutside = (event: Event) => {
      const target = event.target
      if (target instanceof Node && !navigationRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setMenuOpen(false)
    }
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    const desktop = window.matchMedia('(min-width: 901px)')
    const dismissOnDesktop = () => { if (desktop.matches) setMenuOpen(false) }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', dismissWithEscape)
    desktop.addEventListener('change', dismissOnDesktop)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', dismissWithEscape)
      desktop.removeEventListener('change', dismissOnDesktop)
    }
  }, [menuOpen])
  const changeLanguage = (next: Language) => { setLanguage(next); setMenuOpen(false) }
  const copyEmail = async () => { try { await navigator.clipboard.writeText(profile.contacts.email); setCopied('copied') } catch { setCopied('failed') }; window.setTimeout(() => setCopied(null), 2200) }
  const mail = (subject: string) => `mailto:${profile.contacts.email}?subject=${encodeURIComponent(subject)}`
  return <div className="site-shell" ref={siteRef}>
    <div className="ambient-lights" aria-hidden="true"><span className="ambient-orb ambient-orb--violet" /><span className="ambient-orb ambient-orb--cyan" /></div>
    <div className="reading-progress" aria-hidden="true" />
    <header className="site-header"><a className="brand" href="#profile" aria-label={t.profile.open} title={t.profile.open} onClick={() => setMenuOpen(false)}><img className="brand-mark" src="/images/avatar.jpg" alt="" width={28} height={28} /><span>{profile.brand}</span></a><nav id="primary-navigation" ref={navigationRef} className={`nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">{Object.entries(t.nav).map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><div className="header-actions"><div className="language-switcher" aria-label="Language">{(['kk', 'ru', 'en'] as Language[]).map(item => <button key={item} className={language === item ? 'active' : ''} onClick={() => changeLanguage(item)}>{item === 'kk' ? 'ҚАЗ' : item === 'ru' ? 'РУС' : 'ENG'}</button>)}</div><button ref={menuButtonRef} className="menu-button" aria-controls="primary-navigation" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div></header>
    <main id="top">
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-text-layer">
            <div className="eyebrow"><span className="eyebrow-dot" />{t.hero.eyebrow}</div>
            <h1>{t.hero.title}</h1>
            <p className="hero-lead">{t.hero.lead}</p>
            <p className="hero-text">{t.hero.text}</p>
          </div>
          <div className="hero-actions"><a className="button button-primary" href="#contact">{t.hero.primary}<ArrowUpRight size={17} /></a><a className="button button-quiet" href="#projects">{t.hero.secondary}<span className="button-arrow">↓</span></a></div>
          <div className="hero-bottom"><SocialLinks className="social-row" /><p className="availability"><span />{t.hero.availability}</p></div>
        </div>
        <div className="hero-scene-layer">
          <SceneBoundary label={t.hero.sceneLabel}><Suspense fallback={<ScenePlaceholder label={t.hero.sceneLabel} loading />}><HeroScene reducedMotion={reducedMotion} label={t.hero.sceneLabel} language={language} /></Suspense></SceneBoundary>
        </div>
      </section>
      <ProfileSection language={language}><SocialLinks className="profile-socials" /></ProfileSection>
      <section id="about" className="section about container"><div className="section-index">{t.about.kicker}</div><div className="about-grid"><div><h2>{t.about.title}</h2></div><div className="about-detail"><p className="body-large">{t.about.text}</p><div className="profile-meta"><div><span>{t.about.university}</span><strong>{t.about.study}</strong></div><div className="initials" aria-hidden="true">ҚА</div></div></div></div></section>
      <section id="skills" className="section skills-section"><div className="container"><div className="section-index">{t.skills.kicker}</div><div className="section-heading"><h2>{t.skills.title}</h2></div><div className="skills-grid">{Object.entries(skills).map(([key, items], index) => <div className="skill-group" key={key}><div className="skill-icon">{index === 0 ? <Code2 /> : index === 1 ? <Layers3 /> : index === 2 ? <Smartphone /> : index === 3 ? <Sparkles /> : <span>✦</span>}</div><h3>{t.skills[key as keyof typeof t.skills]}</h3><div className="skill-list">{items.map(item => <span key={item}>{item}</span>)}</div></div>)}</div></div></section>
      <section id="services" className="section container"><div className="section-index">{t.services.kicker}</div><div className="section-heading split"><h2>{t.services.title}</h2><p>{t.hero.text}</p></div><div className="services-grid"><ServiceCard number="01" icon={<Code2 />} title={t.services.webTitle} text={t.services.webText} /><ServiceCard number="02" icon={<Smartphone />} title={t.services.mobileTitle} text={t.services.mobileText} /><ServiceCard number="03" icon={<Sparkles />} title={t.services.ugcTitle} text={t.services.ugcText} /></div></section>
      <section id="projects" className="section projects-section"><div className="container"><div className="section-index">{t.projects.kicker}</div><div className="section-heading split"><h2>{t.projects.title}</h2><p>{t.projects.text}</p></div><div className="projects-grid">{projects.map((project, index) => <article className={`project-card ${project.accent}`} key={project.name}><div className="project-cover"><span>0{index + 1}</span><div className="cover-grid" /><strong>{project.name}</strong></div><div className="project-info"><h3>{project.name}</h3><p>{t.projects.empty}</p><span>{t.projects.link}</span></div></article>)}</div></div></section>
      <section id="ugc" className="section ugc-section container"><div className="section-index">{t.ugc.kicker}</div><div className="ugc-layout"><div><h2>{t.ugc.title}</h2><p className="body-large">{t.ugc.text}</p></div><UGCPortfolio language={language} /></div></section>
      <section id="contact" className="section contact-section"><div className="container"><div className="section-index">{t.contact.kicker}</div><div className="contact-layout"><div><h2>{t.contact.title}</h2><p className="body-large">{t.contact.text}</p><div className="contact-main"><a className="email-link" href={`mailto:${profile.contacts.email}`}>{profile.contacts.email}<ArrowUpRight size={18} /></a><button className="copy-button" onClick={copyEmail}>{copied === 'copied' ? <Check size={15} /> : copied === 'failed' ? <X size={15} /> : <Clipboard size={15} />}{copied === 'copied' ? t.contact.copied : copied === 'failed' ? t.contact.copyFailed : t.contact.copy}</button></div></div><div className="contact-options"><ContactLink href={mail(t.contact.work)} icon={<Mail size={19} />} label={t.contact.work} /><ContactLink href={mail(t.contact.website)} icon={<Code2 />} label={t.contact.website} /><ContactLink href={mail(t.contact.collab)} icon={<Sparkles />} label={t.contact.collab} /></div></div><div className="contact-footer"><a href={`tel:${profile.contacts.phone.replaceAll(' ', '')}`}>{t.contact.phone}: <strong>{profile.contacts.phone}</strong></a><SocialLinks className="contact-socials" /></div></div></section>
    </main><footer className="site-footer container"><span>© {profile.brand}</span><span>{t.footer.note}</span><a href="#top">{t.footer.top} <ArrowUpRight size={14} /></a></footer>
  </div>
}
function SocialLinks({ className }: { className: string }) {
  return <div className={className}>{socialPlatforms.map(({ platform, label }) => <a key={platform} href={profile.contacts[platform]} target="_blank" rel="noreferrer" aria-label={label} title={label}><SocialIcon platform={platform} /></a>)}</div>
}

function ScenePlaceholder({ label, loading = false }: { label: string; loading?: boolean }) {
  return <div className={`scene-shell ${loading ? 'scene-loading' : 'scene-placeholder'}`} role="img" aria-label={label} aria-busy={loading}>
    <img className="scene-preview" src="/images/workspace-preview.png" alt="" width={1200} height={1000} />

    <div className="scene-tag"><span /> {label}</div>
  </div>
}

class SceneBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <ScenePlaceholder label={this.props.label} /> : this.props.children }
}

function ServiceCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) { return <article className="service-card"><div className="service-top"><span>{number}</span><div className="service-icon">{icon}</div></div><h3>{title}</h3><p>{text}</p></article> }
function ContactLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) { return <a className="contact-option" href={href}><span>{icon}</span>{label}<ArrowUpRight size={16} /></a> }
export default App
