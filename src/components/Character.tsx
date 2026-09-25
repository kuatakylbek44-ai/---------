import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Quaternion, TubeGeometry, Vector3 } from 'three'

type Point = [number, number, number]
// Height, half width, front depth, back depth, optional fore/aft offset.
type Section = [number, number, number, number, number?]

const skin = '#c99272'
const shirt = '#101218'
const trousers = '#171a21'

/** Continuous, tapered surfaces give the figure a human silhouette instead of joined capsules. */
function profileGeometry(sections: Section[], segments = 32, steps = 4) {
  const vertices: number[] = []
  const indices: number[] = []
  const rings: Section[] = []
  for (let section = 0; section < sections.length - 1; section += 1) {
    const a = sections[section]
    const b = sections[section + 1]
    const previous = sections[Math.max(0, section - 1)]
    const next = sections[Math.min(sections.length - 1, section + 2)]
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      const t2 = t * t
      const t3 = t2 * t
      const interpolate = (field: number) => {
        const left = a[field] ?? 0
        const right = b[field] ?? 0
        const m0 = ((b[field] ?? 0) - (previous[field] ?? 0)) / (b[0] - previous[0]) * (b[0] - a[0])
        const m1 = ((next[field] ?? 0) - (a[field] ?? 0)) / (next[0] - a[0]) * (b[0] - a[0])
        return (2 * t3 - 3 * t2 + 1) * left + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * right + (t3 - t2) * m1
      }
      rings.push([
        a[0] + (b[0] - a[0]) * t,
        interpolate(1), interpolate(2), interpolate(3), interpolate(4),
      ])
    }
  }
  rings.push(sections[sections.length - 1])
  rings.forEach(([y, width, front, back, offset = 0], ring) => {
    for (let side = 0; side <= segments; side += 1) {
      const angle = side / segments * Math.PI * 2
      const cosine = Math.cos(angle)
      vertices.push(Math.sin(angle) * width, y, cosine * (cosine >= 0 ? front : back) + offset)
      if (ring < rings.length - 1 && side < segments) {
        const a = ring * (segments + 1) + side
        const b = a + segments + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  })
  // Closed surfaces remain solid from every orbit angle, including bent knees.
  for (const ring of [0, rings.length - 1]) {
    const [y, , , , offset = 0] = rings[ring]
    const center = vertices.length / 3
    vertices.push(0, y, offset)
    for (let side = 0; side < segments; side += 1) {
      const a = ring * (segments + 1) + side
      if (ring === 0) indices.push(center, a + 1, a)
      else indices.push(center, a, a + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Profile({ sections, color, ...props }: ThreeElements['mesh'] & { sections: Section[]; color: string }) {
  const geometry = useMemo(() => profileGeometry(sections), [sections])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh {...props} geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={0.96} />
  </mesh>
}

function Limb({ name, from, to, radii, color, depth = 1 }: {
  name: string
  from: Point
  to: Point
  radii: number[]
  color: string
  depth?: number
}) {
  const start = new Vector3(...from)
  const direction = new Vector3(...to).sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
  const sections: Section[] = radii.map((radius, index) => [
    direction.length() * index / (radii.length - 1), radius, radius * depth, radius * depth,
  ])
  return <Profile name={name} position={start} quaternion={rotation} sections={sections} color={color} />
}

function Stroke({ points, radius, color, ...props }: ThreeElements['mesh'] & { points: Point[]; radius: number; color: string }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map((point) => new Vector3(...point))), 20, radius, 5, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh {...props} geometry={geometry}>
    <meshStandardMaterial color={color} roughness={0.98} />
  </mesh>
}

const torso: Section[] = [
  [0.34, 0.27, 0.15, 0.15], [0.39, 0.31, 0.175, 0.17],
  [0.61, 0.315, 0.185, 0.18], [0.92, 0.355, 0.21, 0.18],
  [1.19, 0.43, 0.225, 0.175], [1.36, 0.455, 0.185, 0.16],
  [1.445, 0.32, 0.14, 0.12], [1.49, 0.15, 0.12, 0.105],
]
const hips: Section[] = [
  [0.08, 0.24, 0.14, 0.15], [0.16, 0.335, 0.22, 0.2],
  [0.28, 0.33, 0.205, 0.19], [0.4, 0.275, 0.16, 0.155],
]
const head: Section[] = [
  [-0.33, 0.045, 0.064, 0.05, 0.02],
  [-0.295, 0.12, 0.14, 0.08, 0.013],
  [-0.23, 0.201, 0.185, 0.135],
  [-0.145, 0.232, 0.211, 0.184],
  [-0.055, 0.262, 0.231, 0.215],
  [0.065, 0.259, 0.225, 0.24],
  [0.19, 0.251, 0.205, 0.242],
  [0.275, 0.204, 0.155, 0.195],
  [0.325, 0.107, 0.082, 0.1],
  [0.34, 0.008, 0.007, 0.008],
]

function hairGeometry() {
  const vertices: number[] = []
  const indices: number[] = []
  const segments = 48
  const rings = 18
  const silhouette = [
    [-0.16, 0.25, 0.24, 0.26], [-0.06, 0.277, 0.255, 0.265],
    [0.05, 0.283, 0.252, 0.275], [0.16, 0.282, 0.243, 0.272],
    [0.23, 0.263, 0.228, 0.251], [0.29, 0.223, 0.18, 0.217],
    [0.35, 0.15, 0.111, 0.145], [0.405, 0.002, 0.002, 0.002],
  ]
  const radiusAt = (y: number, field: number) => {
    const nextIndex = silhouette.findIndex((section) => section[0] >= y)
    const index = nextIndex === -1 ? silhouette.length - 2 : Math.max(0, nextIndex - 1)
    const a = silhouette[index]
    const b = silhouette[index + 1] ?? a
    const t = b[0] === a[0] ? 0 : (y - a[0]) / (b[0] - a[0])
    return a[field] + (b[field] - a[field]) * t
  }
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2
      const front = Math.cos(angle)
      // Forehead remains open; the back and sides retain medium length.
      const hairline = -0.15 + 0.355 * Math.pow((front + 1) / 2, 1.5)
      const y = hairline + (0.405 - hairline) * t
      vertices.push(
        Math.sin(angle) * radiusAt(y, 1),
        y,
        front * radiusAt(y, front > 0 ? 2 : 3) - 0.008 - t * 0.006,
      )
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment
        const b = a + segments + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Head() {
  const hair = useMemo(() => hairGeometry(), [])
  const nose = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([
      -0.023, 0.088, 0.22, 0.023, 0.088, 0.22,
      -0.025, -0.047, 0.28, 0.025, -0.047, 0.28,
      -0.037, -0.078, 0.233, 0.037, -0.078, 0.233,
      0, -0.061, 0.301, 0, -0.095, 0.252,
    ], 3))
    geometry.setIndex([0, 2, 1, 1, 2, 3, 2, 6, 3, 2, 4, 6, 3, 6, 5, 4, 7, 6, 5, 6, 7])
    geometry.computeVertexNormals()
    return geometry
  }, [])
  useEffect(() => () => {
    hair.dispose()
    nose.dispose()
  }, [hair, nose])

  return <group name="head" position={[0, 1.885, 0.01]} rotation={[0.045, -0.035, 0]}>
    <Profile name="anatomical-face" sections={head} color={skin} />
    {([-1, 1] as const).map((side) => <group key={`face-${side}`}>
      <mesh name={`ear-${side}`} position={[side * 0.262, -0.049, -0.01]} scale={[0.044, 0.083, 0.046]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.97} />
      </mesh>
      <mesh name={`ear-inner-${side}`} position={[side * 0.285, -0.045, 0.021]} scale={[0.014, 0.049, 0.013]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#ac755e" roughness={1} />
      </mesh>
      <mesh name={`eye-${side}`} position={[side * 0.102, 0.018, 0.212]} scale={[0.039, 0.014, 0.014]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#d4c5af" roughness={0.9} />
      </mesh>
      <mesh name={`iris-${side}`} position={[side * 0.102, 0.016, 0.226]} scale={[0.0105, 0.0115, 0.005]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#30281f" roughness={0.8} />
      </mesh>
      <Stroke name={`upper-eyelid-${side}`} points={[
        [side * 0.066, 0.02, 0.22], [side * 0.1, 0.03, 0.228], [side * 0.137, 0.018, 0.203],
      ]} radius={0.005} color="#986b55" />
      <Stroke name={`eyebrow-${side}`} points={[
        [side * 0.055, 0.077, 0.224], [side * 0.093, 0.083, 0.223], [side * 0.144, 0.068, 0.195],
      ]} radius={0.011} color="#25211e" />
      <mesh name={`sideburn-${side}`} position={[side * 0.253, 0.028, -0.015]} rotation={[0, 0, side * -0.08]} scale={[0.021, 0.065, 0.076]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#14161a" roughness={1} />
      </mesh>
    </group>)}
    <mesh name="nose-bridge" geometry={nose} castShadow>
      <meshStandardMaterial color={skin} roughness={0.96} />
    </mesh>
    <Stroke name="natural-mouth" points={[
      [-0.071, -0.163, 0.205], [-0.035, -0.158, 0.215], [0, -0.161, 0.219], [0.036, -0.158, 0.215], [0.071, -0.163, 0.205],
    ]} radius={0.005} color="#825747" />
    <Stroke name="lower-lip" points={[
      [-0.045, -0.171, 0.212], [0, -0.174, 0.217], [0.045, -0.171, 0.212],
    ]} radius={0.005} color="#b77e67" />
    <mesh name="swept-back-black-hair" geometry={hair} castShadow>
      <meshStandardMaterial color="#111419" roughness={1} />
    </mesh>
    {Array.from({ length: 15 }, (_, index) => {
      const x = (index - 7) * 0.032
      const edge = Math.abs(x) / 0.26
      return <Stroke name={`swept-hair-lock-${index}`} key={index} points={[
        [x, 0.219 - edge * 0.08, 0.194 - edge * 0.072],
        [x - 0.02, 0.32 - edge * 0.06, 0.122],
        [x - 0.035, 0.387 - edge * 0.13, -0.015],
        [x - 0.02, 0.306 - edge * 0.11, -0.177],
        [x * 0.85, 0.163 - edge * 0.09, -0.239],
      ]} radius={0.013 + (1 - edge) * 0.003} color={index % 3 === 0 ? '#1b1e23' : '#15181d'} castShadow />
    })}
  </group>
}

export function Character(props: ThreeElements['group']) {
  return <group name="seated-character" {...props}>
    <Profile name="tailored-trouser-hips" position={[0, 0, 0.025]} sections={hips} color={trousers} />
    {([-1, 1] as const).map((side) => <group key={`leg-${side}`}>
      <Limb name={`thigh-${side}`} from={[side * 0.19, 0.23, 0.04]} to={[side * 0.24, 0.105, 0.68]} radii={[0.15, 0.172, 0.163, 0.135]} depth={0.87} color={trousers} />
      <Limb name={`shin-${side}`} from={[side * 0.24, 0.12, 0.66]} to={[side * 0.25, -0.86, 0.65]} radii={[0.137, 0.132, 0.115, 0.093]} depth={0.92} color={trousers} />
      <mesh name={`tailored-knee-${side}`} position={[side * 0.24, 0.112, 0.658]} scale={[0.139, 0.138, 0.137]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color={trousers} roughness={0.96} />
      </mesh>
      <Stroke name={`trouser-seam-${side}`} points={[
        [side * 0.371, 0.04, 0.642], [side * 0.361, -0.38, 0.641], [side * 0.341, -0.79, 0.639],
      ]} radius={0.0028} color="#282b31" />
      <mesh name={`shoe-${side}`} position={[side * 0.25, -0.925, 0.75]} scale={[0.133, 0.098, 0.245]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#0d1015" roughness={0.92} />
      </mesh>
      <mesh name={`shoe-sole-${side}`} position={[side * 0.25, -1.005, 0.76]} scale={[0.135, 0.026, 0.248]} castShadow>
        <sphereGeometry args={[1, 24, 12]} />
        <meshStandardMaterial color="#282c33" roughness={1} />
      </mesh>
      {[0, 1, 2].map((lace) => <Stroke name={`shoe-lace-${side}-${lace}`} key={lace} points={[
        [side * 0.25 - 0.066, -0.84 - lace * 0.006, 0.76 + lace * 0.047],
        [side * 0.25, -0.827 - lace * 0.006, 0.763 + lace * 0.047],
        [side * 0.25 + 0.066, -0.84 - lace * 0.006, 0.76 + lace * 0.047],
      ]} radius={0.006} color="#353941" />)}
    </group>)}

    <Profile name="fitted-black-t-shirt" sections={torso} color={shirt} />
    <mesh name="neck" position={[0, 1.52, -0.017]} castShadow>
      <cylinderGeometry args={[0.118, 0.146, 0.3, 24]} />
      <meshStandardMaterial color={skin} roughness={0.95} />
    </mesh>
    <mesh name="shirt-collar" position={[0, 1.482, 0.005]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.83, 1]}>
      <torusGeometry args={[0.142, 0.012, 8, 32]} />
      <meshStandardMaterial color="#252830" roughness={1} />
    </mesh>
    <Stroke name="shirt-hem" points={[
      [-0.29, 0.392, 0.085], [-0.17, 0.385, 0.164], [0, 0.382, 0.177], [0.17, 0.385, 0.164], [0.29, 0.392, 0.085],
    ]} radius={0.006} color="#1e222a" />
    <Stroke name="shirt-side-fold-left" points={[
      [-0.285, 0.45, 0.075], [-0.265, 0.5, 0.114], [-0.294, 0.58, 0.09],
    ]} radius={0.008} color="#191d24" />

    {([-1, 1] as const).map((side) => <group key={`arm-${side}`}>
      <Limb name={`upper-arm-${side}`} from={[side * 0.439, 1.307, 0.005]} to={[side * 0.53, 0.89, 0.225]} radii={[0.109, 0.12, 0.103, 0.083]} color={skin} />
      <Limb name={`t-shirt-sleeve-${side}`} from={[side * 0.392, 1.347, 0]} to={[side * 0.49, 1.078, 0.137]} radii={[0.16, 0.165, 0.145, 0.129]} color={shirt} />
      <Limb name={`sleeve-hem-${side}`} from={[side * 0.486, 1.088, 0.131]} to={[side * 0.491, 1.073, 0.139]} radii={[0.13, 0.13]} color="#23262d" />
      <mesh name={`elbow-${side}`} position={[side * 0.53, 0.896, 0.229]} scale={[0.084, 0.085, 0.085]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.97} />
      </mesh>
      <Limb name={`forearm-${side}`} from={[side * 0.53, 0.89, 0.235]} to={[side * 0.31, 0.691, 0.662]} radii={[0.084, 0.098, 0.079, 0.057]} color={skin} />
      <mesh name={`typing-palm-${side}`} position={[side * 0.29, 0.675, 0.716]} rotation={[0.03, side * -0.14, 0]} scale={[0.08, 0.034, 0.108]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={skin} roughness={0.96} />
      </mesh>
      {[0, 1, 2, 3].map((finger) => {
        const x = side * 0.29 + (finger - 1.5) * 0.034
        const length = finger === 0 || finger === 3 ? 0.05 : 0.067
        return <Stroke key={finger} name={`typing-finger-${side}-${finger}`} points={[
          [x, 0.68, 0.767], [x, 0.674, 0.805], [x, 0.654, 0.803 + length],
        ]} radius={0.015} color={skin} castShadow />
      })}
      <Stroke name={`thumb-${side}`} points={[
        [side * 0.235, 0.67, 0.702], [side * 0.208, 0.659, 0.738], [side * 0.198, 0.65, 0.782],
      ]} radius={0.021} color={skin} castShadow />
    </group>)}
    <Head />
  </group>
}
