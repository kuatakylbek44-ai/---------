import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Group, PCFShadowMap, PerspectiveCamera } from 'three'
import { Workspace } from './Workspace'

type Props = { reducedMotion: boolean; label: string; language?: 'kk' | 'ru' | 'en' }
const sceneCopy = {
  kk: { drag: 'Солға/оңға сүйреңіз', keys: 'Айналдыру: ← → пернелері', fallback: 'Жұмыс орныңыздың дайын көрінісі', pause: 'Тоқтату', play: 'Анимация', reset: 'Бастапқы көрініс' },
  ru: { drag: 'Потяните влево / вправо', keys: 'Поворот: клавиши ← →', fallback: 'Готовый вид рабочего места', pause: 'Пауза', play: 'Анимация', reset: 'Начальный вид' },
  en: { drag: 'Drag left / right', keys: 'Rotate with the ← → keys', fallback: 'Workspace preview', pause: 'Pause', play: 'Animate', reset: 'Reset view' },
}

function HorizontalRotation({ reducedMotion, children }: { reducedMotion: boolean; children: ReactNode }) {
  const rig = useRef<Group>(null)
  const angle = useRef(0)
  const { gl, invalidate } = useThree()
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
  return <group ref={rig} name="horizontal-workspace-rig">{children}</group>
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

function WorkspaceCamera() {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    // Fit the complete photographed setup and the standing portrait.
    const aspect = size.width / size.height
    const distance = aspect < 1 ? 11.4 / Math.max(aspect, .72) : 10.4
    camera.position.set(distance * .29, .18 + distance * .27, distance * .918)
    camera.lookAt(.25, .18, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, invalidate])
  return null
}

export function HeroScene({ reducedMotion, label, language = 'kk' }: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [foreground, setForeground] = useState(!document.hidden)
  const [available, setAvailable] = useState(supportsWebGL)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  const contextCleanup = useRef<(() => void) | null>(null)
  const copy = sceneCopy[language]
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => { query.removeEventListener('change', update); contextCleanup.current?.() }
  }, [])
  useEffect(() => {
    const shell = shellRef.current
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '80px' })
    if (shell) observer.observe(shell)
    const visibility = () => setForeground(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const animated = !reducedMotion && !paused && visible && foreground
  const fallback = <SceneFallback label={label} description={copy.fallback} />
  return <div ref={shellRef} className="scene-shell" role="group" aria-label={`${label}. ${copy.drag}. ${copy.keys}`} tabIndex={available ? 0 : undefined} aria-keyshortcuts="ArrowLeft ArrowRight">
    {!available ? fallback : <SceneBoundary fallback={fallback}>
      <Canvas style={{ touchAction: 'pan-y' }} frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={mobile ? 1 : [1, 1.5]} camera={{ position: [3.82, 3.03, 7.8], fov: 37, near: 0.1, far: 50 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={fallback}
        onCreated={({ camera, gl }) => {
          camera.lookAt(.25, .18, 0)
          gl.setClearColor('#080b16', 0)
          const lost = (event: Event) => { event.preventDefault(); setAvailable(false) }
          gl.domElement.addEventListener('webglcontextlost', lost)
          contextCleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost)
        }}>
        <WorkspaceCamera />
        <hemisphereLight args={['#e6e8ee', '#25212a', .95]} />
        <directionalLight position={[-4, 6, 7]} intensity={1.85} color="#fff5e9" castShadow shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} shadow-radius={3} shadow-normalBias={0.025} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
        <directionalLight position={[4, 3, -4]} intensity={1.45} color="#9f94e5" />
        <directionalLight position={[-3, 2, -1]} intensity={.9} color="#badce8" />
        <pointLight position={[1, 2, 4]} intensity={1.2} distance={8} color="#b8dafa" />
        <HorizontalRotation reducedMotion={reducedMotion}><Workspace reducedMotion={reducedMotion} animated={animated} /></HorizontalRotation>
      </Canvas>
    </SceneBoundary>}
    {available && <div className="scene-controls">
      {!reducedMotion && <button type="button" className="scene-motion-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>{paused ? copy.play : copy.pause}</button>}
      <button type="button" aria-label={copy.reset} title={copy.reset} onClick={() => shellRef.current?.dispatchEvent(new Event('scene-reset'))}>↺</button>
    </div>}
    {available && <div className="scene-interaction-hint" aria-hidden="true"><span>↔</span> {copy.drag}</div>}
    <div className="scene-tag"><span /> {label}</div>
    <div className="scene-equipment" aria-label={language === 'kk' ? 'Жұмыс орнымдағы құрылғылар' : language === 'ru' ? 'Моё оборудование' : 'My equipment'}><span>USH TANBA</span><span>SOTSU</span><span>Lenovo LOQ</span></div>
  </div>
}
