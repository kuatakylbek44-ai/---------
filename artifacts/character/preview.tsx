import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Character } from '../../src/components/Character'

const side = new URLSearchParams(window.location.search).get('side')
createRoot(document.getElementById('root')!).render(<Canvas shadows dpr={1} camera={{ position: [0, 1.9, 5.8], fov: 39 }} onCreated={({camera}) => camera.lookAt(0, 1.75, 0)}>
  <color attach="background" args={['#10131d']} />
  <hemisphereLight args={['#e6e8ee', '#25212a', .95]} />
  <directionalLight position={[-3, 5, 5]} intensity={1.85} color="#fff5e9" castShadow />
  <directionalLight position={[3, 3, -2]} intensity={1.45} color="#9f94e5" />
  <directionalLight position={[3, 2, 4]} intensity={.65} color="#badce8" />
  <Suspense fallback={null}><Character rotation={[0, side === 'back' ? Math.PI : side === 'profile' ? Math.PI / 2 : .08, 0]} /></Suspense>
  <mesh rotation={[-Math.PI / 2,0,0]} position={[0,-.007,0]} receiveShadow><planeGeometry args={[200,200]} /><meshStandardMaterial color="#10131d" /></mesh>
</Canvas>)
