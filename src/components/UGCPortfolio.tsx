import { ChevronDown, ExternalLink } from 'lucide-react'
import { ugcItems } from '../data/ugc'
import type { Language } from '../i18n/translations'
import { SocialIcon } from './SocialIcon'

const labels = {
  kk: { hint: 'Компанияны таңдап, жұмыстарымды көріңіз.', reels: 'Reels', post: 'Пост', video: 'Видео' },
  ru: { hint: 'Выберите компанию, чтобы посмотреть мои работы.', reels: 'Reels', post: 'Пост', video: 'Видео' },
  en: { hint: 'Choose a company to view my work.', reels: 'Reels', post: 'Post', video: 'Video' },
}

export function UGCPortfolio({ language }: { language: Language }) {
  const text = labels[language]
  return <div className="ugc-portfolio">
    <p className="ugc-hint">{text.hint}</p>
    <div className="ugc-companies">
      {ugcItems.map(company => <details className="ugc-company" name="ugc-company" key={company.company}>
        <summary>
          <span className="ugc-company-brand">
            <span className="ugc-company-logo" aria-hidden="true">
              <img src={company.logo.src} style={{ top: company.logo.top }} alt="" />
            </span>
            <span>{company.company}</span>
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="ugc-company-content">
          {(['instagram', 'tiktok'] as const).map(platform => <div className="ugc-platform" key={platform}>
            <div className="ugc-platform-name"><SocialIcon platform={platform} size={17} /><span>{platform === 'instagram' ? 'Instagram' : 'TikTok'}</span></div>
            <div className="ugc-work-links">{company[platform].map((work, index, works) => {
              const sameType = works.filter(item => item.type === work.type)
              const number = works.slice(0, index + 1).filter(item => item.type === work.type).length
              const label = `${text[work.type]}${sameType.length > 1 ? ` ${number}` : ''}`
              return <a key={work.url} href={work.url} target="_blank" rel="noopener noreferrer" aria-label={`${company.company} · ${platform === 'instagram' ? 'Instagram' : 'TikTok'} · ${label}`}>
                {label}<ExternalLink size={12} />
              </a>
            })}</div>
          </div>)}
        </div>
      </details>)}
    </div>
  </div>
}
