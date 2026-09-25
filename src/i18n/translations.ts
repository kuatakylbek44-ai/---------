export type Language = 'kk' | 'ru' | 'en'

type Translation = {
  nav: Record<string, string>
  hero: Record<string, string>
  about: Record<string, string>
  skills: Record<string, string>
  services: Record<string, string>
  projects: Record<string, string>
  ugc: Record<string, string>
  contact: Record<string, string>
  footer: Record<string, string>
}

export const translations: Record<Language, Translation> = {
  kk: {
    nav: { about: 'Мен туралы', skills: 'Дағдылар', services: 'Қызметтер', projects: 'Жобалар', ugc: 'UGC', contact: 'Байланыс' },
    hero: { eyebrow: 'IT студенті · Әзірлеуші · UGC creator', title: 'Қуат Ақылбек', lead: 'Идеядан — цифрлық нәтижеге.', text: 'Веб және мобильді жобалар. Технология туралы контент. Жаңа мүмкіндіктерге ашықпын.', primary: 'Бірге жұмыс істейік', secondary: 'Жұмыстарымды көру', availability: 'Жұмыс, тәжірибе және серіктестік ұсыныстарына ашықпын', sceneLabel: 'Процедуралық 3D жұмыс кеңістігі' },
    about: { kicker: '01 / танысу', title: 'Технология мен шығармашылық түйіскен жерде.', text: 'Мен — Қуат Ақылбек, AIU университетінің 3-курс IT студентімін. Веб және мобильді әзірлеуге қызығамын, технологиялар мен digital lifestyle тақырыбында UGC контент жасаймын. Жұмысқа жауапкершілікпен қарап, тапсырмаларды тиянақты орындауға мән беремін.', university: 'Astana International University — AIU', study: '3-курс · Есептеу техникасы және бағдарламалық қамтамасыз ету' },
    skills: { kicker: '02 / құралдар', title: 'Қолданатын және үйреніп жүрген технологиялар', web: 'Веб', code: 'Бағдарламалау', mobile: 'Мобильді әзірлеу', data: 'Деректер', design: 'Дизайн' },
    services: { kicker: '03 / бағыттар', title: 'Қай бағытта бірге жұмыс істей аламыз?', webTitle: 'Веб-жобалар', webText: 'Жеке сайттар, портфолио, landing page және веб-интерфейстер.', mobileTitle: 'Мобильді жобалар', mobileText: 'Мобильді қосымша интерфейстері мен прототиптері.', ugcTitle: 'UGC контент', ugcText: 'Технологиялық өнімдерді таныстыру, Reels, қысқа видеолар, өнім демонстрациясы және desk setup контенті.' },
    projects: { kicker: '04 / таңдалған бағыт', title: 'Жобалар', text: 'Жұмыс материалдары толықтырылған сайын бұл бөлім жаңарады.', empty: 'Толық ақпарат кейін қосылады', link: 'Сілтеме кейін қосылады' },
    ugc: { kicker: '05 / creator space', title: 'UGC портфолиосы', text: 'Нақты жұмыс үлгілері дайын болғанда осы жерге ұқыпты түрде қосылады.', empty: 'UGC жұмыс үлгілері жақында қосылады', instagram: 'Instagram профилі', tiktok: 'TikTok профилі' },
    contact: { kicker: '06 / байланыс', title: 'Бірге жақсы жоба жасайық', text: 'Жұмыс немесе тәжірибе, сайт немесе қосымша, UGC серіктестік туралы сөйлесуге ашықпын.', work: 'Жұмыс немесе тәжірибе', website: 'Сайт немесе қосымша', collab: 'UGC серіктестік', email: 'Email жазу', copy: 'Email көшіру', copied: 'Көшірілді', copyFailed: 'Көшіру мүмкін болмады', phone: 'Телефон', open: 'Ашу' },
    footer: { note: 'Студенттік портфолио · 2026', top: 'Жоғарыға' },
  },
  ru: {
    nav: { about: 'Обо мне', skills: 'Навыки', services: 'Услуги', projects: 'Проекты', ugc: 'UGC', contact: 'Контакты' },
    hero: { eyebrow: 'IT студент · Разработчик · UGC creator', title: 'Куат Акылбек', lead: 'От идеи — к цифровому результату.', text: 'Веб- и мобильные проекты. Контент о технологиях. Открыт новым возможностям.', primary: 'Давайте работать вместе', secondary: 'Смотреть работы', availability: 'Открыт предложениям о работе, практике и сотрудничестве', sceneLabel: 'Процедурное 3D рабочее пространство' },
    about: { kicker: '01 / знакомство', title: 'Там, где встречаются технологии и творчество.', text: 'Я — Куат Акылбек, IT-студент 3 курса Международного университета Астана. Интересуюсь веб- и мобильной разработкой, создаю UGC-контент о технологиях и digital lifestyle. Ответственно отношусь к работе и внимательно выполняю задачи.', university: 'Международный университет Астана — AIU', study: '3 курс · Вычислительная техника и программное обеспечение' },
    skills: { kicker: '02 / инструменты', title: 'Технологии, которые использую и изучаю', web: 'Веб', code: 'Программирование', mobile: 'Мобильная разработка', data: 'Данные', design: 'Дизайн' },
    services: { kicker: '03 / направления', title: 'В каких задачах можем поработать вместе?', webTitle: 'Веб-проекты', webText: 'Персональные сайты, портфолио, landing page и веб-интерфейсы.', mobileTitle: 'Мобильные проекты', mobileText: 'Интерфейсы и прототипы мобильных приложений.', ugcTitle: 'UGC-контент', ugcText: 'Презентация технологичных продуктов, Reels, короткие видео, демонстрации и desk setup контент.' },
    projects: { kicker: '04 / выбранное направление', title: 'Проекты', text: 'Раздел будет обновляться по мере добавления материалов.', empty: 'Подробная информация будет добавлена позже', link: 'Ссылка будет добавлена позже' },
    ugc: { kicker: '05 / creator space', title: 'UGC-портфолио', text: 'Реальные примеры работ появятся здесь, когда будут готовы.', empty: 'Примеры UGC-работ скоро появятся', instagram: 'Профиль Instagram', tiktok: 'Профиль TikTok' },
    contact: { kicker: '06 / контакт', title: 'Давайте создадим хороший проект', text: 'Открыт к разговору о работе или практике, сайте или приложении, UGC-сотрудничестве.', work: 'Работа или практика', website: 'Сайт или приложение', collab: 'UGC-сотрудничество', email: 'Написать на email', copy: 'Скопировать email', copied: 'Скопировано', copyFailed: 'Не удалось скопировать', phone: 'Телефон', open: 'Открыть' },
    footer: { note: 'Студенческое портфолио · 2026', top: 'Наверх' },
  },
  en: {
    nav: { about: 'About', skills: 'Skills', services: 'Services', projects: 'Projects', ugc: 'UGC', contact: 'Contact' },
    hero: { eyebrow: 'IT student · Developer · UGC creator', title: 'Kuat Akylbek', lead: 'From idea to digital result.', text: 'Web and mobile projects. Technology content. Open to new opportunities.', primary: 'Let’s work together', secondary: 'View my work', availability: 'Open to work, internship and partnership opportunities', sceneLabel: 'Procedural 3D workspace' },
    about: { kicker: '01 / introduction', title: 'Where technology meets creativity.', text: 'I am Kuat Akylbek, a third-year IT student at Astana International University. I am interested in web and mobile development and create UGC content about technology and digital lifestyle. I take responsibility for my work and care about completing tasks thoroughly.', university: 'Astana International University — AIU', study: '3rd year · Computer Engineering and Software' },
    skills: { kicker: '02 / toolkit', title: 'Technologies I use and learn', web: 'Web', code: 'Programming', mobile: 'Mobile development', data: 'Data', design: 'Design' },
    services: { kicker: '03 / directions', title: 'What can we work on together?', webTitle: 'Web projects', webText: 'Personal websites, portfolios, landing pages and web interfaces.', mobileTitle: 'Mobile projects', mobileText: 'Mobile app interfaces and prototypes.', ugcTitle: 'UGC content', ugcText: 'Technology product features, Reels, short videos, product demos and desk setup content.' },
    projects: { kicker: '04 / selected direction', title: 'Projects', text: 'This section will grow as work materials are added.', empty: 'Full information will be added later', link: 'Link will be added later' },
    ugc: { kicker: '05 / creator space', title: 'UGC portfolio', text: 'Real work samples will be added here when ready.', empty: 'UGC work samples coming soon', instagram: 'Instagram profile', tiktok: 'TikTok profile' },
    contact: { kicker: '06 / contact', title: 'Let’s make a great project', text: 'Open to conversations about work or internships, websites or apps, and UGC partnerships.', work: 'Work or internship', website: 'Website or app', collab: 'UGC partnership', email: 'Write an email', copy: 'Copy email', copied: 'Copied', copyFailed: 'Could not copy', phone: 'Phone', open: 'Open' },
    footer: { note: 'Student portfolio · 2026', top: 'Back to top' },
  },
}
