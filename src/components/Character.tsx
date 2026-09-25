import type { ThreeElements } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'

export function Character(props: ThreeElements['group']) {
  const group = useRef<Group>(null)
  return (
    <group ref={group} {...props}>
      <mesh position={[0, 1.85, 0]} castShadow><sphereGeometry args={[0.48, 24, 18]} /><meshStandardMaterial color="#d19a7c" roughness={0.8} /></mesh>
      <mesh position={[0, 2.27, 0]} scale={[1, 0.55, 1]} castShadow><sphereGeometry args={[0.5, 24, 16]} /><meshStandardMaterial color="#171827" roughness={0.7} /></mesh>
      <mesh position={[0, 1.18, 0]} castShadow><capsuleGeometry args={[0.52, 0.75, 8, 16]} /><meshStandardMaterial color="#111522" roughness={0.85} /></mesh>
      <mesh position={[-0.61, 1.05, 0]} rotation={[0, 0, -0.12]} castShadow><capsuleGeometry args={[0.13, 0.82, 8, 12]} /><meshStandardMaterial color="#d19a7c" roughness={0.8} /></mesh>
      <mesh position={[0.61, 1.05, 0]} rotation={[0, 0, 0.12]} castShadow><capsuleGeometry args={[0.13, 0.82, 8, 12]} /><meshStandardMaterial color="#d19a7c" roughness={0.8} /></mesh>
      <mesh position={[-0.3, 0.35, 0]} rotation={[0.08, 0, 0.12]} castShadow><capsuleGeometry args={[0.2, 1.05, 8, 12]} /><meshStandardMaterial color="#151927" roughness={0.85} /></mesh>
      <mesh position={[0.3, 0.35, 0]} rotation={[0.08, 0, -0.12]} castShadow><capsuleGeometry args={[0.2, 1.05, 8, 12]} /><meshStandardMaterial color="#151927" roughness={0.85} /></mesh>
      <mesh position={[-0.3, -0.2, 0.1]} castShadow><boxGeometry args={[0.28, 0.12, 0.55]} /><meshStandardMaterial color="#070b13" roughness={0.7} /></mesh>
      <mesh position={[0.3, -0.2, 0.1]} castShadow><boxGeometry args={[0.28, 0.12, 0.55]} /><meshStandardMaterial color="#070b13" roughness={0.7} /></mesh>
      <mesh position={[0, 1.92, 0.44]}><sphereGeometry args={[0.04, 12, 8]} /><meshStandardMaterial color="#171827" /></mesh>
      <mesh position={[-0.17, 1.95, 0.43]}><sphereGeometry args={[0.035, 12, 8]} /><meshStandardMaterial color="#171827" /></mesh>
      <mesh position={[0.17, 1.95, 0.43]}><sphereGeometry args={[0.035, 12, 8]} /><meshStandardMaterial color="#171827" /></mesh>
    </group>
  )
}
