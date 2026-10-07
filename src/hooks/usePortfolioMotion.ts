import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

const revealSelector = [
  '.hero-text-layer > *', '.hero-actions', '.hero-bottom', '.hero-scene-layer',
  '.section-index', '.profile-card', '.about-grid > *', '.section-heading > *',
  '.skill-group', '.service-card', '.project-card', '.ugc-layout > *',
  '.contact-layout > *', '.contact-footer', '.site-footer',
].join(', ')

export function usePortfolioMotion(rootRef: RefObject<HTMLDivElement | null>, reducedMotion: boolean) {
  const revealed = useRef(new WeakSet<HTMLElement>())

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reducedMotion) return

    const elements = Array.from(root.querySelectorAll<HTMLElement>(revealSelector))
    let observer: IntersectionObserver | undefined
    const show = (element: HTMLElement, immediate = false) => {
      if (immediate) {
        element.style.setProperty('--reveal-delay', '0ms')
        element.dataset.revealInstant = ''
      }
      element.dataset.reveal = 'visible'
      revealed.current.add(element)
      observer?.unobserve(element)
    }

    // Content stays visible in browsers without IntersectionObserver.
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) show(entry.target as HTMLElement)
        })
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })

      const groups = new Map<Element | null, number>()
      elements.forEach(element => {
        if (revealed.current.has(element)) return
        const index = groups.get(element.parentElement) ?? 0
        groups.set(element.parentElement, index + 1)
        element.style.setProperty('--reveal-delay', `${Math.min(index * 70, 210)}ms`)
        if (element.classList.contains('hero-scene-layer')) element.dataset.revealKind = 'fade'
        element.dataset.reveal = 'pending'
        observer?.observe(element)
      })
    }

    const showWithin = (target: Element) => {
      elements.forEach(element => {
        if (target === element || target.contains(element) || element.contains(target)) show(element, true)
      })
    }
    const showHashTarget = () => {
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      const target = id ? document.getElementById(id) : null
      if (target && root.contains(target)) showWithin(target)
    }
    const showFocused = (event: FocusEvent) => {
      if (event.target instanceof Element) showWithin(event.target)
    }
    showHashTarget()
    root.addEventListener('focusin', showFocused)
    window.addEventListener('hashchange', showHashTarget)

    const progress = root.querySelector<HTMLElement>('.reading-progress')
    const ambient = root.querySelector<HTMLElement>('.ambient-lights')
    const compactScreen = window.matchMedia('(max-width: 900px)')
    const ambientProperties = [
      '--ambient-plane-y', '--ambient-orbit-x', '--ambient-orbit-y', '--ambient-orbit-angle',
      '--ambient-violet-x', '--ambient-violet-y', '--ambient-cyan-x', '--ambient-cyan-y',
    ]
    let progressFrame = 0
    let scrollDistance = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    let easedProgress = scrollDistance ? Math.min(1, Math.max(0, window.scrollY / scrollDistance)) : 0
    let lastFrameTime = 0
    const updateProgress = (time: number) => {
      progressFrame = 0
      const value = scrollDistance > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollDistance)) : 0
      if (progress) progress.style.transform = `scaleX(${value})`
      // Time-based easing stays consistent on both 60 Hz and 120 Hz phones.
      const elapsed = lastFrameTime ? Math.min(64, time - lastFrameTime) : 16
      lastFrameTime = time
      easedProgress += (value - easedProgress) * (1 - Math.exp(-elapsed / 100))
      if (Math.abs(value - easedProgress) < .0001) easedProgress = value
      if (ambient) {
        const amplitude = compactScreen.matches ? .45 : 1
        const wave = Math.sin(easedProgress * Math.PI * 2)
        ambient.style.setProperty('--ambient-plane-y', `${-easedProgress * 90 * amplitude}px`)
        ambient.style.setProperty('--ambient-orbit-x', `${wave * 44 * amplitude}px`)
        ambient.style.setProperty('--ambient-orbit-y', `${easedProgress * 100 * amplitude}px`)
        ambient.style.setProperty('--ambient-orbit-angle', `${-28 + easedProgress * 26}deg`)
        ambient.style.setProperty('--ambient-violet-x', `${wave * 92 * amplitude}px`)
        ambient.style.setProperty('--ambient-violet-y', `${easedProgress * 220 * amplitude}px`)
        ambient.style.setProperty('--ambient-cyan-x', `${-wave * 72 * amplitude}px`)
        ambient.style.setProperty('--ambient-cyan-y', `${-easedProgress * 160 * amplitude}px`)
      }
      if (easedProgress !== value) progressFrame = window.requestAnimationFrame(updateProgress)
      else lastFrameTime = 0
    }
    const scheduleProgress = () => {
      if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress)
    }
    const measureScroll = () => {
      scrollDistance = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      scheduleProgress()
    }
    updateProgress(performance.now())
    window.addEventListener('scroll', scheduleProgress, { passive: true })
    window.addEventListener('resize', measureScroll)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measureScroll)
    resizeObserver?.observe(root)

    const cards = Array.from(root.querySelectorAll<HTMLElement>('.skill-group, .service-card, .project-card'))
    cards.forEach(card => { card.dataset.spotlight = '' })
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let pointerFrame = 0
    let pointerCard: HTMLElement | null = null
    let pointerX = 0
    let pointerY = 0
    const clearPointer = () => {
      window.cancelAnimationFrame(pointerFrame)
      pointerFrame = 0
      pointerCard = null
    }
    const updateSpotlight = () => {
      pointerFrame = 0
      if (!pointerCard) return
      const bounds = pointerCard.getBoundingClientRect()
      pointerCard.style.setProperty('--spotlight-x', `${pointerX - bounds.left}px`)
      pointerCard.style.setProperty('--spotlight-y', `${pointerY - bounds.top}px`)
    }
    const followPointer = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === 'touch') return
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-spotlight]') : null
      if (!card || !root.contains(card)) { clearPointer(); return }
      pointerCard = card
      pointerX = event.clientX
      pointerY = event.clientY
      if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updateSpotlight)
    }
    root.addEventListener('pointermove', followPointer, { passive: true })
    root.addEventListener('pointerleave', clearPointer)

    return () => {
      observer?.disconnect()
      resizeObserver?.disconnect()
      window.cancelAnimationFrame(progressFrame)
      clearPointer()
      root.removeEventListener('focusin', showFocused)
      window.removeEventListener('hashchange', showHashTarget)
      window.removeEventListener('scroll', scheduleProgress)
      window.removeEventListener('resize', measureScroll)
      root.removeEventListener('pointermove', followPointer)
      root.removeEventListener('pointerleave', clearPointer)
      elements.forEach(element => {
        delete element.dataset.reveal
        delete element.dataset.revealKind
        delete element.dataset.revealInstant
        element.style.removeProperty('--reveal-delay')
      })
      cards.forEach(card => {
        delete card.dataset.spotlight
        card.style.removeProperty('--spotlight-x')
        card.style.removeProperty('--spotlight-y')
      })
      progress?.style.removeProperty('transform')
      ambientProperties.forEach(property => ambient?.style.removeProperty(property))
    }
  }, [rootRef, reducedMotion])
}
