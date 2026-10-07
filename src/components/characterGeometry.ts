import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three'

export type BodySection = [number, number, number, number, number?]

const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))

// Each feature changes the actual surface, so the portrait keeps its volume in profile.
export function facialDisplacement(x: number, y: number) {
  return .023 * gaussian(x, y, 0, .007, .028, .089)
    + .038 * gaussian(x, y, 0, -.078, .034, .033)
    + .01 * gaussian(x, y, -.035, -.09, .024, .02)
    + .01 * gaussian(x, y, .035, -.09, .024, .02)
    - .004 * gaussian(x, y, 0, -.11, .057, .01)
    - .006 * gaussian(x, y, -.118, -.001, .048, .021)
    - .006 * gaussian(x, y, .118, -.001, .048, .021)
    + .004 * gaussian(x, y, -.118, .042, .058, .014)
    + .004 * gaussian(x, y, .118, .042, .058, .014)
    + .013 * gaussian(x, y, -.129, -.067, .073, .059)
    + .013 * gaussian(x, y, .129, -.067, .073, .059)
    + .009 * gaussian(x, y, 0, -.15, .078, .018)
    - .005 * gaussian(x, y, 0, -.132, .079, .007)
    + .01 * gaussian(x, y, 0, -.211, .072, .031)
}

export function createBodyGeometry(sections: BodySection[], facial = false, segments = facial ? 80 : 32, fabric?: 'shirt' | 'trousers') {
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  const rings: BodySection[] = []
  for (let index = 0; index < sections.length - 1; index++) {
    const left = sections[index]
    const right = sections[index + 1]
    const previous = sections[Math.max(0, index - 1)]
    const next = sections[Math.min(sections.length - 1, index + 2)]
    const subdivisions = facial ? 7 : 5
    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions
      const interpolate = (field: number) => {
        const a = left[field] ?? 0
        const b = right[field] ?? 0
        const span = right[0] - left[0]
        const tangentA = ((right[field] ?? 0) - (previous[field] ?? 0)) / (right[0] - previous[0]) * span
        const tangentB = ((next[field] ?? 0) - (left[field] ?? 0)) / (next[0] - left[0]) * span
        return (2 * t ** 3 - 3 * t ** 2 + 1) * a + (t ** 3 - 2 * t ** 2 + t) * tangentA
          + (-2 * t ** 3 + 3 * t ** 2) * b + (t ** 3 - t ** 2) * tangentB
      }
      rings.push([
        left[0] + (right[0] - left[0]) * t,
        Math.max(.002, interpolate(1)), Math.max(.002, interpolate(2)), Math.max(.002, interpolate(3)), interpolate(4),
      ])
    }
  }
  rings.push(sections[sections.length - 1])
  const minY = sections[0][0]
  const height = sections[sections.length - 1][0] - minY
  rings.forEach(([y, width, front, back, offset = 0], ring) => {
    for (let side = 0; side <= segments; side++) {
      const angle = side / segments * Math.PI * 2 - Math.PI
      const cosine = Math.cos(angle)
      let x = Math.sin(angle) * width
      let z = cosine * (cosine >= 0 ? front : back) + offset
      if (facial && cosine > 0) {
        z += facialDisplacement(x, y) * cosine ** 3
      } else if (fabric) {
        // Low amplitude folds keep the silhouette tailored instead of a smooth plastic tube.
        const normalizedY = (y - minY) / height
        const folds = fabric === 'shirt'
          ? .003 * Math.sin(angle * 5 + normalizedY * 17) * (1 - normalizedY) ** 2
            + .0045 * Math.sin(normalizedY * 39 + angle * 1.8) * Math.exp(-(((normalizedY - .15) / .2) ** 2))
          : .004 * Math.sin(angle * 6 + normalizedY * 22) * Math.sin(normalizedY * Math.PI) ** 2
        x += Math.sin(angle) * folds
        z += cosine * folds
      }
      positions.push(x, y, z)
      uv.push(side / segments, (y - minY) / height)
      if (ring < rings.length - 1 && side < segments) {
        const a = ring * (segments + 1) + side
        const b = a + segments + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  })
  for (const ring of [0, rings.length - 1]) {
    const [y, , , , offset = 0] = rings[ring]
    const center = positions.length / 3
    positions.push(0, y, offset)
    uv.push(.5, ring === 0 ? 0 : 1)
    for (let side = 0; side < segments; side++) {
      const a = ring * (segments + 1) + side
      if (ring === 0) indices.push(center, a + 1, a)
      else indices.push(center, a, a + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function createArmGeometry(points: [number, number, number][], radii: number[], segments = 48, sides = 24) {
  const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
  const frames = curve.computeFrenetFrames(segments, false)
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  const lengths = curve.getLengths(240)
  const totalLength = lengths[lengths.length - 1]
  // Radius controls correspond to anatomical landmarks, rather than evenly spaced time.
  const landmarks = points.map((_, index) => lengths[Math.round(index / (points.length - 1) * 240)] / totalLength)
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments
    const center = curve.getPointAt(t)
    let index = 0
    while (index < landmarks.length - 2 && t > landmarks[index + 1]) index++
    const fraction = Math.min(1, Math.max(0, (t - landmarks[index]) / (landmarks[index + 1] - landmarks[index])))
    const smooth = fraction * fraction * (3 - 2 * fraction)
    const radius = radii[index] + (radii[index + 1] - radii[index]) * smooth
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2
      const point = center.clone().addScaledVector(frames.normals[ring], Math.cos(angle) * radius)
        .addScaledVector(frames.binormals[ring], Math.sin(angle) * radius * .94)
      positions.push(point.x, point.y, point.z)
      uv.push(side / sides, t)
      if (ring < segments && side < sides) {
        const a = ring * (sides + 1) + side
        const b = a + sides + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  for (const end of [0, segments]) {
    const center = curve.getPointAt(end / segments)
    const centerIndex = positions.length / 3
    positions.push(center.x, center.y, center.z)
    uv.push(.5, end / segments)
    for (let side = 0; side < sides; side++) {
      const current = end * (sides + 1) + side
      if (end === 0) indices.push(centerIndex, current + 1, current)
      else indices.push(centerIndex, current, current + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function createHairGeometry() {
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  const rings = 24
  const segments = 64
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings
    for (let side = 0; side <= segments; side++) {
      const angle = side / segments * Math.PI * 2 - Math.PI
      const front = Math.cos(angle)
      const fringe = -.085 + .244 * ((front + 1) / 2) ** 1.3
        - .035 * Math.sin(angle) * Math.max(0, front)
      const y = fringe + (.312 - fringe) * t
      const crown = Math.sqrt(Math.max(.000001, 1 - ((y - .029) / .283) ** 2))
      const wave = .003 * Math.sin(angle * 17 + t * 9) * Math.sin(t * Math.PI)
      positions.push(
        Math.sin(angle) * (.252 * crown + wave) - .016 * t ** 2,
        y,
        front * (.239 * crown + wave) - .017,
      )
      uv.push(side / segments, t)
      if (ring < rings && side < segments) {
        const a = ring * (segments + 1) + side
        const b = a + segments + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
