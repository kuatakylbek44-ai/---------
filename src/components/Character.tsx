import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Quaternion, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import type { Group, Texture } from 'three'
import { createArmGeometry, createBodyGeometry, createHairGeometry } from './characterGeometry'
import type { BodySection } from './characterGeometry'

type Point = [number, number, number]
const skin = '#c99b7c'
const shirt = '#121418'
const trousers = '#18191c'

function Surface({ sections, color, facial = false, map, ...props }: ThreeElements['mesh'] & {
  sections: BodySection[]; color: string; facial?: boolean; map?: Texture
}) {
  const geometry = useMemo(() => createBodyGeometry(sections, facial), [sections, facial])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} castShadow receiveShadow={!facial} {...props}>
    <meshStandardMaterial color={color} map={map} roughness={facial ? .82 : .88} />
  </mesh>
}

function Limb({ name, from, to, radii, color, depth = 1 }: {
  name: string; from: Point; to: Point; radii: number[]; color: string; depth?: number
}) {
  const start = new Vector3(...from)
  const direction = new Vector3(...to).sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
  const sections: BodySection[] = radii.map((radius, index) => [
    direction.length() * index / (radii.length - 1), radius, radius * depth, radius * depth,
  ])
  return <Surface name={name} position={start} quaternion={rotation} sections={sections} color={color} />
}

function Curve({ points, radius, color, ...props }: ThreeElements['mesh'] & { points: Point[]; radius: number; color: string }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point))), 24, radius, 7, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh {...props} geometry={geometry}>
    <meshStandardMaterial color={color} roughness={.85} />
  </mesh>
}

const torso: BodySection[] = [
  [1.65, .285, .157, .146], [1.73, .3, .173, .159],
  [1.94, .3, .182, .171], [2.18, .322, .187, .167],
  [2.43, .357, .192, .16], [2.61, .399, .174, .155],
  [2.69, .407, .149, .146], [2.735, .31, .12, .123], [2.79, .127, .101, .104],
]
const hips: BodySection[] = [
  [1.425, .025, .09, .09], [1.54, .225, .163, .166], [1.65, .309, .179, .183], [1.77, .286, .163, .164],
]
const head: BodySection[] = [
  [-.28, .016, .036, .037, .021], [-.252, .079, .117, .079, .013],
  [-.202, .143, .16, .108], [-.139, .186, .179, .15],
  [-.063, .218, .194, .181], [.018, .223, .195, .201],
  [.108, .22, .185, .206], [.192, .205, .16, .189],
  [.252, .15, .104, .136], [.29, .006, .006, .006],
]

function Head({ reducedMotion }: { reducedMotion: boolean }) {
  const headRig = useRef<Group>(null)
  const elapsed = useRef(0)
  const { invalidate } = useThree()
  useEffect(() => { elapsed.current = 0; invalidate() }, [invalidate, reducedMotion])
  useFrame((_, delta) => {
    if (!headRig.current) return
    elapsed.current = Math.min(3.6, elapsed.current + Math.min(delta, .05))
    const t = reducedMotion ? 1 : elapsed.current / 3.6
    headRig.current.rotation.set(.015 + Math.sin(t * Math.PI * 2) * .018, -.025 - Math.sin(t * Math.PI) * .065, -.015)
    if (!reducedMotion && t < 1) invalidate()
  })
  const source = useTexture('/textures/character-head-albedo.png')
  const face = useMemo(() => {
    const texture = source.clone()
    texture.colorSpace = SRGBColorSpace
    // The authored atlas includes a neck; UV sampling keeps only the head on this mesh.
    texture.offset.set(0, .22)
    texture.repeat.set(1, .78)
    texture.needsUpdate = true
    return texture
  }, [source])
  const hairMap = useMemo(() => {
    const texture = source.clone()
    texture.colorSpace = SRGBColorSpace
    texture.offset.set(0, .76)
    texture.repeat.set(1, .24)
    texture.needsUpdate = true
    return texture
  }, [source])
  const hair = useMemo(() => createHairGeometry(), [])
  useEffect(() => () => { face.dispose(); hairMap.dispose(); hair.dispose() }, [face, hairMap, hair])

  return <group ref={headRig} name="reference-based-head" position={[0, 3.145, -.012]} rotation={[.015, -.025, -.015]}>
    <Surface name="photo-textured-anatomical-face" sections={head} color="#ffffff" facial map={face} />
    {([-1, 1] as const).map(side => <group key={side}>
      <mesh name={`ear-${side}`} position={[side * .224, -.058, -.008]} rotation={[0, side * -.17, side * -.06]} scale={[.036, .064, .031]} castShadow>
        <sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={skin} roughness={.84} />
      </mesh>
      <mesh position={[side * .246, -.058, .011]} scale={[.009, .039, .009]}>
        <sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#b28165" roughness={.95} />
      </mesh>
    </group>)}
    <mesh name="side-swept-brown-hair" geometry={hair} castShadow>
      <meshStandardMaterial map={hairMap} color="#c6b3a4" roughness={.72} />
    </mesh>
    {Array.from({ length: 18 }, (_, index) => {
      const x = (index - 8.5) * .019
      const edge = Math.abs(x) / .23
      return <Curve key={index} name={`fine-hair-lock-${index}`} points={[
        [x + .009, .185 - edge * .02, .185 - edge * .015],
        [x * .8 - .01, .263 - edge * .055, .13],
        [x * .5 - .025, .332 - edge * .065, .007],
        [x * .6 - .025, .267 - edge * .03, -.118],
      ]} radius={.0012} color={index % 3 === 0 ? '#655040' : '#443427'} />
    })}
  </group>
}

function Ribbon({ points }: { points: Point[] }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
    const positions: number[] = []
    const indices: number[] = []
    curve.getPoints(32).forEach((point, index) => {
      positions.push(point.x - .018, point.y, point.z, point.x + .018, point.y, point.z)
      if (index < 32) indices.push(index * 2, index * 2 + 2, index * 2 + 1, index * 2 + 1, index * 2 + 2, index * 2 + 3)
    })
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshStandardMaterial color="#e7e4dc" roughness={.87} side={DoubleSide} /></mesh>
}

function Lanyard() {
  const badge = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 320
    const context = canvas.getContext('2d')!
    context.fillStyle = '#f2eee5'
    context.fillRect(0, 0, 256, 320)
    context.fillStyle = '#191b22'
    context.font = '700 35px sans-serif'
    context.textAlign = 'center'
    context.fillText('ayazbala', 128, 125)
    context.fillStyle = '#726652'
    context.fillRect(0, 228, 256, 92)
    context.fillStyle = '#fff8e9'
    context.font = '600 26px sans-serif'
    context.fillText('CREATOR', 128, 283)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
  useEffect(() => () => badge.dispose(), [badge])
  return <group name="white-event-lanyard">
    {([-1, 1] as const).map(side => <Ribbon key={side} points={[
      [side * .116, 2.792, -.025], [side * .161, 2.709, .137],
      [side * .127, 2.49, .211], [side * .084, 2.252, .217], [side * .039, 2.046, .198],
    ]} />)}
    <RoundedBox args={[.156, .207, .012]} radius={.01} smoothness={2} position={[0, 1.96, .21]} castShadow>
      <meshStandardMaterial color="#ddd6c9" roughness={.85} />
    </RoundedBox>
    <mesh position={[0, 1.96, .217]}><planeGeometry args={[.147, .198]} /><meshStandardMaterial map={badge} roughness={.9} /></mesh>
  </group>
}

function Watch() {
  return <group name="cream-strap-watch" position={[.257, 2.318, .396]} rotation={[.09, -.07, -.15]}>
    <RoundedBox args={[.086, .047, .115]} radius={.014} smoothness={2}><meshStandardMaterial color="#c5c0ae" roughness={.8} /></RoundedBox>
    <mesh position={[0, 0, .064]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.043, .043, .013, 32]} /><meshStandardMaterial color="#d4d1c7" roughness={.24} metalness={.78} /></mesh>
    <mesh position={[0, 0, .072]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.034, .034, .005, 32]} /><meshStandardMaterial color="#101516" roughness={.3} metalness={.2} /></mesh>
    <mesh position={[0, .01, .076]}><boxGeometry args={[.003, .021, .002]} /><meshStandardMaterial color="#e8e6df" /></mesh>
    <mesh position={[.009, 0, .076]}><boxGeometry args={[.02, .003, .002]} /><meshStandardMaterial color="#e8e6df" /></mesh>
  </group>
}

function CrossedArm({ points, radii, name }: { points: Point[]; radii: number[]; name: string }) {
  const geometry = useMemo(() => createArmGeometry(points, radii), [points, radii])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh name={name} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={skin} roughness={.85} /></mesh>
}

export function Character({ reducedMotion = false, ...props }: ThreeElements['group'] & { reducedMotion?: boolean }) {
  return <group name="photo-inspired-standing-character" {...props}>
    <Surface name="tailored-trouser-waist" sections={hips} color={trousers} />
    {([-1, 1] as const).map(side => <group key={`leg-${side}`}>
      <Limb name={`trouser-leg-${side}`} from={[side * .178, 1.66, .015]} to={[side * .218, .215, .014]} radii={[.153, .174, .152, .134, .139]} depth={.91} color={trousers} />
      <Curve points={[[side * .319, 1.4, .042], [side * .327, .91, .018], [side * .347, .28, .016]]} radius={.0023} color="#292a2d" />
      <group position={[side * .218, 0, .06]} rotation={[0, side * -.11, 0]}>
        <Surface name={`cream-sneaker-sole-${side}`} color="#c6bea8" sections={[[.009, .106, .244, .111, .04], [.032, .126, .253, .132, .04], [.063, .12, .242, .126, .04]]} />
        <Surface name={`black-leather-sneaker-${side}`} color="#191b1d" sections={[[.057, .119, .235, .119, .038], [.105, .116, .212, .117, .031], [.157, .091, .154, .104, .009], [.204, .072, .075, .074, -.012]]} />
        {[0, 1, 2, 3].map(lace => <Curve key={lace} points={[
          [-.067, .164 - lace * .012, .049 + lace * .032], [0, .177 - lace * .012, .052 + lace * .032], [.067, .164 - lace * .012, .049 + lace * .032],
        ]} radius={.004} color="#343436" />)}
      </group>
    </group>)}
    <Surface name="fitted-black-t-shirt" sections={torso} color={shirt} />
    <mesh name="neck" position={[0, 2.815, -.029]} castShadow><cylinderGeometry args={[.097, .122, .235, 32]} /><meshStandardMaterial color={skin} roughness={.85} /></mesh>
    <mesh name="crew-neck-collar" position={[0, 2.783, -.001]} rotation={[Math.PI / 2, 0, 0]} scale={[1, .82, 1]}><torusGeometry args={[.125, .011, 12, 40]} /><meshStandardMaterial color="#26282c" roughness={.96} /></mesh>
    <Curve name="shirt-bottom-hem" points={[[-.27, 1.686, .105], [-.15, 1.673, .155], [0, 1.67, .171], [.15, 1.673, .155], [.27, 1.686, .105]]} radius={.004} color="#242529" />
    <Lanyard />
    {([-1, 1] as const).map(side => <group key={`arm-${side}`}>
      <Limb name={`short-sleeve-${side}`} from={[side * .367, 2.655, -.005]} to={[side * .43, 2.355, .087]} radii={[.137, .143, .132, .119]} color={shirt} />
    </group>)}
    <CrossedArm name="continuous-crossed-left-arm" points={[[-.39, 2.58, .01], [-.43, 2.35, .086], [-.459, 2.13, .16], [-.405, 2.129, .229], [-.12, 2.245, .372], [.304, 2.341, .361]]} radii={[.103, .097, .08, .093, .074, .052]} />
    <CrossedArm name="continuous-crossed-right-arm" points={[[.39, 2.58, .01], [.43, 2.35, .086], [.459, 2.13, .16], [.4, 2.105, .238], [.09, 2.15, .386], [-.312, 2.182, .374]]} radii={[.103, .097, .08, .093, .074, .054]} />
    <mesh name="left-hand-on-upper-arm" position={[.352, 2.379, .289]} rotation={[.2, -.35, -.65]} scale={[.065, .034, .091]} castShadow><sphereGeometry args={[1, 28, 16]} /><meshStandardMaterial color={skin} roughness={.85} /></mesh>
    <mesh name="right-hand-tucked-under-arm" position={[-.368, 2.22, .302]} rotation={[.1, .3, .7]} scale={[.064, .034, .087]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={skin} roughness={.85} /></mesh>
    {[0, 1, 2, 3].map(finger => <Curve key={finger} name={`resting-left-finger-${finger}`} points={[
      [.316 + finger * .019, 2.396 + finger * .009, .306], [.341 + finger * .017, 2.442 + finger * .005, .253], [.356 + finger * .015, 2.456, .219],
    ]} radius={.011} color={skin} castShadow />)}
    <Curve name="resting-left-thumb" points={[[.3, 2.377, .325], [.289, 2.41, .274], [.301, 2.433, .254]]} radius={.016} color={skin} />
    <Watch />
    <Head reducedMotion={reducedMotion} />
  </group>
}
