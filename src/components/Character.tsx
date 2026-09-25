import type { ThreeElements } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'

type Point = [number, number, number]

const skin = '#d9a17d'
const shirt = '#11151d'
const trousers = '#191d27'

/** A rounded limb positioned by its joints rather than by an approximate angle. */
function Limb({ name, from, to, radius, color }: {
  name: string
  from: Point
  to: Point
  radius: number
  color: string
}) {
  const start = new Vector3(...from)
  const end = new Vector3(...to)
  const direction = end.clone().sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())

  return <mesh name={name} position={start.add(end).multiplyScalar(0.5)} quaternion={rotation} castShadow receiveShadow>
    <capsuleGeometry args={[radius, direction.length(), 6, 16]} />
    <meshStandardMaterial color={color} roughness={0.85} />
  </mesh>
}

export function Character(props: ThreeElements['group']) {
  return <group name="seated-character" {...props}>
    {/* The pelvis rests on the chair; thighs and shins form a seated pose. */}
    <mesh name="trouser-hips" position={[0, 0.26, 0.04]} scale={[1, 0.64, 0.72]} castShadow receiveShadow>
      <sphereGeometry args={[0.4, 20, 16]} />
      <meshStandardMaterial color={trousers} roughness={0.9} />
    </mesh>
    {([-1, 1] as const).map((side) => <group key={`leg-${side}`}>
      <Limb name={`thigh-${side}`} from={[side * 0.22, 0.24, 0.08]} to={[side * 0.28, 0.11, 0.64]} radius={0.175} color={trousers} />
      <Limb name={`shin-${side}`} from={[side * 0.28, 0.08, 0.65]} to={[side * 0.28, -0.78, 0.68]} radius={0.135} color={trousers} />
      <mesh name={`shoe-${side}`} position={[side * 0.28, -0.92, 0.79]} scale={[0.17, 0.12, 0.28]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#090d14" roughness={0.68} />
      </mesh>
      <mesh name={`shoe-sole-${side}`} position={[side * 0.28, -0.995, 0.8]} scale={[0.174, 0.035, 0.275]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#303745" roughness={0.88} />
      </mesh>
    </group>)}

    <mesh name="black-t-shirt" position={[0, 0.88, 0.015]} scale={[1.1, 0.76, 0.69]} castShadow receiveShadow>
      <capsuleGeometry args={[0.4, 0.4, 8, 24]} />
      <meshStandardMaterial color={shirt} roughness={0.94} />
    </mesh>
    <mesh name="neck" position={[0, 1.39, 0.035]} castShadow>
      <cylinderGeometry args={[0.13, 0.155, 0.26, 20]} />
      <meshStandardMaterial color={skin} roughness={0.84} />
    </mesh>
    <mesh name="shirt-collar" position={[0, 1.34, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.151, 0.032, 8, 24]} />
      <meshStandardMaterial color="#252a35" roughness={0.9} />
    </mesh>

    {([-1, 1] as const).map((side) => <group key={`arm-${side}`}>
      <Limb name={`upper-arm-${side}`} from={[side * 0.43, 1.14, 0.035]} to={[side * 0.56, 0.84, 0.23]} radius={0.105} color={skin} />
      <Limb name={`t-shirt-sleeve-${side}`} from={[side * 0.38, 1.18, 0.025]} to={[side * 0.5, 0.995, 0.14]} radius={0.168} color={shirt} />
      <Limb name={`forearm-${side}`} from={[side * 0.56, 0.84, 0.23]} to={[side * 0.32, 0.68, 0.66]} radius={0.092} color={skin} />
      <mesh name={`typing-hand-${side}`} position={[side * 0.29, 0.675, 0.735]} rotation={[0.08, side * -0.18, 0]} scale={[0.105, 0.059, 0.145]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh name={`thumb-${side}`} position={[side * 0.215, 0.674, 0.70]} scale={[0.05, 0.04, 0.075]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
    </group>)}

    <group name="head" position={[0, 1.76, 0.04]} rotation={[0.055, 0, 0]}>
      <mesh name="face" scale={[0.97, 1.08, 0.92]} castShadow receiveShadow>
        <sphereGeometry args={[0.4, 24, 20]} />
        <meshStandardMaterial color={skin} roughness={0.82} />
      </mesh>
      {([-1, 1] as const).map((side) => <group key={`face-${side}`}>
        <mesh name={`ear-${side}`} position={[side * 0.383, -0.015, 0.005]} scale={[0.073, 0.116, 0.076]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.86} />
        </mesh>
        <mesh name={`ear-inner-${side}`} position={[side * 0.414, -0.016, 0.058]} scale={[0.026, 0.059, 0.012]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#bd8068" roughness={0.9} />
        </mesh>
        <mesh name={`eye-${side}`} position={[side * 0.137, 0.043, 0.344]} scale={[0.051, 0.059, 0.021]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#f6eade" roughness={0.8} />
        </mesh>
        <mesh name={`pupil-${side}`} position={[side * 0.134, 0.039, 0.365]} scale={[0.026, 0.037, 0.011]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#171b22" roughness={0.65} />
        </mesh>
        <mesh name={`eyebrow-${side}`} position={[side * 0.137, 0.13, 0.342]} rotation={[0, 0, side * -0.09]} scale={[0.072, 0.017, 0.018]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshStandardMaterial color="#171920" roughness={0.94} />
        </mesh>
        <mesh name={`sideburn-${side}`} position={[side * 0.361, 0.135, -0.025]} scale={[0.045, 0.116, 0.115]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#10131b" roughness={0.96} />
        </mesh>
      </group>)}
      <mesh name="nose" position={[0, -0.039, 0.375]} scale={[0.055, 0.076, 0.064]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#d59876" roughness={0.84} />
      </mesh>
      <mesh name="subtle-smile" position={[0, -0.158, 0.338]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.059, 0.009, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#895950" roughness={0.92} />
      </mesh>
      <mesh name="short-black-hair" position={[0, 0.015, -0.016]} scale={[1, 1.1, 0.96]} castShadow>
        <sphereGeometry args={[0.418, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.435]} />
        <meshStandardMaterial color="#10131b" roughness={0.96} />
      </mesh>
      <mesh name="hair-sweep" position={[-0.075, 0.372, 0.088]} rotation={[0, 0, -0.12]} scale={[0.285, 0.093, 0.235]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#141820" roughness={0.96} />
      </mesh>
    </group>
  </group>
}
