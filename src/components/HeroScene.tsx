import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CanvasTexture, Group, PCFShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'
import { Character } from './Character'

type Props = { reducedMotion: boolean; label: string; language?: 'kk' | 'ru' | 'en' }
const sceneCopy = {
  kk: { drag: 'Солға/оңға сүйреңіз', keys: 'Айналдыру: ← → пернелері', fallback: '3D орнына жұмыс кеңістігінің иллюстрациясы' },
  ru: { drag: 'Потяните влево / вправо', keys: 'Поворот: клавиши ← →', fallback: 'Иллюстрация рабочего пространства вместо 3D' },
  en: { drag: 'Drag left / right', keys: 'Rotate with the ← → keys', fallback: 'Workspace illustration shown in place of 3D' },
}

// Local textures avoid suspending the workspace on remote fonts, HDRs or models.
function useScreenTexture(label: string, lid = false) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 320
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#101a32'
    ctx.fillRect(0, 0, 512, 320)
    const glow = ctx.createLinearGradient(0, 0, 512, 320)
    glow.addColorStop(0, '#1e375b')
    glow.addColorStop(1, '#292044')
    ctx.fillStyle = glow
    ctx.fillRect(12, 12, 488, 296)
    ctx.fillStyle = '#a6e1ff'
    ctx.font = '600 36px sans-serif'
    ctx.fillText(label, 38, 70)
    ctx.fillStyle = '#7285a5'
    ctx.font = '16px monospace'
    ctx.fillText('CREATE. BUILD. EXPLORE.', 40, 106)
    const colors = ['#8b5cf6', '#7dd3fc', '#657ca7', '#7dd3fc', '#53668e']
    colors.forEach((color, row) => {
      ctx.fillStyle = color
      ctx.fillRect(40 + (row % 2) * 24, 146 + row * 25, [238, 326, 190, 278, 150][row], 7)
    })
    if (lid) {
      ctx.clearRect(0, 0, 512, 320)
      ctx.fillStyle = '#c9dcea'
      ctx.font = '500 60px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, 256, 180)
    }
    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    return result
  }, [label, lid])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function Laptop({ blue = false }: { blue?: boolean }) {
  const screen = useScreenTexture(blue ? 'MacBook' : 'Lenovo LOQ')
  const lid = useScreenTexture(blue ? 'MacBook' : 'Lenovo', true)
  return <group name={blue ? 'MacBook' : 'Lenovo-LOQ'}>
    <RoundedBox args={[1.1, 0.07, 0.73]} radius={0.025} smoothness={2} castShadow><meshStandardMaterial color={blue ? '#438bc3' : '#69758c'} roughness={0.42} metalness={0.4} /></RoundedBox>
    <mesh position={[0, 0.042, -0.09]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.88, 0.31]} /><meshStandardMaterial color="#172339" /></mesh>
    {[0, 1, 2, 3].map(row => <mesh key={row} position={[0, 0.044, -0.2 + row * 0.075]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.81, 0.01]} /><meshBasicMaterial color={blue ? '#5a91b4' : '#8594ba'} /></mesh>)}
    <mesh position={[0, 0.043, 0.22]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 0.15]} /><meshStandardMaterial color={blue ? '#70aed6' : '#95a1b6'} /></mesh>
    <group position={[0, 0.33, -0.31]} rotation={[-0.16, 0, 0]}>
      <RoundedBox args={[1.1, 0.65, 0.045]} radius={0.02} smoothness={2} castShadow><meshStandardMaterial color={blue ? '#438bc3' : '#364258'} metalness={0.3} roughness={0.45} /></RoundedBox>
      <mesh position={[0, 0, 0.025]}><planeGeometry args={[1.0, 0.55]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
      <mesh position={[0, 0, -0.026]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.5, 0.31]} /><meshBasicMaterial map={lid} transparent toneMapped={false} /></mesh>
    </group>
  </group>
}

function Workspace() {
  const monitor = useScreenTexture('SOTSU')
  return <group name="workspace">
    <mesh name="workspace-floor" position={[0, -1.075, 0]} receiveShadow><cylinderGeometry args={[2.88, 2.9, 0.035, 64]} /><meshStandardMaterial color="#10172b" roughness={0.98} metalness={0.02} transparent opacity={0.72} /></mesh>
    <mesh position={[0, -1.054, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.74, 2.75, 64]} /><meshBasicMaterial color="#7787bd" transparent opacity={0.2} /></mesh>
    <group name="chair" position={[-1.15, 0, -0.14]}>
      <RoundedBox args={[1.43, 1.68, 0.3]} radius={0.14} smoothness={3} position={[0, 0.85, -0.43]} castShadow><meshStandardMaterial color="#737e90" roughness={0.9} /></RoundedBox>
      <RoundedBox args={[1.15, 1.35, 0.1]} radius={0.045} smoothness={2} position={[0, 0.88, -0.24]} castShadow><meshStandardMaterial color="#8791a2" roughness={0.95} /></RoundedBox>
      <RoundedBox args={[1.43, 0.22, 1.13]} radius={0.1} smoothness={3} castShadow><meshStandardMaterial color="#7b879a" roughness={0.9} /></RoundedBox>
      {[-0.76, 0.76].map(x => <group key={x} position={[x, 0.29, 0.09]}>
        <RoundedBox args={[0.15, 0.12, 0.75]} radius={0.04} smoothness={2} castShadow><meshStandardMaterial color="#505c70" /></RoundedBox>
        <mesh position={[0, -0.21, -0.2]}><cylinderGeometry args={[0.035, 0.035, 0.4, 10]} /><meshStandardMaterial color="#79879e" metalness={0.5} roughness={0.4} /></mesh>
      </group>)}
      <mesh position={[0, -0.5, 0]} castShadow><cylinderGeometry args={[0.07, 0.085, 0.83, 12]} /><meshStandardMaterial color="#97a4b9" metalness={0.6} roughness={0.35} /></mesh>
      {[0, 1, 2, 3, 4].map(i => <group key={i} rotation={[0, i * Math.PI * 0.4, 0]}>
        <mesh position={[0.3, -0.91, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.035, 0.05, 0.6, 8]} /><meshStandardMaterial color="#6c778c" metalness={0.45} /></mesh>
        <mesh position={[0.59, -0.96, 0]}><sphereGeometry args={[0.07, 12, 8]} /><meshStandardMaterial color="#101624" /></mesh>
      </group>)}
    </group>
    <Character position={[-1.15, 0.05, 0]} />
    <group position={[-1.15, 0.59, 0.62]} rotation={[0, Math.PI - 0.08, 0]}><Laptop blue /></group>
    <group name="desk" position={[0.99, 0.53, -0.08]}>
      <RoundedBox args={[2.4, 0.14, 1.65]} radius={0.05} smoothness={2} castShadow receiveShadow><meshStandardMaterial color="#263750" roughness={0.65} metalness={0.15} /></RoundedBox>
      {[-0.95, 0.95].map(x => <group key={x} position={[x, -0.77, 0]}>
        <mesh castShadow><boxGeometry args={[0.1, 1.45, 0.85]} /><meshStandardMaterial color="#46546c" metalness={0.4} roughness={0.45} /></mesh>
        <mesh position={[0, -0.69, 0]} castShadow><boxGeometry args={[0.2, 0.08, 1.1]} /><meshStandardMaterial color="#6b7c95" metalness={0.4} /></mesh>
      </group>)}
      <mesh position={[0, 0.1, -0.42]}><boxGeometry args={[0.55, 0.05, 0.35]} /><meshStandardMaterial color="#657792" metalness={0.45} /></mesh>
      <mesh position={[0, 0.36, -0.46]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color="#7185a2" metalness={0.5} /></mesh>
      <RoundedBox name="SOTSU-monitor" args={[1.91, 1.04, 0.1]} radius={0.04} smoothness={2} position={[0, 0.91, -0.46]} castShadow><meshStandardMaterial color="#111c30" roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0.91, -0.402]}><planeGeometry args={[1.76, 0.89]} /><meshBasicMaterial map={monitor} toneMapped={false} /></mesh>
      <group position={[0.12, 0.14, 0.38]} rotation={[0, -0.12, 0]}><Laptop /></group>
    </group>
  </group>
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
    shell.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', end)
      canvas.removeEventListener('pointercancel', end)
      canvas.removeEventListener('lostpointercapture', end)
      shell.removeEventListener('keydown', key)
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
    <svg viewBox="0 0 360 280" width="320" aria-hidden="true">
      <ellipse cx="180" cy="236" rx="150" ry="26" fill="#192b47" />
      <rect x="47" y="83" width="86" height="129" rx="22" fill="#69788e" />
      <path d="M122 238v-60h171v60M119 176h180" fill="none" stroke="#71829d" strokeWidth="10" />
      <rect x="181" y="68" width="112" height="79" rx="6" fill="#122440" stroke="#7dd3fc" strokeWidth="2" />
      <text x="237" y="111" fill="#7dd3fc" textAnchor="middle" fontSize="17">SOTSU</text>
      <path d="M237 148v24" stroke="#71829d" strokeWidth="7" />
      <path d="M82 161v63m28-63v63" stroke="#171b2c" strokeWidth="19" strokeLinecap="round" />
      <rect x="66" y="111" width="62" height="66" rx="19" fill="#111624" />
      <circle cx="98" cy="86" r="26" fill="#d4a187" /><path d="M72 80q-4-39 41-22q17 7 12 25" fill="#171b2a" />
      <path d="M57 168h90l-12-46H69z" fill="#4e91c8" /><circle cx="103" cy="145" r="4" fill="#c9efff" />
      <path d="M30 56h127M305 147v-100" stroke="#8b5cf6" strokeWidth="2" opacity=".7" />
    </svg>
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
    // Fit the entire rotatable workspace; a lower eye line gives the seated person natural proportions.
    const aspect = size.width / size.height
    const distance = aspect < 1 ? 10.8 : 9.1
    camera.position.set(distance * 0.42, 0.3 + distance * 0.3, distance * 0.857)
    camera.lookAt(0, 0.35, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, invalidate])
  return null
}

export function HeroScene({ reducedMotion, label, language = 'kk' }: Props) {
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
  const fallback = <SceneFallback label={label} description={copy.fallback} />
  return <div className="scene-shell" role="group" aria-label={`${label}. ${copy.drag}. ${copy.keys}`} tabIndex={available ? 0 : undefined} aria-keyshortcuts="ArrowLeft ArrowRight">
    {!available ? fallback : <SceneBoundary fallback={fallback}>
      <Canvas style={{ touchAction: 'pan-y' }} frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={mobile ? 1 : [1, 1.5]} camera={{ position: [3.82, 3.03, 7.8], fov: 37, near: 0.1, far: 50 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={fallback}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.35, 0)
          gl.setClearColor('#080b16', 0)
          const lost = (event: Event) => { event.preventDefault(); setAvailable(false) }
          gl.domElement.addEventListener('webglcontextlost', lost)
          contextCleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost)
        }}>
        <WorkspaceCamera />
        <hemisphereLight args={['#dce5fa', '#191927', 1.55]} />
        <directionalLight position={[-4, 6, 7]} intensity={2.7} color="#fff0e4" castShadow shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} shadow-radius={3} shadow-normalBias={0.025} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
        <directionalLight position={[4, 3, -4]} intensity={2.4} color="#9181f0" />
        <directionalLight position={[-3, 2, -1]} intensity={1.4} color="#7cbbe6" />
        <pointLight position={[1, 2, 4]} intensity={2} distance={8} color="#b8dafa" />
        <HorizontalRotation reducedMotion={reducedMotion}><Workspace /></HorizontalRotation>
      </Canvas>
    </SceneBoundary>}
    {available && <div className="scene-interaction-hint" aria-hidden="true"><span>↔</span> {copy.drag}</div>}
    <div className="scene-tag"><span /> {label}</div>
  </div>
}
