import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, RepeatWrapping, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import type { Group, Texture } from 'three'
import { createArmGeometry, createBodyGeometry, createHairGeometry, facialDisplacement } from './characterGeometry'
import type { BodySection } from './characterGeometry'

type Point = [number, number, number]
const skin = '#c4a087'
const shirt = '#141619'
const trousers = '#1b1d21'

function surfaceTexture(kind: 'skin' | 'fabric') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const data = context.createImageData(128, 128)
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const random = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    const noise = random - Math.floor(random)
    const grain = kind === 'fabric'
      ? 126 + Math.sin(x * Math.PI) * 11 + (x % 3 === 0 ? 9 : -4) + (y % 3 === 0 ? 8 : -4) + noise * 15
      : 134 + (noise - .5) * 32
    const offset = (y * 128 + x) * 4
    data.data[offset] = data.data[offset + 1] = data.data[offset + 2] = grain
    data.data[offset + 3] = 255
  }
  context.putImageData(data, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(kind === 'skin' ? 7 : 4, kind === 'skin' ? 7 : 6)
  return texture
}

function useMaterials() {
  const source = useTexture('/textures/character-head-albedo.png')
  const materials = useMemo(() => {
    const pores = surfaceTexture('skin')
    const weave = surfaceTexture('fabric')
    const skinMap = source.clone()
    skinMap.colorSpace = SRGBColorSpace
    skinMap.offset.set(.34, .015)
    skinMap.repeat.set(.32, .145)
    skinMap.needsUpdate = true
    const skinMaterial = new MeshPhysicalMaterial({ color: '#fff4e9', map: skinMap, roughness: .69, bumpMap: pores, bumpScale: .0012, specularIntensity: .3, clearcoat: .025, clearcoatRoughness: .65 })
    const shirtMaterial = new MeshStandardMaterial({ color: shirt, roughness: .94, bumpMap: weave, bumpScale: .0016 })
    const trouserMaterial = new MeshStandardMaterial({ color: trousers, roughness: .9, bumpMap: weave, bumpScale: .0017 })
    const shoeMaterial = new MeshStandardMaterial({ color: '#16191c', roughness: .48, bumpMap: weave, bumpScale: .0005 })
    return { pores, weave, skinMap, skin: skinMaterial, shirt: shirtMaterial, trousers: trouserMaterial, shoe: shoeMaterial }
  }, [source])
  useEffect(() => () => {
    materials.pores.dispose(); materials.weave.dispose(); materials.skinMap.dispose()
    materials.skin.dispose(); materials.shirt.dispose(); materials.trousers.dispose(); materials.shoe.dispose()
  }, [materials])
  return materials
}
const Materials = createContext<ReturnType<typeof useMaterials> | null>(null)

function Surface({ sections, color, facial = false, map, fabric, material: suppliedMaterial, ...props }: ThreeElements['mesh'] & {
  sections: BodySection[]; color: string; facial?: boolean; map?: Texture; fabric?: 'shirt' | 'trousers'
}) {
  const materials = useContext(Materials)
  const geometry = useMemo(() => createBodyGeometry(sections, facial, facial ? 80 : 32, fabric), [sections, facial, fabric])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = suppliedMaterial ?? (fabric ? materials?.[fabric] : color === skin ? materials?.skin : undefined)
  return <mesh geometry={geometry} material={material} castShadow receiveShadow={!facial && color !== skin} {...props}>
    {!material && (facial
      ? <meshPhysicalMaterial color={color} map={map} roughness={.67} bumpMap={materials?.pores} bumpScale={.0012} specularIntensity={.35} clearcoat={.035} clearcoatRoughness={.55} />
      : <meshStandardMaterial color={color} map={map} roughness={.86} />)}
  </mesh>
}

function Limb({ name, from, to, radii, color, depth = 1, fabric }: {
  name: string; from: Point; to: Point; radii: number[]; color: string; depth?: number; fabric?: 'shirt' | 'trousers'
}) {
  const start = new Vector3(...from)
  const direction = new Vector3(...to).sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
  const sections: BodySection[] = radii.map((radius, index) => [
    direction.length() * index / (radii.length - 1), radius, radius * depth, radius * depth,
  ])
  return <Surface name={name} position={start} quaternion={rotation} sections={sections} color={color} fabric={fabric} />
}

function Curve({ points, radius, color, ...props }: ThreeElements['mesh'] & { points: Point[]; radius: number; color: string }) {
  const materials = useContext(Materials)
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point))), 24, radius, 7, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  const material = color === skin ? materials?.skin : undefined
  return <mesh {...props} geometry={geometry} material={material}>
    {!material && <meshStandardMaterial color={color} roughness={.85} />}
  </mesh>
}

const torso: BodySection[] = [
  [1.65, .302, .167, .158], [1.73, .309, .173, .163],
  [1.94, .301, .182, .169], [2.18, .319, .187, .171],
  [2.43, .357, .199, .168], [2.59, .389, .187, .166],
  [2.65, .397, .164, .152], [2.705, .347, .139, .137], [2.765, .146, .102, .108],
]
const hips: BodySection[] = [
  [1.48, .073, .046, .06], [1.56, .246, .137, .142], [1.65, .302, .152, .156], [1.74, .296, .161, .162],
]
const head: BodySection[] = [
  [-.28, .016, .036, .037, .021], [-.252, .079, .117, .079, .013],
  [-.202, .138, .156, .112], [-.139, .181, .176, .15],
  [-.063, .211, .189, .181], [.018, .217, .19, .199],
  [.108, .213, .183, .201], [.192, .193, .154, .182],
  [.252, .132, .093, .121], [.283, .006, .006, .006],
]

function EyeSurface({ side, map }: { side: -1 | 1; map: Texture }) {
  // The reference eyes retain their texture; a small convex corneal surface supplies depth and light.
  const geometry = useMemo(() => {
    const positions: number[] = []
    const uv: number[] = []
    const indices: number[] = []
    const centerX = side === -1 ? -.12 : .104
    const centerY = side === -1 ? -.001 : .004
    const segments = 32
    const rings = 5
    for (let ring = 0; ring <= rings; ring++) {
      const radius = ring / rings
      for (let point = 0; point <= segments; point++) {
        const angle = point / segments * Math.PI * 2
        const x = centerX + Math.cos(angle) * .043 * radius
        const y = centerY + Math.sin(angle) * .012 * radius
        const cosine = Math.sqrt(Math.max(0, 1 - (x / .217) ** 2))
        const z = cosine * .19 + facialDisplacement(x, y) * cosine ** 3 + .0015 + .004 * (1 - radius ** 2)
        positions.push(x, y, z)
        uv.push(.5 + Math.asin(x / .217) / (Math.PI * 2), (y + .28) / .563)
        if (ring < rings && point < segments) {
          const a = ring * (segments + 1) + point
          const b = a + segments + 1
          indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [side])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh name={`reference-cornea-${side}`} geometry={geometry}>
    <meshPhysicalMaterial map={map} roughness={.3} specularIntensity={.45} clearcoat={.45} clearcoatRoughness={.25} />
  </mesh>
}

function Head({ reducedMotion }: { reducedMotion: boolean }) {
  const materials = useContext(Materials)
  const headRig = useRef<Group>(null)
  const elapsed = useRef(0)
  const { invalidate } = useThree()
  useEffect(() => { elapsed.current = 0; invalidate() }, [invalidate, reducedMotion])
  useFrame((_, delta) => {
    if (!headRig.current) return
    elapsed.current = Math.min(3.6, elapsed.current + Math.min(delta, .05))
    const t = reducedMotion ? 1 : elapsed.current / 3.6
    headRig.current.rotation.set(.009 + Math.sin(t * Math.PI * 2) * .012, -.025 - Math.sin(t * Math.PI) * .045, -.01)
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

  return <group ref={headRig} name="reference-based-head" position={[0, 3.04, -.012]} scale={.86} rotation={[.009, -.025, -.01]}>
    <Surface name="photo-textured-anatomical-face" sections={head} color="#ffffff" facial map={face} />
    <EyeSurface side={-1} map={face} /><EyeSurface side={1} map={face} />
    {([-1, 1] as const).map(side => <group key={side}>
      <mesh name={`ear-${side}`} position={[side * .218, -.061, -.073]} rotation={[0, side * -.2, side * -.09]} scale={[.025, .058, .032]} material={materials?.skin} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh name={`concha-${side}`} position={[side * .231, -.058, -.05]} scale={[.008, .031, .006]}>
        <sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#b68a75" roughness={.77} />
      </mesh>
      <Curve name={`ear-helix-${side}`} points={[[side * .222, -.111, -.056], [side * .24, -.085, -.04], [side * .242, -.044, -.041], [side * .23, -.014, -.055], [side * .217, -.026, -.042]]} radius={.0035} color={skin} />
      <Curve name={`ear-antihelix-${side}`} points={[[side * .233, -.087, -.042], [side * .227, -.067, -.037], [side * .233, -.04, -.042]]} radius={.003} color={skin} />
    </group>)}
    <mesh name="side-swept-brown-hair" geometry={hair} castShadow>
      <meshStandardMaterial map={hairMap} color="#ddd0c2" roughness={.86} bumpMap={hairMap} bumpScale={.0018} />
    </mesh>
  </group>
}

function Ribbon({ points }: { points: Point[] }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
    const positions: number[] = []
    const indices: number[] = []
    curve.getPoints(32).forEach((point, index) => {
      const tangent = curve.getTangent(index / 32)
      const sideways = new Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(.014)
      positions.push(point.x - sideways.x, point.y - sideways.y, point.z, point.x + sideways.x, point.y + sideways.y, point.z)
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
      [side * .102, 2.788, -.042], [side * .119, 2.771, .072], [side * .152, 2.714, .139], [side * .145, 2.63, .191],
      [side * .127, 2.49, .215], [side * .081, 2.252, .217], [side * .035, 2.046, .205],
    ]} />)}
    <RoundedBox args={[.156, .207, .012]} radius={.01} smoothness={2} position={[0, 1.96, .21]} castShadow>
      <meshStandardMaterial color="#ddd6c9" roughness={.85} />
    </RoundedBox>
    <mesh position={[0, 1.96, .217]}><planeGeometry args={[.147, .198]} /><meshStandardMaterial map={badge} roughness={.9} /></mesh>
  </group>
}

function Watch() {
  return <group name="cream-strap-watch" position={[.257, 2.326, .401]} scale={.8} rotation={[.09, -.07, -.15]}>
    <RoundedBox args={[.086, .047, .115]} radius={.014} smoothness={2}><meshStandardMaterial color="#c5c0ae" roughness={.8} /></RoundedBox>
    <mesh position={[0, 0, .064]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.043, .043, .013, 32]} /><meshStandardMaterial color="#d4d1c7" roughness={.24} metalness={.78} /></mesh>
    <mesh position={[0, 0, .072]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.034, .034, .005, 32]} /><meshStandardMaterial color="#101516" roughness={.3} metalness={.2} /></mesh>
    <mesh position={[0, .01, .076]}><boxGeometry args={[.003, .021, .002]} /><meshStandardMaterial color="#e8e6df" /></mesh>
    <mesh position={[.009, 0, .076]}><boxGeometry args={[.02, .003, .002]} /><meshStandardMaterial color="#e8e6df" /></mesh>
  </group>
}

function CrossedArm({ points, radii, name }: { points: Point[]; radii: number[]; name: string }) {
  const materials = useContext(Materials)
  const geometry = useMemo(() => createArmGeometry(points, radii, radii[0] < .025 ? 14 : 48, radii[0] < .025 ? 10 : 24), [points, radii])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh name={name} geometry={geometry} material={materials?.skin} castShadow />
}

export function Character({ reducedMotion = false, ...props }: ThreeElements['group'] & { reducedMotion?: boolean }) {
  const materials = useMaterials()
  return <Materials.Provider value={materials}><group name="photo-inspired-standing-character" {...props}>
    <Surface name="tailored-trouser-waist" sections={hips} color={trousers} fabric="trousers" />
    {([-1, 1] as const).map(side => <group key={`leg-${side}`}>
      <Limb name={`trouser-leg-${side}`} from={[side * .177, 1.665, .012]} to={[side * .218, .203, .014]} radii={[.164, .17, .153, .133, .135, .13, .12]} depth={.91} color={trousers} fabric="trousers" />
      <Curve points={[[side * .319, 1.4, .042], [side * .327, .91, .018], [side * .347, .28, .016]]} radius={.0023} color="#292a2d" />
      <group position={[side * .218, 0, .06]} rotation={[0, side * -.11, 0]}>
        <Surface name={`cream-sneaker-sole-${side}`} color="#c6bea8" sections={[[.009, .106, .244, .111, .04], [.032, .126, .253, .132, .04], [.063, .12, .242, .126, .04]]} />
        <Surface name={`black-leather-sneaker-${side}`} color="#191b1d" material={materials.shoe} sections={[[.057, .119, .235, .119, .038], [.105, .116, .212, .117, .031], [.157, .091, .154, .104, .009], [.204, .072, .075, .074, -.012]]} />
        {[0, 1, 2, 3].map(lace => <Curve key={lace} points={[
          [-.067, .164 - lace * .012, .049 + lace * .032], [0, .177 - lace * .012, .052 + lace * .032], [.067, .164 - lace * .012, .049 + lace * .032],
        ]} radius={.004} color="#343436" />)}
      </group>
    </group>)}
    <Surface name="fitted-black-t-shirt" sections={torso} color={shirt} fabric="shirt" />
    <Surface name="anatomical-neck" color={skin} sections={[[2.698, .135, .103, .108, -.035], [2.755, .113, .094, .105, -.034], [2.82, .093, .087, .096, -.027], [2.902, .089, .087, .093, -.022]]} />
    <mesh name="crew-neck-collar" position={[0, 2.763, -.006]} rotation={[Math.PI / 2, 0, 0]} scale={[1, .82, 1]}><torusGeometry args={[.13, .009, 12, 40]} /><meshStandardMaterial color="#25272a" roughness={.96} /></mesh>
    <Curve name="shirt-bottom-hem" points={[[-.27, 1.686, .105], [-.15, 1.673, .155], [0, 1.67, .171], [.15, 1.673, .155], [.27, 1.686, .105]]} radius={.004} color="#242529" />
    <Lanyard />
    {([-1, 1] as const).map(side => <group key={`arm-${side}`}>
      <Limb name={`short-sleeve-${side}`} from={[side * .313, 2.683, -.005]} to={[side * .425, 2.34, .083]} radii={[.031, .11, .145, .135, .123]} depth={.95} color={shirt} fabric="shirt" />
    </group>)}
    <CrossedArm name="continuous-crossed-left-arm" points={[[-.373, 2.55, .006], [-.429, 2.345, .085], [-.45, 2.13, .172], [-.386, 2.125, .241], [-.117, 2.254, .377], [.306, 2.344, .357]]} radii={[.055, .103, .081, .09, .077, .051]} />
    <CrossedArm name="continuous-crossed-right-arm" points={[[.373, 2.55, .006], [.429, 2.345, .085], [.451, 2.132, .172], [.391, 2.104, .247], [.086, 2.163, .389], [-.315, 2.19, .371]]} radii={[.055, .103, .082, .09, .078, .052]} />
    <Surface name="left-hand-on-upper-arm" position={[.349, 2.384, .282]} rotation={[.19, -.3, -.65]} color={skin} sections={[[-.061, .022, .018, .016], [-.045, .048, .023, .018], [.001, .054, .026, .017], [.052, .045, .021, .015], [.068, .026, .013, .012]]} />
    <Surface name="right-hand-tucked-under-arm" position={[-.353, 2.19, .25]} rotation={[.1, .3, .7]} color={skin} sections={[[-.066, .019, .013, .011], [-.037, .041, .026, .02], [.023, .046, .023, .018], [.061, .024, .013, .009]]} />
    {[0, 1, 2, 3].map(finger => <CrossedArm key={finger} name={`resting-left-finger-${finger}`} points={[
      [.312 + finger * .021, 2.395 + finger * .008, .304], [.336 + finger * .018, 2.434 + finger * .005, .264], [.355 + finger * .015, 2.45 - Math.abs(finger - 1) * .008, .23],
    ]} radii={[.0105, .01, .0045]} />)}
    <CrossedArm name="resting-left-thumb" points={[[.301, 2.366, .321], [.284, 2.407, .282], [.302, 2.426, .265]]} radii={[.015, .011, .005]} />
    <Watch />
    <Head reducedMotion={reducedMotion} />
  </group></Materials.Provider>
}
