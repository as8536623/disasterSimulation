<script setup>
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/inspector';
import 'babylonjs-loaders';
import '@babylonjs/materials';

import imgFlare from '/flare.png';

import { ref, onMounted, onUnmounted } from 'vue';

const renderCanvas = ref(null);
let engine;
let scene;
let particleSystem = [];

//水渲染效果对象
let fluidRenderer;

let startPoint,endPoint;

const loadGLBFiles = (scene, files) => {
  return Promise.all(files.map(file => {
    let objects = BABYLON.SceneLoader.AppendAsync('/models/', file.url, scene,);
    if(file.onReady){
      file.onReady(objects)
    }

    return objects;
  }));
};

const config = {
  models:[
    {name: '地上', url: 'GCZTD2.glb',rayNames:[],rayObjs:[],rayLabels:{}},
    {name: '地下', url: 'GCZTDDX3.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:()=>{}},
    //{name: '塌方', url: 't2.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:()=>{}},
  ],
  options:{
    deviceMinDis:65,
    heightThreshold:-30,
    heightThreshold2:60
  }
}
const status = {
  loaded:0,
}

function onResize(){
  engine.resize();
}

function onTestClick(){
  const pickResult = scene.pick(scene.pointerX,scene.pointerY);
  console.log(pickResult);
  if(pickResult.hit){

    const point = pickResult.pickedPoint;
    if(!startPoint){
      startPoint = point;
      const box = BABYLON.MeshBuilder.CreateBox("box", { size: 100 }, scene);
      box.position = point;
    }else if(!endPoint){
      endPoint = point;
      const box = BABYLON.MeshBuilder.CreateBox("box", { size: 100 }, scene);
      box.position = point;
    }

    if(startPoint && endPoint){
      createTestWater();
      startPoint = undefined;
      endPoint = undefined;
    }
  }
}

function createTestWater(){
  const emitterNode = new BABYLON.TransformNode("emitterNode", scene);

  // Create particle system
  const particleSystem = new BABYLON.ParticleSystem("particles", 1000, scene);
  particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
  particleSystem.emitter = emitterNode;
  particleSystem.minEmitBox = new BABYLON.Vector3(-300, 0, -300);
  particleSystem.maxEmitBox = new BABYLON.Vector3(300, 0, 300);
/*  particleSystem.minEmitBox = startPoint;
  particleSystem.maxEmitBox = endPoint;*/

  particleSystem.color1 = new BABYLON.Color4(0.0, 0.5, 1.0, 1.0);
  particleSystem.color2 = new BABYLON.Color4(0.0, 0.5, 1.0, 1.0);
  particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
  particleSystem.minSize = 20;
  particleSystem.maxSize = 100;
  particleSystem.minLifeTime = 2.0;
  particleSystem.maxLifeTime = 3.0;
  particleSystem.emitRate = 500;
  particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
  particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
  particleSystem.direction1 = new BABYLON.Vector3(-1, -2, -1);
  particleSystem.direction2 = new BABYLON.Vector3(1, -2, 1);
  particleSystem.minEmitPower = 1;
  particleSystem.maxEmitPower = 3;

  particleSystem.updateFunction = function(particles) {

    for (let index = 0; index < particles.length; index++) {
      var particle = particles[index];
      particle.age += this._scaledUpdateSpeed;

      if (particle.age >= particle.lifeTime) {
        // Recycle
        particles.splice(index, 1);
        this._stockParticles.push(particle);
        index--;
        continue;
      }
    }

  };

  // Start particle system
  particleSystem.start();

  fluidRenderer.addParticleSystem(particleSystem);

  const center = BABYLON.Vector3.Center(startPoint, endPoint);
  console.log(center);
  center.y += 40;
  emitterNode.position = center;
}

onMounted(()=>{
  const canvas = renderCanvas.value;
  engine = new BABYLON.Engine(canvas, true);
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  fluidRenderer = scene.enableFluidRenderer();

  // 创建相机并调整位置
  const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 4, 10, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.panningSensibility = 2;
  //camera.panningSensibility = 1000;

  // 添加一个光源
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
  light.intensity = 1.0;

  let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
  // 加载一组GLB文件
  loadGLBFiles(scene, config.models).then((models) => {
    console.log(models);
    // 调整相机的位置以适应场景
/*    scene.createDefaultCameraOrLight(true, true, true);
    if (scene.activeCamera) {
      scene.activeCamera.alpha += Math.PI;
      scene.activeCamera.beta = Math.PI / 3;
      scene.activeCamera.radius = 20;
      scene.activeCamera.target = new BABYLON.Vector3(0, 1, 0);
    }*/
    models.forEach((_scene) => {
      _scene.meshes.forEach((mesh) => {
        if (mesh.getBoundingInfo) {
          const boundingInfo = mesh.getBoundingInfo();
          min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
          max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
        }
      })

    });

    const center = BABYLON.Vector3.Center(min, max);
    const radius = BABYLON.Vector3.Distance(min, max) / 2;


    scene.createDefaultCameraOrLight(true, true, true);
    if (scene.activeCamera) {
      scene.activeCamera.alpha += Math.PI;
      scene.activeCamera.beta = Math.PI / 3;
      scene.activeCamera.radius = radius*1.5;
      scene.activeCamera.target = center;
      scene.activeCamera.panningSensibility  = 2;

      console.log(camera === scene.activeCamera);
    }
  });

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('click', onTestClick);
});

onUnmounted(()=>{

  window.removeEventListener('resize', onResize);
  window.removeEventListener('click', onTestClick);

  if (scene) {
    scene.dispose();
  }

  if (engine) {
    engine.stopRenderLoop();
    engine.dispose();
  }

});


</script>

<template>
  <div class="babylon-container">
    <canvas ref="renderCanvas"></canvas>
  </div>
</template>

<style scoped>

  .babylon-container {
    position: absolute;
    left:0;
    top:0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    overflow: hidden;

    canvas{
      width: 100vw;
      height: 100vh;
    }
  }

</style>