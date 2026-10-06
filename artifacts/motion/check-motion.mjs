import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the real hook in a small browser model. These checks exercise events,
// accessibility fallbacks, and effect teardown without requiring a WebGL browser.
const source = readFileSync(new URL('../../src/hooks/usePortfolioMotion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

class EventSurface {
  listeners = new Map()
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? new Set()
    callbacks.add(callback)
    this.listeners.set(type, callbacks)
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback) }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) ?? []) callback(event)
  }
  get listenerCount() {
    return [...this.listeners.values()].reduce((total, callbacks) => total + callbacks.size, 0)
  }
}

class Style {
  values = new Map()
  setProperty(name, value) { this.values.set(name, value) }
  removeProperty(name) { this.values.delete(name) }
  getPropertyValue(name) { return this.values.get(name) ?? '' }
  set transform(value) { this.setProperty('transform', value) }
  get transform() { return this.getPropertyValue('transform') }
}

class MockElement extends EventSurface {
  constructor(classes = [], parent = null) {
    super()
    this.classes = new Set(classes)
    this.classList = { contains: name => this.classes.has(name) }
    this.parentElement = parent
    this.dataset = {}
    this.style = new Style()
    this.bounds = { left: 20, top: 30 }
  }
  contains(element) {
    for (let current = element; current; current = current.parentElement) {
      if (current === this) return true
    }
    return false
  }
  closest(selector) {
    assert.equal(selector, '[data-spotlight]')
    for (let current = this; current; current = current.parentElement) {
      if ('spotlight' in current.dataset) return current
    }
    return null
  }
  getBoundingClientRect() { return this.bounds }
}

function createEnvironment({ intersection = true, finePointer = true, hash = '' } = {}) {
  const window = new EventSurface()
  const root = new MockElement()
  const section = new MockElement([], root)
  const siblings = Array.from({ length: 6 }, () => new MockElement(['service-card'], section))
  const scene = new MockElement(['hero-scene-layer'], root)
  const outside = new MockElement(['service-card'])
  const inner = new MockElement([], siblings[0])
  const progress = new MockElement(['reading-progress'], root)
  const elements = [...siblings, scene]
  const ids = new Map([['projects', section], ['outside', outside], ['card', siblings[1]]])
  const document = { documentElement: { scrollHeight: 2000 }, getElementById: id => ids.get(id) ?? null }
  root.querySelectorAll = selector => selector === '.skill-group, .service-card, .project-card'
    ? siblings : elements
  root.querySelector = selector => selector === '.reading-progress' ? progress : null

  const frames = new Map()
  const canceled = []
  let nextFrame = 1
  window.innerHeight = 1000
  window.scrollY = 0
  window.location = { hash }
  const media = { matches: finePointer }
  window.matchMedia = () => media
  window.requestAnimationFrame = callback => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  }
  window.cancelAnimationFrame = id => { canceled.push(id); frames.delete(id) }
  const flushFrames = () => {
    const batch = [...frames.values()]
    frames.clear()
    batch.forEach(callback => callback(16))
  }

  const intersectionObservers = []
  class IntersectionObserver {
    observed = new Set()
    unobserved = []
    disconnected = false
    constructor(callback) { this.callback = callback; intersectionObservers.push(this) }
    observe(element) { this.observed.add(element) }
    unobserve(element) { this.observed.delete(element); this.unobserved.push(element) }
    disconnect() { this.disconnected = true; this.observed.clear() }
    emit(entries) { this.callback(entries) }
  }
  const resizeObservers = []
  class ResizeObserver {
    observed = new Set()
    disconnected = false
    constructor(callback) { this.callback = callback; resizeObservers.push(this) }
    observe(element) { this.observed.add(element) }
    disconnect() { this.disconnected = true; this.observed.clear() }
    emit() { this.callback([]) }
  }
  if (intersection) window.IntersectionObserver = IntersectionObserver
  let cleanup
  const refs = []
  let refIndex = 0
  const react = {
    useRef(initial) { return refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }) },
    useLayoutEffect(effect) { cleanup = effect() },
  }
  const module = { exports: {} }
  const context = {
    module, exports: module.exports,
    require(name) { assert.equal(name, 'react'); return react },
    window, document, Element: MockElement, ResizeObserver,
    ...(intersection ? { IntersectionObserver } : {}),
  }
  vm.runInNewContext(compiled, context, { filename: 'usePortfolioMotion.js' })
  return {
    window, document, root, section, siblings, scene, inner, outside, progress, elements,
    media, frames, canceled, flushFrames, intersectionObservers, resizeObservers,
    mount(reducedMotion = false) {
      refIndex = 0
      module.exports.usePortfolioMotion({ current: root }, reducedMotion)
    },
    cleanup() { cleanup?.(); cleanup = undefined },
  }
}

const tests = []
function check(name, run) { tests.push({ name, run }) }

check('intersection reveals content once and stagger delays remain bounded', () => {
  const env = createEnvironment()
  env.mount()
  const observer = env.intersectionObservers[0]
  assert.equal(observer.observed.size, env.elements.length)
  assert(env.elements.every(element => element.dataset.reveal === 'pending'))
  const delays = env.siblings.map(element => parseFloat(element.style.getPropertyValue('--reveal-delay')))
  assert(delays.every(value => Number.isFinite(value) && value >= 0 && value <= 210))
  assert(delays.every((value, index) => index === 0 || value >= delays[index - 1]))
  assert(delays.some(value => value > 0), 'siblings should receive a stagger')
  assert.equal(delays.at(-1), delays.at(-2), 'large groups should stop adding delay')
  assert.equal(env.scene.dataset.revealKind, 'fade')
  observer.emit([{ target: env.siblings[0], isIntersecting: false }])
  assert.equal(env.siblings[0].dataset.reveal, 'pending')
  observer.emit([{ target: env.siblings[0], isIntersecting: true }])
  assert.equal(env.siblings[0].dataset.reveal, 'visible')
  assert(!observer.observed.has(env.siblings[0]))
  assert(observer.unobserved.includes(env.siblings[0]))
  env.cleanup()
})

check('missing IntersectionObserver leaves all content visible', () => {
  const env = createEnvironment({ intersection: false })
  assert.doesNotThrow(() => env.mount())
  assert.equal(env.intersectionObservers.length, 0)
  assert(env.elements.every(element => element.dataset.reveal !== 'pending'))
  assert(env.elements.every(element => element.style.getPropertyValue('--reveal-delay') === ''))
  env.cleanup()
})

check('initial hash, hash changes, and focused controls reveal immediately', () => {
  const env = createEnvironment({ hash: '#card' })
  env.mount()
  assert.equal(env.siblings[1].dataset.reveal, 'visible')
  assert.equal(env.siblings[1].style.getPropertyValue('--reveal-delay'), '0ms')
  assert.equal(env.siblings[1].dataset.revealInstant, '')
  env.root.dispatch('focusin', { target: env.inner })
  assert.equal(env.siblings[0].dataset.reveal, 'visible')
  assert.equal(env.siblings[0].style.getPropertyValue('--reveal-delay'), '0ms')
  assert.equal(env.siblings[0].dataset.revealInstant, '')
  env.window.location.hash = '#%E0%A4%A'
  assert.doesNotThrow(() => env.window.dispatch('hashchange'))
  env.window.location.hash = '#outside'
  env.window.dispatch('hashchange')
  assert.equal(env.siblings[2].dataset.reveal, 'pending')
  env.window.location.hash = '#projects'
  env.window.dispatch('hashchange')
  assert(env.siblings.every(element => element.dataset.reveal === 'visible'))
  assert(env.siblings.every(element => element.style.getPropertyValue('--reveal-delay') === '0ms'))
  assert.equal(env.scene.dataset.reveal, 'pending')
  env.cleanup()
})

check('reduced motion initializes no animation listeners or hidden content', () => {
  const env = createEnvironment()
  env.mount(true)
  assert.equal(env.root.listenerCount + env.window.listenerCount, 0)
  assert.equal(env.intersectionObservers.length + env.resizeObservers.length, 0)
  assert.equal(env.frames.size, 0)
  assert(env.elements.every(element => Object.keys(element.dataset).length === 0))
  assert.equal(env.progress.style.transform, '')
  env.cleanup()
})

check('scroll progress clamps and event bursts use a single animation frame', () => {
  const env = createEnvironment()
  env.mount()
  assert.equal(env.progress.style.transform, 'scaleX(0)')
  env.window.scrollY = 500
  env.window.dispatch('scroll')
  env.window.dispatch('scroll')
  env.window.dispatch('resize')
  env.resizeObservers[0].emit()
  assert.equal(env.frames.size, 1)
  assert.equal(env.progress.style.transform, 'scaleX(0)', 'events should defer writes to the frame')
  env.flushFrames()
  assert.equal(env.progress.style.transform, 'scaleX(0.5)')
  for (const [scrollY, expected] of [[2000, 1], [-100, 0]]) {
    env.window.scrollY = scrollY
    env.window.dispatch('scroll')
    env.flushFrames()
    assert.equal(env.progress.style.transform, `scaleX(${expected})`)
  }
  env.document.documentElement.scrollHeight = env.window.innerHeight
  env.window.scrollY = 100
  env.resizeObservers[0].emit()
  env.flushFrames()
  assert.equal(env.progress.style.transform, 'scaleX(0)')
  env.cleanup()
})

check('spotlight responds only to fine non-touch pointers and coalesces moves', () => {
  const env = createEnvironment({ finePointer: false })
  env.mount()
  const move = (clientX, clientY, pointerType = 'mouse', target = env.inner) => {
    env.root.dispatch('pointermove', { target, clientX, clientY, pointerType })
  }
  move(50, 60)
  assert.equal(env.frames.size, 0)
  env.media.matches = true
  move(50, 60, 'touch')
  assert.equal(env.frames.size, 0)
  move(50, 60)
  move(90, 110)
  assert.equal(env.frames.size, 1)
  assert.equal(env.siblings[0].style.getPropertyValue('--spotlight-x'), '')
  env.flushFrames()
  assert.equal(env.siblings[0].style.getPropertyValue('--spotlight-x'), '70px')
  assert.equal(env.siblings[0].style.getPropertyValue('--spotlight-y'), '80px')
  move(100, 120)
  assert.equal(env.frames.size, 1)
  env.root.dispatch('pointerleave')
  assert.equal(env.frames.size, 0)
  move(100, 120)
  move(200, 220, 'mouse', env.outside)
  assert.equal(env.frames.size, 0, 'moving outside a card should cancel its queued write')
  env.cleanup()
})

check('cleanup removes animation state, observers, queued frames, and listeners', () => {
  const env = createEnvironment()
  env.mount()
  env.intersectionObservers[0].emit([{ target: env.siblings[0], isIntersecting: true }])
  env.root.dispatch('focusin', { target: env.inner })
  env.root.dispatch('pointermove', { target: env.inner, clientX: 50, clientY: 70, pointerType: 'mouse' })
  env.flushFrames()
  env.window.dispatch('scroll')
  env.root.dispatch('pointermove', { target: env.inner, clientX: 80, clientY: 90, pointerType: 'mouse' })
  const pendingFrames = [...env.frames.keys()]
  assert.equal(pendingFrames.length, 2)
  env.cleanup()
  assert(env.intersectionObservers.every(observer => observer.disconnected))
  assert(env.resizeObservers.every(observer => observer.disconnected))
  assert.equal(env.frames.size, 0)
  assert(pendingFrames.every(id => env.canceled.includes(id)))
  assert.equal(env.root.listenerCount + env.window.listenerCount, 0)
  assert(env.elements.every(element => !('reveal' in element.dataset)
    && !('revealKind' in element.dataset) && !('revealInstant' in element.dataset)))
  assert(env.elements.every(element => element.style.getPropertyValue('--reveal-delay') === ''))
  assert(env.siblings.every(element => !('spotlight' in element.dataset)))
  assert(env.siblings.every(element => element.style.getPropertyValue('--spotlight-x') === ''
    && element.style.getPropertyValue('--spotlight-y') === ''))
  assert.equal(env.progress.style.transform, '')
  env.mount(true)
  assert.equal(env.root.listenerCount + env.window.listenerCount, 0)
  assert(env.elements.every(element => element.dataset.reveal !== 'pending'))
  env.cleanup()
})

for (const { name, run } of tests) {
  run()
  console.log(`PASS ${name}`)
}
console.log(`\n${tests.length} motion behavior checks passed.`)
