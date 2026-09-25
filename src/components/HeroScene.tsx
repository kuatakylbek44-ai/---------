import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, PerspectiveCamera, RoundedBox, Text } from '@react-three/drei'
import { Suspense, useRef, useState } from 'react'
import { Group } from 'three'
import { Character } from './Character'

type Props = { reducedMotion: boolean; label: string }

function SceneContent({ reducedMotion }: { reducedMotion: boolean }) {
  const rig = useRef<Group>(null)
  useFrame((state, delta) => {
    if (!rig.current || reducedMotion) return
    rig.current.rotation.y += (state.pointer.x * 0.08 - rig.current.rotation.y) * Math.min(delta * 2.5, 1)
    rig.current.rotation.x += (-state.pointer.y * 0.025 - rig.current.rotation.x) * Math.min(delta * 2, 1)
  })
  return <group ref={rig}>
    <RoundedBox args={[2.2, 2.8, 0.5]} radius={0.25} position={[0, 1.35, -0.78]} castShadow><meshStandardMaterial color="#596070" roughness={0.9} /></RoundedBox>
    <RoundedBox args={[2.7, 0.45, 1.6]} radius={0.2} position={[0, 0.15, -0.08]} castShadow><meshStandardMaterial color="#596070" roughness={0.9} /></RoundedBox>
    <Character position={[0, 0.42, 0.12]} />
    <group position={[2.0, 0.4, -0.25]}>
      <RoundedBox args={[2.25, 0.12, 1.1]} radius={0.06} castShadow><meshStandardMaterial color="#202736" roughness={0.75} /></RoundedBox>
      <mesh position={[0, -0.85, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.9, 12]} /><meshStandardMaterial color="#98a4b8" metalness={0.55} /></mesh>
      <mesh position={[0, -1.3, 0]} castShadow><cylinderGeometry args={[0.42, 0.42, 0.06, 24]} /><meshStandardMaterial color="#202736" metalness={0.3} /></mesh>
      <RoundedBox args={[2.05, 1.15, 0.08]} radius={0.08} position={[0, 0.72, 0]} castShadow><meshStandardMaterial color="#0b101e" emissive="#172b55" emissiveIntensity={0.4} /></RoundedBox>
      <Text position={[0, 0.72, 0.06]} fontSize={0.22} color="#7dd3fc" anchorX="center" anchorY="middle">SOTSU</Text>
    </group>
    <group position={[1.15, 0.72, 0.55]} rotation={[-0.25, 0, 0]}>
      <RoundedBox args={[1.15, 0.06, 0.78]} radius={0.04} castShadow><meshStandardMaterial color="#a2acba" roughness={0.5} metalness={0.4} /></RoundedBox>
      <RoundedBox args={[1.05, 0.52, 0.05]} radius={0.03} position={[0, 0.28, -0.08]}><meshStandardMaterial color="#111827" emissive="#263b6c" emissiveIntensity={0.45} /></RoundedBox>
    </group>
    <group position={[-0.35, 1.02, 0.52]} rotation={[-0.18, 0, 0]}>
      <RoundedBox args={[1.55, 0.08, 0.9]} radius={0.05} castShadow><meshStandardMaterial color="#4e91c8" metalness={0.35} roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0.06, 0]} rotation={[-0.08, 0, 0]}><boxGeometry args={[1.4, 0.04, 0.75]} /><meshStandardMaterial color="#0d1b35" emissive="#183b70" emissiveIntensity={0.65} /></mesh>
    </group>
  </group>
}

export function HeroScene({ reducedMotion, label }: Props) {
  const [webglAvailable] = useState(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return Boolean(context)
  })
  return <div className="scene-shell" aria-label={label} role="img">
    {!webglAvailable ? <div className="scene-fallback"><div className="fallback-chair" /><div className="fallback-person"><span /><strong>ayazbala</strong></div><p>{label}</p></div> : <Canvas frameloop={reducedMotion ? 'demand' : 'always'} shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'low-power' }}>
      {/* Position alone leaves the camera facing -Z; aim at the workspace before its first frame. */}
      <PerspectiveCamera makeDefault position={[5.8, 3.6, 7.4]} fov={36} onUpdate={(camera) => camera.lookAt(0.65, 0.8, 0)} />
      <color attach="background" args={['#0d1427']} />
      <ambientLight intensity={1.5} color="#b7c9ff" />
      <directionalLight position={[-3, 6, 5]} intensity={3.2} color="#f5f7ff" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[3, 2, 2]} intensity={6} distance={7} color="#8b5cf6" />
      <pointLight position={[-3, 2, 1]} intensity={4} distance={6} color="#7dd3fc" />
      <Suspense fallback={null}><SceneContent reducedMotion={reducedMotion} /></Suspense>
      <ContactShadows position={[0, -1.05, 0]} opacity={0.45} scale={9} blur={2.5} far={5} />
      <Environment preset="city" environmentIntensity={0.22} />
    </Canvas>}
    <div className="scene-tag"><span /> {label}</div>
  </div>
}
