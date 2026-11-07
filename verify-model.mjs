import fs from 'node:fs';
import assert from 'node:assert/strict';
import { NullEngine, Scene, ImportMeshAsync } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
const engine = new NullEngine();
const scene = new Scene(engine);
const bytes = new Uint8Array(fs.readFileSync('public/models/Soldier.glb'));
const loaded = await ImportMeshAsync(bytes, scene, { pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true } } });
for (const name of ['Idle', 'Walk']) assert(loaded.animationGroups.some(g => g.name === name), name);
for (const name of ['RightArm', 'RightForeArm', 'RightUpLeg', 'RightLeg', 'Spine2']) assert(loaded.transformNodes.some(n => n.name === 'mixamorig:' + name), name);
assert(loaded.meshes.some(m => m.getTotalVertices() > 0));
console.log('PASS: actual GLB loads; idle/walk animations and all combat joints exist.');
scene.dispose(); engine.dispose();

