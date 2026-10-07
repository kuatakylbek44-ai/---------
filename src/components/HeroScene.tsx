import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACESFilmicToneMapping, Group, PCFSoftShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'
import { Workspace } from './Workspace'
import { listenToMediaQuery } from '../utils/mediaQuery'

type Props = { reducedMotion: boolean; label: string; language?: 'kk' | 'ru' | 'en' }
const sceneCopy = {
  kk: { drag: 'Солға/оңға сүйреңіз', keys: 'Айналдыру: ← → пернелері', fallback: 'Жұмыс орнымның дайын көрінісі', pause: 'Тоқтату', play: 'Анимация', reset: 'Бастапқы көрініс', portrait: 'Жақыннан', workspace: 'Толық көрініс' },
  ru: { drag: 'Потяните влево / вправо', keys: 'Поворот: клавиши ← →', fallback: 'Готовый вид рабочего места', pause: 'Пауза', play: 'Анимация', reset: 'Начальный вид', portrait: 'Крупный план', workspace: 'Общий вид' },
  en: { drag: 'Drag left / right', keys: 'Rotate with the ← → keys', fallback: 'Workspace preview', pause: 'Pause', play: 'Animate', reset: 'Reset view', portrait: 'Close-up', workspace: 'Full view' },
}

function HorizontalRotation({ reducedMotion, portrait, children }: { reducedMotion: boolean; portrait: boolean; children: ReactNode }) {
  const rig = useRef<Group>(null)
  const angle = useRef(0)
  const { gl, invalidate } = useThree()
  useLayoutEffect(() => {
    angle.current = 0
    if (rig.current) rig.current.rotation.y = 0
    invalidate()
  }, [portrait, invalidate])
  useEffect(() => {
    const canvas = gl.domElement
    const shell = canvas.closest('.scene-shell') as HTMLElement
    let gesture: { id: number; x: number; y: number; start: number; horizontal: boolean } | null = null
    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, start: angle.current, horizontal: false }
    }
    const move = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return
      if (event.pointerType === 'mouse' && event.buttons !== 1) { end(); return }
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (!gesture.horizontal) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return
        if (event.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { gesture = null; return }
        gesture.horizontal = true
        canvas.setPointerCapture(event.pointerId)
        canvas.classList.add('is-dragging')
      }
      angle.current = gesture.start + dx / canvas.clientWidth * Math.PI * 2
      invalidate()
    }
    const end = () => {
      if (gesture && canvas.hasPointerCapture(gesture.id)) canvas.releasePointerCapture(gesture.id)
      gesture = null
      canvas.classList.remove('is-dragging')
    }
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('button')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      angle.current += event.key === 'ArrowLeft' ? -Math.PI / 8 : Math.PI / 8
      invalidate()
    }
    // Capture horizontal gestures only; native vertical scrolling stays available.
    canvas.addEventListener('pointerdown', start)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', end)
    canvas.addEventListener('pointercancel', end)
    canvas.addEventListener('lostpointercapture', end)
    const reset = () => { angle.current = 0; invalidate() }
    shell.addEventListener('scene-reset', reset)
    shell.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', end)
      canvas.removeEventListener('pointercancel', end)
      canvas.removeEventListener('lostpointercapture', end)
      shell.removeEventListener('keydown', key)
      shell.removeEventListener('scene-reset', reset)
    }
  }, [gl, invalidate])
  useFrame((_, delta) => {
    if (!rig.current) return
    const remaining = angle.current - rig.current.rotation.y
    rig.current.rotation.y = reducedMotion || Math.abs(remaining) < 0.001
      ? angle.current
      : rig.current.rotation.y + remaining * (1 - Math.exp(-12 * Math.min(delta, 0.1)))
    if (Math.abs(angle.current - rig.current.rotation.y) > 0.001) invalidate()
  })
  // In close-up mode the portrait turns around its own center rather than orbiting out of frame.
  return <group ref={rig} name="horizontal-workspace-rig" position={portrait ? [2.57, 0, -.31] : [0, 0, 0]}>
    <group position={portrait ? [-2.57, 0, .31] : [0, 0, 0]}>{children}</group>
  </group>
}

function SceneFallback({ label, description }: { label: string; description: string }) {
  return <div className="scene-fallback" role="img" aria-label={`${label}. ${description}`}>
    <img className="scene-fallback-portrait" src="/images/workspace-preview.png" alt="" width={1200} height={1000} />

    <p>{label}</p><small>{description}</small>
  </div>
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}

function WorkspaceCamera({ portrait }: { portrait: boolean }) {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const aspect = size.width / size.height
    if (portrait) {
      const distance = aspect < 1 ? 3.7 / Math.max(aspect, .75) : 3.7
      camera.position.set(2.57 + distance * .08, .92 + distance * .08, -.31 + distance)
      camera.lookAt(2.57, .92, -.31)
    } else {
      const distance = aspect < 1 ? 11.4 / Math.max(aspect, .72) : 10.4
      camera.position.set(distance * .29, .18 + distance * .27, distance * .918)
      camera.lookAt(.25, .18, 0)
    }
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, portrait, invalidate])
  return null
}

export function HeroScene({ reducedMotion, label, language = 'kk' }: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [visible, setVisible] = useState(true)
  const [foreground, setForeground] = useState(!document.hidden)
  const [available, setAvailable] = useState(supportsWebGL)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  const contextCleanup = useRef<(() => void) | null>(null)
  const copy = sceneCopy[language]
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)')
    const update = () => setMobile(query.matches)
    const stopListener = listenToMediaQuery(query, update)
    return () => { stopListener(); contextCleanup.current?.() }
  }, [])
  useEffect(() => {
    const shell = shellRef.current
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '80px' })
    if (shell) observer?.observe(shell)
    const visibility = () => setForeground(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const animated = !reducedMotion && !paused && visible && foreground
  const fallback = <SceneFallback label={label} description={copy.fallback} />
  return <div ref={shellRef} className="scene-shell" role="group" aria-label={`${label}. ${copy.drag}. ${copy.keys}`} tabIndex={available ? 0 : undefined} aria-keyshortcuts="ArrowLeft ArrowRight">
    {!available ? fallback : <SceneBoundary fallback={fallback}>
      <Canvas style={{ touchAction: 'pan-y' }} frameloop="demand" shadows={{ type: PCFSoftShadowMap }} dpr={mobile ? 1 : [1, 1.5]} camera={{ position: [3.82, 3.03, 7.8], fov: 37, near: 0.1, far: 50 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.12, outputColorSpace: SRGBColorSpace }} fallback={fallback}
        onCreated={({ camera, gl }) => {
          camera.lookAt(.25, .18, 0)
          gl.setClearColor('#080b16', 0)
          const lost = (event: Event) => { event.preventDefault(); setAvailable(false) }
          gl.domElement.addEventListener('webglcontextlost', lost)
          contextCleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost)
        }}>
        <WorkspaceCamera portrait={portrait} />
        <hemisphereLight args={['#f1f3f6', '#4a413a', 1.05]} />
        <directionalLight position={[-3.5, 6.5, 5]} intensity={2.3} color="#fff2e5" castShadow shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} shadow-radius={4} shadow-normalBias={0.018} shadow-bias={-0.00015} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
        <directionalLight position={[4, 4, -3]} intensity={1.2} color="#c8d8f2" />
        <directionalLight position={[4, 2, 5]} intensity={.65} color="#f4eee7" />
        <pointLight position={[-2, 3, -2]} intensity={.45} distance={7} color="#c3d8f0" />
        <HorizontalRotation reducedMotion={reducedMotion} portrait={portrait}><Workspace reducedMotion={reducedMotion} animated={animated} /></HorizontalRotation>
      </Canvas>
    </SceneBoundary>}
    {available && <div className="scene-controls">
      <button type="button" aria-pressed={portrait} onClick={() => setPortrait(value => !value)}>{portrait ? copy.workspace : copy.portrait}</button>
      {!reducedMotion && <button type="button" className="scene-motion-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>{paused ? copy.play : copy.pause}</button>}
      <button type="button" aria-label={copy.reset} title={copy.reset} onClick={() => { setPortrait(false); shellRef.current?.dispatchEvent(new Event('scene-reset')) }}>↺</button>
    </div>}
    {available && <div className="scene-interaction-hint" aria-hidden="true"><span>↔</span> {copy.drag}</div>}
    <div className="scene-tag"><span /> {label}</div>
    <div className="scene-equipment" aria-label={language === 'kk' ? 'Жұмыс орнымдағы құрылғылар' : language === 'ru' ? 'Моё оборудование' : 'My equipment'}><span>USH TANBA</span><span>SOTSU</span><span>Lenovo LOQ</span></div>
  </div>
}
