export type UGCWork = {
  type: 'reels' | 'post' | 'video'
  url: string
}

export type UGCItem = {
  company: string
  logo: { src: string; top: string }
  instagram: UGCWork[]
  tiktok: UGCWork[]
}

export const ugcItems: UGCItem[] = [
  {
    company: 'SOTSU',
    logo: { src: '/images/brands/sotsu.jpg', top: '-20.73%' },
    instagram: [
      { type: 'reels', url: 'https://www.instagram.com/reel/DVIaRaHDH6d/?stkn=MWxuOXluc3Y2MTJ4ZA==' },
      { type: 'post', url: 'https://www.instagram.com/p/DVMBT1vDPyu/?stkn=YzY2cG5nbmwwMGc4' },
    ],
    tiktok: [
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb5SgEb/' },
      { type: 'post', url: 'https://vt.tiktok.com/ZSbbPw2J3/' },
    ],
  },
  {
    company: 'USH TANBA',
    logo: { src: '/images/brands/ush-tanba.jpg', top: '-32.77%' },
    instagram: [
      { type: 'reels', url: 'https://www.instagram.com/reel/DZnJ5-mMQuU/?stkn=a3lwaXVubms2czFy' },
      { type: 'reels', url: 'https://www.instagram.com/reel/DZpuhzyMrnH/?stkn=MTN6Yjh3bmdkaWh4MA==' },
      { type: 'reels', url: 'https://www.instagram.com/reel/DZsUfWiMAF4/?stkn=ODVlczN5cTE5Z3Rr' },
      { type: 'reels', url: 'https://www.instagram.com/reel/DZxkLcSsrrK/?stkn=NHZuZWQ5c2VybHVj' },
    ],
    tiktok: [
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb54LPk/' },
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb5U9ro/' },
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb593FL/' },
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb5xr5j/' },
    ],
  },
  {
    company: 'BYMER',
    logo: { src: '/images/brands/bymer.jpg', top: '-27.46%' },
    instagram: [
      { type: 'reels', url: 'https://www.instagram.com/reel/DXcb_d7DOon/?stkn=MWh0dnM5NjdmN3Zxdg==' },
      { type: 'reels', url: 'https://www.instagram.com/reel/DXtFLCgjPHg/?stkn=bjdudHNnNjduMGx3' },
    ],
    tiktok: [
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb5f6oc/' },
      { type: 'video', url: 'https://vt.tiktok.com/ZSbb54efd/' },
    ],
  },
]
