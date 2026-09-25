import { chromium } from 'file:///C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
const stage = process.argv[2] || 'before'
await mkdir('artifacts/scene', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } })
  if (stage === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' })
  const log = { console: [], errors: [], failed: [], responses: [] }
  page.on('console', m => log.console.push({ type: m.type(), text: m.text() }))
  page.on('pageerror', e => log.errors.push(e.message))
  page.on('requestfailed', r => log.failed.push({ url: r.url(), error: r.failure() }))
  page.on('response', r => { if (r.status() >= 400 || !r.url().startsWith('http://127.0.0.1')) log.responses.push({ url: r.url(), status: r.status() }) })
  await page.goto('http://127.0.0.1:5173')
  await page.waitForTimeout(12000)
  log.sizes = await page.evaluate(() => [...document.querySelectorAll('.scene-shell, .scene-shell > div, canvas')].map(e => ({ tag: e.tagName, class: e.className, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })))
  await page.locator('.scene-shell').scrollIntoViewIfNeeded().catch(() => {})
  await page.screenshot({ path: `artifacts/scene/${stage}-${width}.png` })
  await writeFile(`artifacts/scene/${stage}-${width}.json`, JSON.stringify(log, null, 2))
  console.log(width, JSON.stringify(log))
  await page.close()
}
await browser.close()

