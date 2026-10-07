import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const tabs = await (await fetch('http://127.0.0.1:9231/json/list')).json()
const target = tabs.find(tab => tab.type === 'page' && tab.url === 'about:blank') ?? tabs.find(tab => tab.type === 'page')
assert.ok(target, 'isolated test page exists')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
const pending = new Map()
const errors = []
let id = 0
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  clearTimeout(request.timeout)
  if (message.error) request.reject(new Error(JSON.stringify(message.error)))
  else request.resolve(message.result)
})
function call(method, params = {}) {
  const requestId = ++id
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`Timeout: ${method}`)) }, 30000)
    pending.set(requestId, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id: requestId, method, params }))
  })
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`!!document.querySelector('.scene-shell canvas,.scene-fallback-portrait')`)) break
    if (attempt === 99) throw new Error('Scene did not mount')
    await delay(100)
  }
  await evaluate('document.fonts.ready.then(() => true)')
  await delay(2400)
}
async function metrics(width, height = 900, mobile = width < 768) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await call('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 })
  await delay(220)
}
async function screenshot(name, clip) {
  const result = await call('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
  await writeFile(new URL(name, import.meta.url), Buffer.from(result.data, 'base64'))
  return result.data
}
async function canvasBounds() {
  return evaluate(`(()=>{const b=document.querySelector('.scene-shell canvas').getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height}})()`)
}

try {
  await call('Page.enable')
  await call('Runtime.enable')
  await metrics(1440, 1000, false)
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  assert.equal(await evaluate(`!!document.querySelector('.scene-shell canvas')`), true, 'real 3D mounts')
  await screenshot('desktop.png')
  await evaluate(`document.querySelector('.scene-controls button[aria-pressed]')?.click()`)
  await delay(300)
  await screenshot('portrait.png')
  await evaluate(`document.querySelector('.scene-controls button[aria-label]')?.click()`)
  await delay(300)
  // Export the actual scene for slow-loading and unsupported-WebGL browsers.
  await evaluate(`(()=>{const s=document.createElement('style');s.id='preview-export-style';s.textContent='.scene-controls,.scene-tag,.scene-interaction-hint,.scene-equipment{visibility:hidden!important}';document.head.append(s)})()`)
  await screenshot('../../public/images/workspace-preview.png', await canvasBounds())
  await evaluate(`document.getElementById('preview-export-style').remove()`)
  // Refresh preview URLs that loaded before the exported file existed.
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()

  const layouts = []
  for (const width of [320, 360, 390, 414, 768, 1024, 1440]) {
    await metrics(width, width < 768 ? 900 : 1000)
    for (const language of ['kk', 'ru', 'en']) {
      await evaluate(`(()=>{document.querySelectorAll('.language-switcher button')[${['kk', 'ru', 'en'].indexOf(language)}].click();scrollTo({top:0,behavior:'instant'})})()`)
      await delay(100)
      const state = await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,language:document.documentElement.lang,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)})`)
      assert.ok(state.scrollWidth <= state.width + 1, `${width}/${language}: no horizontal overflow`)
      assert.equal(state.language, language)
      assert.deepEqual(state.broken, [], 'all images load')
      layouts.push({ width, language, overflow: false })
    }
    if ([390, 768].includes(width)) await screenshot(`page-${width}.png`)
  }
  console.log('PASS: 21 responsive layouts across three languages, real WebGL, images')

  await metrics(390, 844, true)
  await evaluate(`document.querySelectorAll('.language-switcher button')[0].click()`)
  await evaluate(`scrollTo({top:0,behavior:'instant'});document.querySelector('.menu-button').click()`)
  assert.equal(await evaluate(`document.querySelector('.menu-button').getAttribute('aria-expanded')`), 'true')
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  assert.equal(await evaluate(`document.querySelector('.menu-button').getAttribute('aria-expanded')`), 'false')
  const touches = await evaluate(`[...document.querySelectorAll('.scene-controls button')].map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))`)
  assert.ok(touches.every(b => b.width >= 44 && b.height >= 44), 'scene touch targets are at least 44px')
  const ambientBefore = await evaluate(`document.querySelector('.ambient-lights').style.getPropertyValue('--ambient-violet-y')`)
  await evaluate(`scrollTo({top:document.documentElement.scrollHeight*.45,behavior:'instant'})`)
  await delay(800)
  const ambientAfter = await evaluate(`document.querySelector('.ambient-lights').style.getPropertyValue('--ambient-violet-y')`)
  assert.notEqual(ambientBefore, ambientAfter, 'background responds to scrolling')
  await screenshot('scroll-background.png')
  await evaluate(`scrollTo({top:document.getElementById('ugc').offsetTop-30,behavior:'instant'});document.querySelectorAll('.ugc-company')[1].open=true`)
  await delay(400)
  assert.equal(await evaluate(`document.querySelectorAll('.ugc-work-links a').length`), 16)
  await screenshot('ugc-mobile.png')
  const contact = await evaluate(`[...document.querySelectorAll('.contact-option')].map(a=>({href:a.href,target:a.target}))`)
  assert.ok(contact.length === 3 && contact.every(a => a.href.startsWith('https://wa.me/77716169527?text=') && a.target === '_blank'))

  await metrics(844, 390, true)
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`), true, 'landscape fits')
  await metrics(1440, 1000, false)
  await evaluate(`scrollTo({top:0,behavior:'instant'});document.querySelectorAll('.scene-controls button')[1].click();document.querySelector('.scene-shell').focus()`)
  await delay(300)
  const beforeRotate = await screenshot('rotation-before.png', await canvasBounds())
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await delay(750)
  assert.notEqual(await screenshot('rotation-after.png', await canvasBounds()), beforeRotate, 'keyboard rotates true 3D')
  const bounds = await canvasBounds()
  const x = bounds.x + bounds.width * .55, y = bounds.y + bounds.height * .5
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y }] })
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await delay(500)
  assert.equal(await evaluate(`document.querySelector('.scene-shell canvas').style.touchAction`), 'pan-y')
  console.log('PASS: menu, touch targets, scroll background, UGC, WhatsApp, landscape, 3D rotation')

  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  assert.equal(await evaluate(`document.querySelectorAll('[data-reveal="pending"]').length`), 0)
  assert.equal(await evaluate(`document.querySelector('.scene-controls .scene-motion-toggle')`), null)
  const still = await screenshot('reduced-motion.png')
  await delay(600)
  assert.equal(await screenshot('reduced-motion-still.png'), still, 'reduced motion is static')

  const fallbackScript = await call('Page.addScriptToEvaluateOnNewDocument', { source: `const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(['webgl','webgl2','experimental-webgl'].includes(type))return null;return original.call(this,type,...args)}` })
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  assert.equal(await evaluate(`document.querySelector('.scene-fallback-portrait')?.naturalWidth>0`), true, 'fallback scene preview loads')
  await screenshot('no-webgl.png')
  await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: fallbackScript.identifier })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError')}});window.IntersectionObserver=undefined` })
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  assert.equal(await evaluate(`!!document.querySelector('#contact') && document.documentElement.lang==='kk'`), true, 'blocked storage and absent observers retain usable site')
  assert.deepEqual(errors, [], 'no uncaught browser errors')
  await writeFile(new URL('report.json', import.meta.url), JSON.stringify({ layouts, landscape: true, webgl: true, closeup: true, touchTargets: true, backgroundScroll: true, menu: true, whatsapp: true, reducedMotion: true, fallback: true, blockedStorage: true, errors }, null, 2))
  console.log('PASS: reduced motion, WebGL fallback, blocked browser storage, missing observers; report saved')
} finally {
  await call('Browser.close').catch(() => {})
  socket.close()
}
