import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const target = tabs.find(tab => tab.type === 'page' && tab.url === 'about:blank')
assert.ok(target, 'isolated test tab exists')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let nextId = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const request = pending.get(message.id)
  if (!request) return
  pending.delete(message.id)
  if (message.error) request.reject(new Error(JSON.stringify(message.error)))
  else request.resolve(message.result)
})
function call(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function ready() {
  await evaluate(`new Promise((resolve,reject)=>{let count=0;const poll=()=>{if(document.querySelector('.scene-shell canvas')||document.querySelector('.scene-fallback-portrait'))return setTimeout(resolve,4200);if(++count>100)return reject('Scene not loaded');setTimeout(poll,100)};poll()})`)
}
async function screenshot(name) {
  const result = await call('Page.captureScreenshot', { format: 'png' })
  await writeFile(new URL(name, import.meta.url), Buffer.from(result.data, 'base64'))
  return result.data
}
try {
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 1050, deviceScaleFactor: 1, mobile: true })
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  const mobile = await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:!!document.querySelector('.scene-shell canvas')})`)
  assert.equal(mobile.width,390)
  assert.equal(mobile.overflow,false,'mobile has no horizontal overflow')
  assert.equal(mobile.canvas,true,'real WebGL avatar mounts')
  await screenshot('mobile-390-final.png')

  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await evaluate(`new Promise(resolve=>setTimeout(resolve,600))`)
  const before = await screenshot('desktop-final.png')
  await evaluate(`document.querySelector('.scene-shell').focus()`)
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
  await evaluate(`new Promise(resolve=>setTimeout(resolve,1000))`)
  const after = await screenshot('rotated-final.png')
  assert.notEqual(before,after,'keyboard rotates 3D scene')

  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  assert.equal(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),true)
  await call('Page.navigate',{url:'http://127.0.0.1:5173/'})
  await ready()
  assert.equal(await evaluate(`document.querySelectorAll('[data-reveal="pending"]').length`),0,'reduced motion keeps content visible')
  const noMotionBefore = await screenshot('reduced-motion-final.png')
  await evaluate(`new Promise(resolve=>setTimeout(resolve,500))`)
  assert.equal(await screenshot('reduced-motion-still.png'),noMotionBefore,'reduced motion has no idle movement')

  await call('Page.addScriptToEvaluateOnNewDocument',{source:`const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return getContext.call(this,type,...args)}`})
  await call('Page.navigate',{url:'http://127.0.0.1:5173/'})
  await ready()
  assert.equal(await evaluate(`document.querySelector('.scene-fallback-portrait')?.complete && document.querySelector('.scene-fallback-portrait').naturalWidth>0`),true,'fallback uses new avatar preview')
  await screenshot('fallback-final.png')
  console.log('PASS: mobile viewport and overflow, real WebGL, keyboard rotation, reduced motion, avatar fallback')
} finally {
  await call('Browser.close').catch(()=>{})
  socket.close()
}
