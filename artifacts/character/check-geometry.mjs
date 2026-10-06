import assert from 'node:assert/strict'
import { createArmGeometry, createBodyGeometry, createHairGeometry } from '../../src/components/characterGeometry.ts'
import { Vector3 } from 'three'

const armPoints = [[-.39,2.58,.01],[-.43,2.35,.086],[-.459,2.13,.16],[-.405,2.129,.229],[-.12,2.245,.372],[.304,2.341,.361]]
const arm = createArmGeometry(armPoints,[.103,.097,.08,.093,.074,.052])
const head = createBodyGeometry([[-.28,.016,.036,.037,.021],[-.139,.186,.179,.15],[.018,.223,.195,.201],[.192,.205,.16,.189],[.29,.006,.006,.006]],true)
const hair = createHairGeometry()
for (const geometry of [arm,head,hair]) {
  for (const name of ['position','normal']) assert.ok(Array.from(geometry.getAttribute(name).array).every(Number.isFinite),`${name} values are finite`)
  assert.ok(geometry.index.count>0)
  assert.ok(Math.max(...geometry.index.array)<geometry.getAttribute('position').count,'indices are within mesh')
}
const positions = arm.getAttribute('position')
const normals = arm.getAttribute('normal')
for (const ring of [8,16,24,32,40]) {
  const center = new Vector3()
  for (let side=0;side<24;side++) center.add(new Vector3().fromBufferAttribute(positions,ring*25+side))
  center.divideScalar(24)
  for (let side=0;side<24;side+=3) {
    const index=ring*25+side
    const outward=new Vector3().fromBufferAttribute(positions,index).sub(center)
    assert.ok(outward.dot(new Vector3().fromBufferAttribute(normals,index))>0,'arm normals face outward')
  }
}
assert.ok(Array.from(head.getAttribute('uv').array).every(value=>value>=0&&value<=1),'head UVs fit atlas')
assert.ok(head.boundingBox.max.z>.23,'nose is modeled in actual volume')
for(const geometry of [arm,head,hair])geometry.dispose()
console.log('PASS: finite indexed meshes, outward arm normals, valid face UVs, volumetric nose')
