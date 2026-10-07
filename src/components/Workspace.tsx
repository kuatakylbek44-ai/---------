import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, CatmullRomCurve3, Color, ExtrudeGeometry, Matrix4, Quaternion, RepeatWrapping, Shape, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import type { Group, InstancedMesh, MeshBasicMaterial, Texture } from 'three'
import { Character } from './Character'

type Point = [number, number, number]
const black = '#171a20'
const silver = '#9ca2a8'

// All textures are authored locally. The only device labels are the three supplied by the owner.
function makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function useWorkspaceTextures() {
  const textures = useMemo(() => {
    const wood = makeTexture(1024, 512, ctx => {
      ctx.fillStyle = '#766044'; ctx.fillRect(0, 0, 1024, 512)
      for (let y = 0; y < 512; y++) {
        const grain = Math.sin(y * .73) * 6 + Math.sin(y * .11) * 8 + Math.sin(y * 2.53) * 3
        ctx.strokeStyle = `rgba(${grain > 0 ? '191,155,111' : '36,24,15'},${.13 + Math.abs(grain) * .006})`
        ctx.beginPath()
        for (let x = 0; x <= 1024; x += 8) {
          const offset = Math.sin(x * .007 + y * .014) * 4 + Math.sin(x * .021 + y * .02) * 1.3
          if (x === 0) ctx.moveTo(x, y + offset); else ctx.lineTo(x, y + offset)
        }
        ctx.stroke()
      }
    })
    wood.wrapS = wood.wrapT = RepeatWrapping
    const wallpaper = makeTexture(768, 768, ctx => {
      ctx.fillStyle = '#02050c'; ctx.fillRect(0, 0, 768, 768)
      const haze = ctx.createRadialGradient(395, 385, 5, 384, 410, 300)
      haze.addColorStop(0, '#0c4380'); haze.addColorStop(.5, '#06172f'); haze.addColorStop(1, '#02050c')
      ctx.fillStyle = haze; ctx.fillRect(0, 0, 768, 768)
      // An original blue crowned silhouette, echoing the mood of the photographed screens.
      const robe = ctx.createLinearGradient(250, 350, 530, 650)
      robe.addColorStop(0, '#071c37'); robe.addColorStop(.35, '#1675bc'); robe.addColorStop(.6, '#051b37'); robe.addColorStop(1, '#061225')
      ctx.fillStyle = robe
      ctx.beginPath(); ctx.moveTo(260, 686); ctx.bezierCurveTo(275, 510, 272, 429, 342, 398); ctx.lineTo(422, 398); ctx.bezierCurveTo(502, 422, 507, 576, 533, 686); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#0e3b62'; ctx.beginPath(); ctx.ellipse(382, 349, 50, 64, -.12, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = '#2d9af6'; ctx.shadowBlur = 20
      ctx.strokeStyle = '#59b2ee'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(329, 301); ctx.lineTo(322, 263); ctx.lineTo(345, 282); ctx.lineTo(357, 244); ctx.lineTo(377, 277); ctx.lineTo(393, 236); ctx.lineTo(409, 275); ctx.lineTo(435, 248); ctx.lineTo(430, 301); ctx.closePath(); ctx.stroke()
      ctx.shadowBlur = 9; ctx.strokeStyle = '#397dc3'; ctx.lineWidth = 8; ctx.lineCap = 'round'
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(325 + i * 13, 445); ctx.bezierCurveTo(341 + i * 9, 393, 337 + i * 10, 363, 355 + i * 8, 345); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(451 - i * 12, 447); ctx.bezierCurveTo(423 - i * 8, 397, 418 - i * 8, 373, 402 - i * 8, 358); ctx.stroke()
      }
      ctx.shadowBlur = 0; ctx.strokeStyle = '#2866a1'; ctx.lineWidth = 2
      for (let i = 0; i < 9; i++) {
        ctx.beginPath(); ctx.moveTo(320 + i * 16, 470); ctx.quadraticCurveTo(300 + i * 24, 552, 286 + i * 29, 685); ctx.stroke()
      }
    })
    const rgb = makeTexture(512, 16, ctx => {
      const glow = ctx.createLinearGradient(0, 0, 512, 0)
      ;['#5effa0', '#20ddff', '#5476ff', '#cf44ff', '#ff497b', '#ffd277', '#5effa0'].forEach((color, index) => glow.addColorStop(index / 6, color))
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 512, 16)
    })
    const labels = Object.fromEntries(['USH TANBA', 'SOTSU', 'Lenovo LOQ'].map(label => [label, makeTexture(512, 64, ctx => {
      ctx.clearRect(0, 0, 512, 64); ctx.fillStyle = '#deddda'; ctx.font = '500 39px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, 256, 47)
    })])) as Record<string, Texture>
    const mat = makeTexture(512, 256, ctx => {
      ctx.fillStyle = '#912d3a'; ctx.fillRect(0, 0, 512, 256)
      ctx.strokeStyle = '#35232b'; ctx.lineWidth = 46; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(90, 193); ctx.bezierCurveTo(400, 280, 490, 77, 280, 53); ctx.bezierCurveTo(90, 31, 65, 180, 413, 183); ctx.stroke()
    })
    return { wood, wallpaper, rgb, labels, mat }
  }, [])
  useEffect(() => () => { [textures.wood, textures.wallpaper, textures.rgb, textures.mat, ...Object.values(textures.labels)].forEach(texture => texture.dispose()) }, [textures])
  return textures
}

function Part({ at = [0, 0, 0], size, color = black, metal = 0, radius = .015, ...props }: {
  at?: Point; size: Point; color?: string; metal?: number; radius?: number; rotation?: Point; name?: string
}) {
  return <RoundedBox position={at} args={size} radius={radius} smoothness={2} castShadow receiveShadow {...props}>
    <meshStandardMaterial color={color} roughness={metal ? .43 : .72} metalness={metal} />
  </RoundedBox>
}

function Rod({ from, to, radius = .025, color = black }: { from: Point; to: Point; radius?: number; color?: string }) {
  const start = new Vector3(...from), direction = new Vector3(...to).sub(start)
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
  return <mesh position={start.add(direction.clone().multiplyScalar(.5))} quaternion={orientation} castShadow>
    <cylinderGeometry args={[radius, radius, direction.length(), 10]} /><meshStandardMaterial color={color} metalness={.45} roughness={.5} />
  </mesh>
}

function Cable({ points, color = '#24242a', radius = .009 }: { points: Point[]; color?: string; radius?: number }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(points.map(point => new Vector3(...point))), 28, radius, 5, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.9} /></mesh>
}

function Label({ texture, at, width, rotation = [0, 0, 0] }: { texture: Texture; at: Point; width: number; rotation?: Point }) {
  return <mesh position={at} rotation={rotation}><planeGeometry args={[width, width / 8]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} /></mesh>
}

function Keys({ laptop = false }: { laptop?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const count = laptop ? 70 : 75
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new Matrix4()
    const columns = laptop ? 14 : 15
    for (let i = 0; i < count; i++) {
      const x = (i % columns - (columns - 1) / 2) * (laptop ? .063 : .066)
      const z = (Math.floor(i / columns) - 2) * (laptop ? .05 : .066)
      mesh.setMatrixAt(i, matrix.makeTranslation(x, 0, z))
      mesh.setColorAt(i, new Color(laptop ? '#a7adb4' : ['#eef3f4', '#ddeaf2', '#ece5f5'][i % 3]))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count, laptop])
  return <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
    <boxGeometry args={laptop ? [.054, .012, .039] : [.056, .036, .054]} /><meshStandardMaterial roughness={.68} />
  </instancedMesh>
}

function Display({ width, height, texture, label }: { width: number; height: number; texture: Texture; label?: Texture }) {
  return <group>
    <Part size={[width, height, .065]} radius={.018} />
    <mesh position={[0, .015, .035]}><planeGeometry args={[width - .065, height - .075]} /><meshBasicMaterial map={texture} color="#d5ebff" toneMapped={false} /></mesh>
    {label && <Label texture={label} at={[0, -height / 2 + .023, .039]} width={.22} />}
  </group>
}

function Laptop({ wallpaper, label }: { wallpaper: Texture; label: Texture }) {
  return <group name="Lenovo-LOQ" position={[-.55, 2.01, -.17]}>
    <Part size={[1.13, .055, .78]} color="#858d96" metal={.4} />
    <group position={[0, .037, -.05]}><Keys laptop /></group>
    <Part at={[0, .031, .26]} size={[.32, .008, .16]} color="#a1a7ad" metal={.3} radius={.003} />
    <group position={[0, .46, -.36]} rotation={[-.12, 0, 0]}>
      <Display width={1.12} height={.8} texture={wallpaper} />
      <Label texture={label} at={[0, -.365, .039]} width={.34} />
      <Label texture={label} at={[.24, .24, -.039]} width={.4} rotation={[0, Math.PI, 0]} />
    </group>
    <mesh position={[0, .034, -.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.018, .018, 1.03, 10]} /><meshStandardMaterial color="#b3b8bb" metalness={.6} /></mesh>
  </group>
}

function Fan({ at, rgb, animated }: { at: Point; rgb: Texture; animated: boolean }) {
  const rotor = useRef<Group>(null)
  const halo = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!animated) return
    if (rotor.current) rotor.current.rotation.z -= Math.min(delta, .05) * 2.6
    if (halo.current) halo.current.rotation.z += Math.min(delta, .05) * .22
  })
  return <group position={at}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.214, .214, .025, 32]} /><meshStandardMaterial color="#080a10" /></mesh>
    <group position={[0, 0, .017]}>
      <group ref={halo}><mesh><torusGeometry args={[.195, .018, 8, 48]} /><meshBasicMaterial map={rgb} toneMapped={false} /></mesh></group>
      <group ref={rotor}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} rotation={[0, 0, i * Math.PI * 2 / 7]} position={[0, 0, -.009]}>
        <mesh position={[.098, 0, 0]} rotation={[0, 0, .65]}><boxGeometry args={[.15, .055, .008]} /><meshStandardMaterial color="#434853" metalness={.3} roughness={.5} /></mesh>
      </mesh>)}</group>
      <mesh><circleGeometry args={[.057, 20]} /><meshStandardMaterial color="#252831" metalness={.4} /></mesh>
    </group>
  </group>
}

function Computer({ rgb, animated }: { rgb: Texture; animated: boolean }) {
  return <group name="unbranded-RGB-computer" position={[1.6, .66, .04]}>
    <Part size={[.58, 1.22, .93]} radius={.035} />
    <Part at={[0, 0, .472]} size={[.53, 1.15, .012]} color="#080b12" radius={.015} />
    {[-.37, .0, .37].map(y => <Fan key={y} at={[0, y, .49]} rgb={rgb} animated={animated} />)}
    <mesh position={[-.296, .03, -.04]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[.79, 1.04]} /><meshPhysicalMaterial color="#46556c" transparent opacity={.3} roughness={.12} metalness={.1} depthWrite={false} /></mesh>
    <mesh position={[-.26, .25, -.14]} rotation={[0, -Math.PI / 2, 0]}><torusGeometry args={[.14, .014, 6, 32]} /><meshBasicMaterial map={rgb} /></mesh>
    <Part at={[-.2, -.2, -.03]} size={[.06, .07, .65]} color="#505762" metal={.5} />
    <mesh position={[.16, .617, .3]}><sphereGeometry args={[.012, 8, 6]} /><meshBasicMaterial color="#9bddff" /></mesh>
    {[-.2, .2].map(x => <Part key={x} at={[x, -.637, .28]} size={[.07, .055, .48]} />)}
  </group>
}

function Chair() {
  return <group name="unbranded-chair" position={[-1.65, 0, 1.16]} rotation={[0, Math.PI - .2, 0]}>
    <Part at={[0, .83, 0]} size={[.99, .15, .91]} color="#454945" radius={.07} />
    <Part at={[0, 1.25, -.44]} size={[.95, .83, .12]} color="#454945" radius={.06} rotation={[-.08, 0, 0]} />
    {[-.41, .41].map(x => <group key={x}>
      <Rod from={[x, .83, .33]} to={[x, .08, .4]} radius={.033} color="#9d9da0" />
      <Rod from={[x, .84, -.36]} to={[x, .08, -.45]} radius={.033} color="#9d9da0" />
      <Rod from={[x, .83, -.36]} to={[x, 1.57, -.43]} radius={.026} color="#9d9da0" />
    </group>)}
  </group>
}

function DeskTop({ texture }: { texture: Texture }) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-2.22, -.86); shape.lineTo(2.22, -.86); shape.quadraticCurveTo(2.3, -.86, 2.3, -.78)
    shape.lineTo(2.3, .84); shape.quadraticCurveTo(2.3, .92, 2.22, .92)
    shape.lineTo(.83, .92); shape.quadraticCurveTo(.73, .92, .65, .82)
    shape.lineTo(.45, .65); shape.quadraticCurveTo(.39, .6, .27, .6)
    shape.lineTo(-.65, .6); shape.quadraticCurveTo(-.77, .6, -.86, .66)
    shape.lineTo(-1.22, .87); shape.quadraticCurveTo(-1.3, .92, -1.42, .92)
    shape.lineTo(-2.22, .92); shape.quadraticCurveTo(-2.3, .92, -2.3, .84)
    shape.lineTo(-2.3, -.78); shape.quadraticCurveTo(-2.3, -.86, -2.22, -.86)
    const result = new ExtrudeGeometry(shape, { depth: .085, bevelEnabled: true, bevelSize: .015, bevelThickness: .012, bevelSegments: 2, steps: 1, curveSegments: 8 })
    const uv = result.getAttribute('uv'), pos = result.getAttribute('position')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 2.3) / 4.6, (pos.getY(i) + .86) / 1.78)
    uv.needsUpdate = true
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  // Local shape Y is the front/back axis; extrusion points down from the top surface.
  return <mesh name="USH-TANBA-desk" geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 1.75, 0]} castShadow receiveShadow>
    <meshStandardMaterial map={texture} roughness={.62} />
    <meshStandardMaterial color="#42382e" map={texture} roughness={.72} />
  </mesh>
}

function Lamp() {
  return <group name="overhead-light-bar">
    {[-2.01, 2.01].map(x => <group key={x}>
      <Part at={[x, 1.79, -.64]} size={[.18, .12, .13]} />
      <Rod from={[x, 1.83, -.64]} to={[x * 1.05, 2.6, -.64]} />
      <Rod from={[x * 1.05, 2.6, -.64]} to={[x * .81, 3.49, -.64]} />
      <Rod from={[x * 1.1, 2.6, -.64]} to={[x * .87, 3.47, -.64]} radius={.013} />
      <mesh position={[x * 1.05, 2.6, -.64]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.06, .06, .08, 12]} /><meshStandardMaterial color="#282a2d" /></mesh>
    </group>)}
    <Part at={[0, 3.48, -.64]} size={[3.36, .075, .075]} />
    <mesh position={[0, 3.458, -.591]}><boxGeometry args={[3.18, .035, .009]} /><meshStandardMaterial color="#fffcec" emissive="#fff9dc" emissiveIntensity={3} toneMapped={false} /></mesh>
    <pointLight position={[0, 3.22, -.24]} intensity={2.3} distance={4} color="#fff1d9" />
    <Part at={[1.66, 3.11, -.63]} size={[.06, .66, .012]} color="#54a940" radius={.005} />
    <group position={[.08, 3.6, -.62]} rotation={[0, -.25, .06]}>
      <mesh scale={[.24, .13, .11]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#8c7855" roughness={1} /></mesh>
      <mesh position={[-.19, .08, .025]} scale={[.11, .13, .1]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#958060" roughness={1} /></mesh>
      {[-.22, -.13].map(x => <mesh key={x} position={[x, .027, .099]} scale={[.055, .105, .028]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#514532" /></mesh>)}
      {[-.12, .18].map(x => <mesh key={x} position={[x, -.11, .07]} scale={[.055, .09, .048]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#958060" /></mesh>)}
      <mesh position={[-.215, .083, .12]}><sphereGeometry args={[.018, 8, 6]} /><meshStandardMaterial color="#201c16" /></mesh>
    </group>
  </group>
}

export function Workspace({ animated, reducedMotion }: { animated: boolean; reducedMotion: boolean }) {
  const { wood, wallpaper, rgb, labels, mat } = useWorkspaceTextures()
  const glow = useRef<MeshBasicMaterial>(null)
  const elapsed = useRef(0)
  const { invalidate } = useThree()
  useEffect(() => { invalidate() }, [animated, invalidate])
  useFrame((_, delta) => {
    if (!animated) return
    elapsed.current += Math.min(delta, .05)
    if (glow.current) glow.current.color.setHSL(.54 + Math.sin(elapsed.current * .32) * .13, .6, .67)
    invalidate()
  })
  return <group name="photo-inspired-workspace" position={[-.3, -1.65, 0]}>
    <group name="wood-floor">
      <RoundedBox args={[6.55, .11, 3.7]} radius={.12} smoothness={3} position={[.45, -.075, .15]} receiveShadow><meshStandardMaterial map={wood} color="#7b6957" roughness={.87} /></RoundedBox>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[.45, -.013, -1.43 + i * .38]}><boxGeometry args={[6.33, .002, .008]} /><meshStandardMaterial color="#41392e" /></mesh>)}
    </group>
    <DeskTop texture={wood} />
    <Label texture={labels['USH TANBA']} at={[1.49, 1.685, .943]} width={.6} />
    {[-2.06, 2.06].map(x => <group key={x}>
      {[-.65, .7].map(z => <Part key={z} at={[x, .83, z]} size={[.075, 1.63, .075]} metal={.4} />)}
      <Part at={[x, .06, .025]} size={[.11, .07, 1.57]} metal={.4} />
      <Part at={[x, 1.59, .025]} size={[.1, .08, 1.55]} metal={.4} />
    </group>)}
    <Part at={[0, 1.54, -.64]} size={[4.18, .08, .07]} metal={.4} />
    <Part at={[-1.03, 1.97, -.18]} size={[2.43, .058, .92]} radius={.018} />
    {[-2.12, .05].map(x => <Part key={x} at={[x, 1.86, -.18]} size={[.033, .22, .84]} rotation={[0, 0, -.16]} />)}
    <group name="SOTSU-portrait-monitor" position={[-1.75, 2.56, -.25]} rotation={[0, .09, -.055]}>
      <Display width={.68} height={1.13} texture={wallpaper} label={labels.SOTSU} />
      <Rod from={[0, -.53, -.025]} to={[.05, -.6, -.21]} radius={.016} />
    </group>
    <Laptop wallpaper={wallpaper} label={labels['Lenovo LOQ']} />
    <group name="unbranded-landscape-monitor" position={[1.14, 2.56, -.48]} rotation={[0, -.08, 0]}>
      <Display width={1.86} height={1.08} texture={wallpaper} />
      <Part at={[0, -.55, .002]} size={[1.82, .035, .072]} color={silver} metal={.65} radius={.005} />
      <Part at={[0, -.69, -.025]} size={[.045, .33, .045]} color={silver} metal={.65} />
      <Rod from={[0, -.82, -.02]} to={[-.46, -.83, .23]} radius={.019} color={silver} />
      <Rod from={[0, -.82, -.02]} to={[.46, -.83, .23]} radius={.019} color={silver} />
      <Part at={[0, .59, .016]} size={[.25, .085, .088]} radius={.038} />
      <mesh position={[.035, .59, .066]}><circleGeometry args={[.019, 16]} /><meshStandardMaterial color="#183d56" metalness={.6} roughness={.17} /></mesh>
      <group name="unbranded-headphones" position={[.98, .17, .02]} rotation={[0, .5, -.15]}>
        <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.175, .026, 8, 24, Math.PI]} /><meshStandardMaterial color="#1c1f25" /></mesh>
        {[-.095, .095].map(z => <Part key={z} at={[0, -.15, z]} size={[.12, .2, .08]} radius={.037} />)}
        <mesh position={[.066, -.19, .095]}><boxGeometry args={[.005, .025, .09]} /><meshBasicMaterial color="#64c9e5" /></mesh>
      </group>
    </group>
    <group name="white-keyboard" position={[-.24, 1.803, .37]} rotation={[0, .015, 0]}>
      <Part size={[1.06, .045, .4]} color="#91969c" metal={.2} />
      <mesh position={[0, -.002, 0]}><boxGeometry args={[1.067, .009, .405]} /><meshBasicMaterial ref={glow} color="#89d5ed" toneMapped={false} /></mesh>
      <group position={[0, .036, 0]}><Keys /></group>
    </group>
    <mesh position={[1.27, 1.772, .41]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.57, .67]} /><meshStandardMaterial map={mat} roughness={.97} /></mesh>
    <group name="white-mouse" position={[1.26, 1.814, .4]} rotation={[0, -.1, 0]}>
      <mesh scale={[.098, .051, .155]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#e6e7e5" roughness={.5} /></mesh>
      <Part at={[0, .046, -.035]} size={[.018, .009, .045]} color="#303138" radius={.004} />
    </group>
    <group name="black-bottle" position={[-2.12, 1.76, .26]}>
      <mesh position={[0, .24, 0]} castShadow><cylinderGeometry args={[.065, .09, .42, 20]} /><meshStandardMaterial color="#121719" metalness={.38} roughness={.32} /></mesh>
      <mesh position={[0, .48, 0]}><cylinderGeometry args={[.052, .038, .1, 16]} /><meshStandardMaterial color="#242a2d" metalness={.6} roughness={.4} /></mesh>
    </group>
    <group name="watch-on-stand" position={[-1.13, 1.8, .47]} rotation={[-.3, 0, 0]}>
      <Part at={[0, 0, 0]} size={[.19, .05, .2]} />
      <mesh position={[0, .13, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.089, .016, 8, 20]} /><meshStandardMaterial color="#1b1e20" /></mesh>
      <mesh position={[0, .19, .045]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.06, .06, .023, 20]} /><meshStandardMaterial color="#4e5459" metalness={.8} /></mesh>
      <mesh position={[0, .205, .058]}><circleGeometry args={[.047, 20]} /><meshStandardMaterial color="#060d13" roughness={.2} /></mesh>
    </group>
    <Lamp />
    <Computer rgb={rgb} animated={animated} />
    <Chair />
    <group name="unbranded-floor-heater" position={[-.21, .33, -.31]}>
      <Part size={[.47, .59, .29]} color="#d8d3c3" radius={.045} />
      <mesh position={[0, -.04, .151]}><circleGeometry args={[.171, 24]} /><meshStandardMaterial color="#928d7e" /></mesh>
      {Array.from({ length: 9 }, (_, i) => <Part key={i} at={[-.16 + i * .04, -.04, .157]} size={[.008, .29, .008]} color="#d5cfbd" radius={.003} />)}
      {[0, 1, 2].map(i => <mesh key={i} position={[-.07 + i * .07, .19, .153]}><circleGeometry args={[.015, 8]} /><meshStandardMaterial color="#565349" /></mesh>)}
    </group>
    <Cable points={[[1.17, 2.1, -.51], [1.23, 1.7, -.65], [.87, 1.27, -.66], [1.06, .63, -.63], [1.55, .13, -.25]]} />
    <Cable points={[[.01, 2.03, -.5], [.17, 1.83, -.69], [.61, 1.67, -.75], [.39, .9, -.73], [.9, .39, -.5], [1.57, .24, -.32]]} />
    <Cable points={[[1.8, .28, -.41], [1.06, .06, -.69], [.16, .06, -.77], [-.28, .14, -.48]]} color="#cec8b6" />
    <Character position={[2.87, .015, -.31]} rotation={[0, -.12, 0]} reducedMotion={reducedMotion || !animated} />
  </group>
}
