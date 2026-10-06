import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three'

export type BodySection = [number, number, number, number, number?]

export function createBodyGeometry(sections: BodySection[], facial = false, segments = facial ? 64 : 32) {
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  const rings: BodySection[] = []
  for (let index = 0; index < sections.length - 1; index++) {
    const left = sections[index]
    const right = sections[index + 1]
    const previous = sections[Math.max(0, index - 1)]
    const next = sections[Math.min(sections.length - 1, index + 2)]
    for (let step = 0; step < 5; step++) {
      const t = step / 5
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
        interpolate(1), interpolate(2), interpolate(3), interpolate(4),
      ])
    }
  }
  rings.push(sections[sections.length - 1])
  const minY = sections[0][0]
  const height = sections[sections.length - 1][0] - minY
  const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))

  rings.forEach(([y, width, front, back, offset = 0], ring) => {
    for (let side = 0; side <= segments; side++) {
      const angle = side / segments * Math.PI * 2 - Math.PI
      const cosine = Math.cos(angle)
      const x = Math.sin(angle) * width
      let z = cosine * (cosine >= 0 ? front : back) + offset
      if (facial && cosine > 0) {
        // Continuous nose, eye sockets and cheeks avoid pasted-on primitive facial parts.
        const detail = .033 * gaussian(x, y, 0, .006, .027, .095)
          + .067 * gaussian(x, y, 0, -.079, .034, .035)
          + .014 * gaussian(x, y, 0, -.145, .09, .025)
          - .01 * gaussian(x, y, -.115, -.002, .047, .023)
          - .01 * gaussian(x, y, .115, -.002, .047, .023)
          + .009 * gaussian(x, y, -.135, -.07, .075, .055)
          + .009 * gaussian(x, y, .135, -.07, .075, .055)
        z += detail * cosine ** 3
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
  return geometry
}

export function createArmGeometry(points: [number, number, number][], radii: number[]) {
  const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)))
  const segments = 48
  const sides = 24
  const frames = curve.computeFrenetFrames(segments, false)
  const positions: number[] = []
  const indices: number[] = []
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments
    const center = curve.getPointAt(t)
    const interval = t * (radii.length - 1)
    const index = Math.min(radii.length - 2, Math.floor(interval))
    const radius = radii[index] + (radii[index + 1] - radii[index]) * (interval - index)
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI * 2
      const point = center.clone().addScaledVector(frames.normals[ring], Math.cos(angle) * radius)
        .addScaledVector(frames.binormals[ring], Math.sin(angle) * radius * .94)
      positions.push(point.x, point.y, point.z)
      if (ring < segments && side < sides) {
        const a = ring * (sides + 1) + side
        const b = a + sides + 1
        indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
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
      const fringe = -.108 + .296 * ((front + 1) / 2) ** 1.3
        - .045 * Math.sin(angle) * Math.max(0, front)
      const y = fringe + (.35 - fringe) * t
      const crown = Math.sqrt(Math.max(.000001, 1 - ((y - .055) / .295) ** 2))
      const wave = .005 * Math.sin(angle * 11 + t * 7) * Math.sin(t * Math.PI)
      positions.push(
        Math.sin(angle) * (.233 * crown + wave) - .026 * t ** 2,
        y,
        front * (.219 * crown + wave) - .022,
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
  return geometry
}
