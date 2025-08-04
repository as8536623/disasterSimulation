<template>
<!--  <div ref="container" class="three-container" @mousemove="onContainerMouseMove" @click="onContainerClick"></div>-->
  <div ref="container" class="three-container"></div>
  <div class="tools" v-if="false">
<!--    <el-button @click.stop="doTest2">基础测试</el-button>-->
    <el-switch
        v-model="isAuto"
        inline-prompt
        active-text="自动"
        inactive-text="手动"
    />
    <el-select v-show="!isAuto" v-model="disasterType" style="width:200px;margin-left:20px;margin-right:20px;">
      <el-option :value="1" label="火灾"></el-option>
      <el-option :value="2" label="瓦斯"></el-option>
      <el-option :value="3" label="粉尘"></el-option>
      <el-option :value="5" label="塌方"></el-option>
      <el-option :value="4" label="渗水"></el-option>
      <el-option :value="6" label="墙壁渗水"></el-option>
      <el-option :value="7" label="冲击地压"></el-option>
    </el-select>
    <el-button v-show="!isAuto" type="danger" @click.stop="doTest3">创建灾难</el-button>
    <el-button v-show="!isAuto" type="danger" @click.stop="expandingDisaster">扩大灾难</el-button>
    <el-button v-show="!isAuto" type="danger" @click.stop="doExplodeTest">创建爆炸(点燃瓦斯专用)</el-button>

    <el-select v-show="isAuto" v-model="disasterAutoType" style="width:200px;margin-left:20px;margin-right:20px;">
      <el-option :value="1" label="火灾蔓延"></el-option>
      <el-option :value="6" label="火灾蔓延及瓦斯蔓延"></el-option>
      <el-option :value="2" label="瓦斯蔓延及明火爆炸"></el-option>
      <el-option :value="3" label="粉尘蔓延及粉尘爆炸"></el-option>
      <el-option :value="4" label="塌方"></el-option>
      <el-option :value="5" label="渗水蔓延"></el-option>
      <el-option :value="7" label="冲击地压"></el-option>
    </el-select>
    <el-button v-show="isAuto" type="primary" @click="doPlayOrPause">{{playing?'暂停':'播放'}}</el-button>

    <el-button type="success" @click.stop="doTest4">创建线路</el-button>
    <el-button @click.stop="playing = true;doTest5()">清除测试结果</el-button>
  </div>

  <div class="mask" v-if="loading">
    <div class="loader"></div>
    <div class="text">{{loadposs}}</div>
  </div>

  <div class="switch">
    <div :class="disasterAutoType === 5?'selected button':'button'" @click = "doBtnZH(5)">水害模拟<div></div></div>
    <div :class="disasterAutoType === 1?'selected button':'button'" @click = "doBtnZH(1)">火灾模拟<div></div></div>
    <div :class="disasterAutoType === 2?'selected button':'button'" class="button" @click = "doBtnZH(2)">瓦斯爆炸<div></div></div>
    <div :class="disasterAutoType === 3?'selected button':'button'" class="button" @click = "doBtnZH(3)">粉尘爆炸<div></div></div>
    <div :class="disasterAutoType === 4?'selected button':'button'" class="button" @click = "doBtnZH(4)">顶板塌陷<div></div></div>
    <div :class="disasterAutoType === 7?'selected button':'button'" class="button" @click = "doBtnZH(7)">冲击地压<div></div></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import {OrbitControls} from "three/addons";
import {GLTFLoader} from "three/addons";
import {RoomEnvironment} from "three/addons";
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import Proton from "three.proton.js";
import { Water } from "three/addons/objects/Water2.js";
//import {Water} from "@/components/libs/Water.js";
import {Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
  REVERSE_SUBTRACTION,
  INTERSECTION,
  DIFFERENCE,
  HOLLOW_SUBTRACTION,
  HOLLOW_INTERSECTION
} from "three-bvh-csg";
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import QuickHull from 'quickhull3d';

import * as YUKA from '@/components/libs/yuka.module.js'
/*import YUKA from 'yuka';*/

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';



import {createConvexRegionHelper} from '@/components/libs/NavMeshHelper.js';
import { createGraphHelper } from '@/components/libs/GraphHelper.js';

import { ElMessage } from 'element-plus';

import {findNearestPoint} from "@/components/Math/findNearestPoint.js";
import {
  getThreePoints,
  getYUKAPoints,
  destroyCSS2DObject,
  getMinimumBoundingRectangle,
  getEulerRotation,
  getEulerRotation2,
  findClosestPointOnBoundary,
  getYUKAPoint, getThreePoint
} from "@/components/Math/GeneralMethods.js";

import TWEEN from "three/addons/libs/tween.module.js";

import {createWater2Material,water3Material} from "@/components/shaderMaterials/Water1.js";
import {Drama} from "@/components/Class/Drama.js";


import imgLine0 from '/line-0.png';
import imgP0 from '/p-0.png';
import imgP1 from '/p-1.png';
import imgS1 from '/textures/smoke1.png'
import imgS2 from '/textures/smoke2.png'
import imgS3 from '/textures/smoke3.png'

import bm from '/public/bottom.png';
import {createElementNS} from "three/src/utils.js";
/*import WebGPURenderer from "three/src/renderers/webgpu/WebGPURenderer.js";
import {color, PostProcessing} from "three/tsl";*/

const isAuto = ref(true);
const base = '.';



const config = {
  models:[
      {name: '地上', url: base+'/models/dm.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:onDSReady},
      {name: '地下', url: base+'/models/2_3.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:onDXReady},
      {name: '测试', url: base+'/models/test2.glb',rayNames:[],rayObjs:[],rayLabels:{}},
      {name: '塌方', url: base+'/models/t2.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:onTFReady},
      {name: '寻路模型测试', url: base+'/0_9.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:onXLReady},
  ],
  options:{
    deviceMinDis:65,
    heightThreshold:-30,
    heightThreshold2:60,
    EPSILON:1e-6
  }
}
const status = {
  loaded:0,
  ups:[]
}
const loading = ref(true);
const loadposs = ref('0%');



// 创建一个空的顶点数组
const waterMessage = {
  vertices:[],
  indices:[],
  vertexMap: new Map(),
  lastQuad: [],
  brushes: [],
  sceneBox:undefined,
  waterBrush:undefined,
  edgeLine:undefined,
  csgEvaluator:undefined,
  resultObject:undefined
};
let water2Material;


//用于管理粒子发射器的数组
let emitters = [];

//animateObject,用于销毁动画对象
let ao;

const container = ref(null);
let wWidth = 0;
let wHeight = 0;

let renderer, scene, camera, controls,raycaster, mouse,labelRenderer;
let particleTexture,particleTexture1,lineTexture,textureLoader;
let proton,particleMaterial,particleMaterial1,protonSR,protonGroup;
let particleSmokeMaterial1,particleSmokeMaterial2,particleSmokeMaterial3;
let lineGroup;
let loader;
let composer, effectFXAA, outlinePass;

//模型动画相关
let mixer;
const clock = new THREE.Clock();

//塌方灾害相关
let TFScene,TFAnimates;
let mixerTFS = {};
let TFGroup;

//寻路相关
let entityManager,yukaLoader,time,vehicle,navMesh,navMeshGroup,graphHelper,navEdgeVectors;
const nodes = [];
const edges = [];
const threeNodes = [];
let graph;
let tree;

//灾害对象
let disasters= [];
//找到的瓦斯爆炸点
let explodeCenter;

//所有摄像头对象和所有传感器对象
let cameraModels = [];
let sensorModels = [];
let devicesInDisasters =[];






//todo-- 测试相关公共对象====================================================================
let testPoints = [];
let sp,ep;
const disasterType = ref(1);
const disasterAutoType = ref(-1);
const playing = ref(false);
let drama;
//todo-- ===========================================================================

//创建地面
function initBottom(){
  const geo = new THREE.PlaneGeometry(80000,80000);
  const tex = new THREE.TextureLoader().load(bm);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.x = 100;
  tex.repeat.y = 100;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    reflectivity:0.46,
    ior:1.45,
    roughness:0.75,
    metalness:0.5,
    transparent: true,
    map: tex,
    opacity:1
  })

  let mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.y = -550;


  scene.add(mesh);
  scene.fog = new THREE.Fog(0x081014,0.1,40000);
  scene.background = new THREE.Color(0x081014);
}

//地上模型读取完成处理
function onDSReady(gltf){
  const scene = gltf.scene;
  scene.position.set(13787.358,1318.934,-3146.120);
}

//地下模型完成读取时调用的方法
function onDXReady(gltf){
  let selectedObjects =[];
  let scene = gltf.scene;
  let ups = status.ups;
  ups.length = 0;

  scene.traverse((c)=>{
    if(c.name.indexOf('camera')>-1){
      let worldPosition = new THREE.Vector3();
      c.getWorldPosition(worldPosition);
      c.userData.wp = worldPosition;
      c.userData.scale = c.scale.clone();
      c.material = c.material.clone();
      cameraModels.push(c);

      selectedObjects.push(c);
    }else if(c.name.indexOf('sensor')>-1){
      let worldPosition = new THREE.Vector3();
      c.getWorldPosition(worldPosition);
      c.userData.wp = worldPosition;
      c.userData.scale = c.scale.clone();
      c.children.map((cc)=>{
        cc.material = cc.material.clone();
      })
      sensorModels.push(c);
    }else if(c.name.indexOf("up")>-1){
      ups.push(c);
    }
  })

  if (gltf.animations && gltf.animations.length) {
    mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  }

  waterMessage.sceneBox = new THREE.Box3();
  waterMessage.sceneBox.setFromObject(gltf.scene);
  console.log(waterMessage.sceneBox);

}

function onTFReady(gltf){
  TFScene = gltf.scene;

  scene.remove(TFScene);

  TFScene.traverse((c)=>{
    if(c.isMesh){
      c.material.depthTest = false;
      c.material.transparent = true;

      c.renderOrder = 999;
    }
  })

  TFAnimates = gltf.animations;
/*  if (gltf.animations && gltf.animations.length) {
    mixer2 = new THREE.AnimationMixer(TFScene);
  }*/
}

function onXLReady(gltf){
  console.log(gltf.scene);

/*  const water = new Water(
      gltf.scene.children[0].geometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( '/textures/water/Water_1_M_Normal.jpg', function ( texture ) {

          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.x = 0.5;
          texture.repeat.y = 0.5;

        } ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
      }
  );

  water.position.y+=150;
  scene.add(water);

  waterMessage.water = water;*/

  //gltf.scene[0].material = water2Material;
  gltf.scene.visible = false;
  let g = gltf.scene.children[0].geometry;
/*  const water = new Water( g, {
    color: 0xffffff,
    scale: 4,
    flowDirection: new THREE.Vector2( 1, 1 ),
    textureWidth: 256,
    textureHeight: 256
  } )
  waterMessage.water = water;*/
  const waterBrush = new Brush( g, water3Material );
  //const waterBrush = new Brush(g,water.material);
  //waterBrush.position.y+=40;
  //scene.add(waterBrush);
  waterBrush.updateMatrixWorld();
  waterMessage.waterBrush = waterBrush;




  //let g = gltf.scene.children[0].geometry;

/*  const heartShape = new THREE.Shape();

  const vectors = [];
  const positionAttribute = g.getAttribute('position');
  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positionAttribute, i);
    vectors.push(vertex);


  }*/


/*  let gg = createStackedGeometry(g,100);
  let mesh = new THREE.Mesh( gg,new THREE.MeshBasicMaterial( { color: 0x00ff00 ,depthTest:false,transparent:true,wireframe:true } ) );
  scene.add(mesh);*/
}


//销毁材质方法
function disposeMaterial(material) {
  // 释放材质使用的资源
  if (material.map) material.map.dispose();  // 释放贴图资源
  if (material.lightMap) material.lightMap.dispose();
  if (material.bumpMap) material.bumpMap.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.specularMap) material.specularMap.dispose();
  if (material.envMap) material.envMap.dispose();
  // 检查并释放其他可能的纹理类型...

  material.dispose();  // 释放材质本身
}
//清除场景里所有内容
function clearScene(scene) {
  if(!scene) return;


  // 递归遍历场景中的每一个对象
  scene.traverse(function (object) {
    if (object.isMesh) {  // 如果对象是Mesh
      if (object.geometry) {
        object.geometry.dispose();  // 释放几何体资源
      }

      if (object.material) {
        if (Array.isArray(object.material)) {  // 处理对象有多种材质的情况
          for (const material of object.material) {
            disposeMaterial(material);
          }
        } else {
          disposeMaterial(object.material);  // 释放材质资源
        }
      }
    }
  });

  // 清空场景中的所有对象
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
}

//鼠标拾取对象整理
function doRayObjs(obj,model){
  let rn = model.rayNames;
  model.rayObjs = [];
  model.rayLabels = {};

  obj.traverse((o)=>{
    if(o.isMesh){
      rn.map((r)=>{
        if(o.name === r){
          model.rayObjs.push(o);
          o.userData.label = createLabelObj(r,o);
        }
      })
    }
  });
}

function createLabelObj(name,obj){
  const div = document.createElement( 'div' );
  div.className = 'label';
  div.id = name;
  div.innerHTML =
        '<div class="title">设备</div>' +
        '<div class="story">' +
          '<div class="item">电压：10V</div>' +
          '<div class="item">电流：10A</div>' +
        '</div>';

  const label = new CSS2DObject( div );
  label.position.set( 0, 0, 0 );
  label.center.set( 0.5, 1 );
  obj.add( label );

  label.visible = false;

  return label;
}

//获取任意节点的包围盒和包围球
function getRS(model){
  let box3=new THREE.Box3().setFromObject(model);
  let sphere = new THREE.Sphere();
  box3.getBoundingSphere(sphere);

  return {
    box:box3,
    sphere:sphere
  }
}

//获取当前场景包围盒和包围球，以此来重置相机
function rePerspective(){

  /*    let box3=new THREE.Box3().setFromObject(scene);
      let sphere = new THREE.Sphere();
      box3.getBoundingSphere(sphere);*/
  let rs = getRS(scene);
  let sphere = rs.sphere;
  let box = rs.box;

  let r = sphere.radius;
  let c = sphere.center;
  camera.position.set(r/2,r/2,r/2);
  controls.target.copy(c);
  controls.update();


  return {sphere,box}
}

//清除所有粒子
function clearEmitters(){
  emitters.forEach(emitter=>{
    emitter.stopEmit();
    emitter.removeAllParticles();
    // 从Proton实例中移除发射器
    proton.removeEmitter(emitter);
    // 销毁发射器
    emitter.destroy();
  });

  clearScene(protonGroup);

  emitters = [];
}

//todo-- 测试用方法，生成灾害路线和以外的避难路线==============================================================================
function doTest2(){
  let mi = 1 + Math.floor(Math.random() * (testPoints.length-2));
  let p = testPoints[mi];

  if(!p) return;

  let p0 = new YUKA.Vector3(testPoints[0].x,testPoints[0].y,testPoints[0].z);
  let p1 = new YUKA.Vector3(p.x,p.y,p.z);
  let p2 = new YUKA.Vector3(testPoints[testPoints.length-1].x,testPoints[testPoints.length-1].y,testPoints[testPoints.length-1].z);

  clearScene(lineGroup)
  clearEmitters();


  let pathRed = navMesh.findPath(p0,p1);
  let pathGreen = navMesh.findPath(p1,p2);

  //createRedLine(pathRed);
  createGreenLine(pathGreen);

}

function doTest3(){

  window.removeEventListener("click",doTest4Click);
  window.removeEventListener('click',doExplodeTestClick);
  window.addEventListener('click',doTest3Click);
  window.addEventListener('mousemove', doMouseMove);

}
function doTest3Click(event){
  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  //const intersects = raycaster.intersectObjects(config.models[0].rayObjs);
  const intersects = raycaster.intersectObject(navMeshGroup);

  if (intersects.length > 0) {
    // 可以在这里添加对交点对象的处理逻辑，比如高亮显示、弹出信息等
    if(!sp){
      sp = intersects[0].point.clone();
    }else if(!ep){
      ep = intersects[0].point.clone();


      console.log(sp,ep);

      let path = navMesh.findPath(new YUKA.Vector3(sp.x,sp.y,sp.z),new YUKA.Vector3(ep.x,ep.y,ep.z));

      if(!path.length){
        sp = null;
        ep = null;
        window.removeEventListener('click', doTest3Click);
        window.removeEventListener('mousemove', doMouseMove);
        renderer.domElement.style.cursor = 'default';
        return;
      }


      // 计算包围盒
      const boundingBox = new THREE.Box3().setFromPoints(path);
      // 从包围盒获取包围球
      const boundingSphere = new THREE.Sphere();
      boundingBox.getBoundingSphere(boundingSphere);

      const size = new THREE.Vector3();
      boundingBox.getSize(size);


      let type = disasterType.value
      //如果灾难是瓦斯，则判断周围有没有火灾，有则当前灾难改为火灾
      if(disasterType.value === 2){
        for(let i=0; i<disasters.length; i++){
          let d = disasters[i];
          if(boundingBox.intersectsBox(d.bb)||isAdjacent(boundingBox,d.bb)){
            type = 1;
            doExplode(boundingSphere.center);
          }
        }
      }else if(disasterType.value === 1){
        //如果创建的灾难是火灾，则点燃重合的瓦斯
        let center;
        for(let i=0; i<disasters.length; i++){
          let d = disasters[i];
          if(d.type === 2){
            if(boundingBox.intersectsBox(d.bb)||isAdjacent(boundingBox,d.bb)){
              d.type = 1;
              doExplode(d.bs.center);
              center = d.bs.center;
            }
          }
        }

        if(center){
          igniteWS(center);
        }
      }


      disasters.push({
        sp:sp.clone(),
        ep:ep.clone(),
        bs:boundingSphere,
        bb:boundingBox,
        path:path,
        type:type
      })

      //createRedLine(path,type,size,boundingSphere.center);


/*      let mesh = new THREE.Mesh(new THREE.SphereGeometry(boundingSphere.radius),new THREE.MeshBasicMaterial({color:0xff0000,wireframe:true,transparent:true}));
      mesh.position.copy(boundingSphere.center);
      lineGroup.add(mesh);*/

      sp = null;
      ep = null;
      window.removeEventListener('click', doTest3Click);
      window.removeEventListener('mousemove', doMouseMove);
      renderer.domElement.style.cursor = 'default';

      updateAllDisasters();
      //getPathByAllDisasters();
      //updateAllDevices();
    }
  }
}

function createRootDisaster(sp,ep,type,delay = 0){
  let path = navMesh.findPath(new YUKA.Vector3(sp.x,sp.y,sp.z),new YUKA.Vector3(ep.x,ep.y,ep.z));

  if(!path.length) return;

  // 计算包围盒
  const boundingBox = new THREE.Box3().setFromPoints(path);
  // 从包围盒获取包围球
  const boundingSphere = new THREE.Sphere();
  boundingBox.getBoundingSphere(boundingSphere);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);


  //如果灾难是瓦斯，则判断周围有没有火灾，有则当前灾难改为火灾
  if(type === 2){
    for(let i=0; i<disasters.length; i++){
      let d = disasters[i];
      if(boundingBox.intersectsBox(d.bb)||isAdjacent(boundingBox,d.bb)){
        type = 1;
        doExplode(boundingSphere.center);
      }
    }
  }else if(type === 1){
    //如果创建的灾难是火灾，则点燃重合的瓦斯
    let center;
    for(let i=0; i<disasters.length; i++){
      let d = disasters[i];
      if(d.type === 2){
        if(boundingBox.intersectsBox(d.bb)||isAdjacent(boundingBox,d.bb)){
          d.type = 1;
          doExplode(d.bs.center);
          center = d.bs.center;
        }
      }
    }

    //如果发现
    if(center){
      igniteWS(center);
    }
  }

  disasters.push({
    sp:sp.clone(),
    ep:ep.clone(),
    bs:boundingSphere,
    bb:boundingBox,
    path:path,
    type:type
  });

  setTimeout(()=>{
    updateAllDisasters();
    /*getPathByAllDisasters();
    updateAllDevices();*/
  },delay)



}

function doTest4(){
  window.removeEventListener("click",doTest3Click);
  window.removeEventListener('click',doExplodeTestClick);
  window.addEventListener('click', doTest4Click);
  window.addEventListener('mousemove', doMouseMove);
}
function doTest4Click(event){
  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  //const intersects = raycaster.intersectObjects(config.models[0].rayObjs);
  const intersects = raycaster.intersectObject(navMeshGroup);

  if (intersects.length > 0) {
    const sp = intersects[0].point;

    createPathLine(sp);

    window.removeEventListener('click', doTest4Click);
    window.removeEventListener('mousemove', doMouseMove);
    renderer.domElement.style.cursor = 'default';

  }
}
function doTest7(){
  if(!playing.value){
    drama.play();
    doTest5();
  }
}
function doTest5(){

  waterMessage.vertices = [];
  waterMessage.indices = [];

  upsShowOrHide(true);

  if(playing.value){
    if(drama){
      drama.stop();
      drama.destroy();
      drama = null;
    }
    playing.value = false;
  }

  for(let id in mixerTFS){
    let mixer = mixerTFS[id];

    mixer.stopAllAction()
    mixer._actions.forEach(action => {
      action.stop();
      mixer.uncacheAction(action._clip, action._localRoot);
    });

    mixer._actions = [];
    mixerTFS[id] = null;
    delete mixerTFS[id];
  }

  clearBrushes();

  clearScene(TFGroup);

  clearScene(lineGroup);
  clearEmitters();
  disasters = [];

  clearAllLabels();

  sp = null;
  ep = null;
  window.removeEventListener('click', doTest4Click);
  window.removeEventListener('click', doTest3Click);
  window.removeEventListener('click',doExplodeTestClick);
  window.removeEventListener('mousemove', doMouseMove);
  renderer.domElement.style.cursor = 'default';

  resetAllDevices();

}

function doMouseMove(event){
  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  const intersects = raycaster.intersectObject(navMeshGroup);

  if (intersects.length > 0) {
    renderer.domElement.style.cursor = 'pointer';
  }else{
    renderer.domElement.style.cursor = 'default';
  }
}

function doTest6(ph){
  const path = new YUKA.Path();

  ph.map((p)=>{
    path.add(p);
  })

  let d=calculateTotalLength(ph);

/*  path.add( new YUKA.Vector3(-400, 0, 400));
  path.add( new YUKA.Vector3(-600, 0, 0));
  path.add( new YUKA.Vector3(-400, 0, -400));
  path.add( new YUKA.Vector3(4, 0, -400));
  path.add( new YUKA.Vector3(6, 0, 0));
  path.add( new YUKA.Vector3(4, 0, 400));
  path.add( new YUKA.Vector3(0, 0, 600));*/

  path.loop = true;

  vehicle.position.copy(path.current());

  let speed = d/100;
  console.log(speed);
  vehicle.maxSpeed = speed;
  vehicle.minSpeed = speed;

  const followPathBehavior = new YUKA.FollowPathBehavior(path, 1);
  vehicle.steering.add(followPathBehavior);

  const onPathBehavior = new YUKA.OnPathBehavior(path);
  onPathBehavior.radius = 2;
  vehicle.steering.add(onPathBehavior);
}

function doExplodeTest(){
  window.removeEventListener("click",doTest3Click);
  window.removeEventListener("click",doTest4Click);

  window.addEventListener('click', doExplodeTestClick);
  window.addEventListener('mousemove', doMouseMove);
}

function doExplodeTestClick(event){
  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  //const intersects = raycaster.intersectObjects(config.models[0].rayObjs);
  const intersects = raycaster.intersectObject(navMeshGroup);

  if (intersects.length > 0) {
    let point = intersects[0].point;

    doExplode(point);
    igniteWS(point);
  }

  window.removeEventListener('click', doExplodeTestClick);
  window.removeEventListener('mousemove', doMouseMove);
}

function doPlayOrPause(){

  if(!playing.value){
    if(drama){
      if(disasterAutoType.value === drama.type){
        drama.play();
      }else{
        drama.destroy();
        drama = null;

        drama = createDramaByType();
        drama.play();
      }
    }else{
      drama = createDramaByType();
      drama.play();
    }

    playing.value = true;
  }else{
    drama.pause();

    playing.value = false;
  }

}

function doBtnZH(type){
  doTest5();
  disasterAutoType.value = type;
  doPlayOrPause();
}

function createDramaByType(){

  switch (disasterAutoType.value){
    case 1:{//火灾演示
      let d = new Drama(()=>{
        doTest5();

        doMoveCamera(
            new THREE.Vector3(6273.000579565883, 6273.000579565884, 6273.000579565886),
            new THREE.Vector3(10109.932845156862, 918.4428499191345, -3488.241327030576)
        );
        createRootDisaster(
            new THREE.Vector3(
                8137.492357181393,-247.0313450083545,-2038.9627149598273
            ),
            new THREE.Vector3(
                8247.722595436177, -244.2545026081334, -2052.748599502659
            ),
            1
        );
      },expandingDisaster,disasterAutoType.value,1000,1000*5);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        createPathLine(new THREE.Vector3(10575.622933062108,-243.15966267963267,-2064.7526100137675),false);
      });
      d.on("update",(time,frameIndex,frameLength)=>{
      });

      return d;
    }
    case 6:{
      let d = new Drama(()=>{
        doTest5();
        createRootDisaster(
            new THREE.Vector3(
                -237.6604037909018,
                136.4141281431348,
                -408.03745109245847
            ),
            new THREE.Vector3(
                -83.75441885361954,
                136.59642527156484,
                32.27803578185922
            ),
            1
        )
        createRootDisaster(
            new THREE.Vector3(
                -149.28367735140273,
                -363.5317403803383,
                -2556.8345100251663
            ),
            new THREE.Vector3(
                595.0308882950767,
                -362.6497677514835,
                -2205.698932097921
            ),
            2
        )
      },expandingDisaster,disasterAutoType.value,1000,1000*40);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;
      });
      d.on("update",(time)=>{
        console.log(time)
      });

      return d;
    }
    case 2:{//瓦斯爆炸演示
      let d = new Drama(()=>{
        doTest5();
        doMoveCamera(
            new THREE.Vector3(6273.000579565883, 6273.000579565884, 6273.000579565886),
            new THREE.Vector3(10109.932845156862, 918.4428499191345, -3488.241327030576)
        );
        createRootDisaster(
            new THREE.Vector3(
                8137.492357181393,-247.0313450083545,-2038.9627149598273
            ),
            new THREE.Vector3(
                8247.722595436177, -244.2545026081334, -2052.748599502659
            ),
            2
        )
      },expandingDisaster,disasterAutoType.value,1000,1000*8);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        createPathLine(new THREE.Vector3(11495.293938554372, -242.81112705454598, -2068.4010449994994),false);
      });
      d.on("update",(time,frameIndex,frameLength)=>{
        if(frameIndex === 7){
          createRootDisaster(
              new THREE.Vector3(
                  7288.09738110837,
                  -247.03648679485286,
                  -2039.4908453543212
              ),
              new THREE.Vector3(
                  7656.331729693724,
                  -247.7629146185809,
                  -2037.709282908494
              ),
              1
          )
        }
      });

      return d;
    }
    case 3:{//粉尘爆炸演示
      let d = new Drama(()=>{
        doTest5();
        doMoveCamera(
            new THREE.Vector3(13306.426548471001, 945.933394920561, 2726.492092224733),
            new THREE.Vector3(17197.86830026541, 715.7862820072386, -689.1613761891728),
            1000,
            ()=>{
              createRootDisaster(
                  new THREE.Vector3(
                      18294.643230898844,
                      132.48381021720024,
                      1229.9069068393314
                  ),
                  new THREE.Vector3(
                      17496.826467420244,
                      105.01158080370215,
                      1175.4926223737937
                  ),
                  3
              )
            }
        )

      },expandingDisaster,disasterAutoType.value,2000,1000*10);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        doMoveCamera(
            new THREE.Vector3(6273.000579565883, 6273.000579565884, 6273.000579565886),
            new THREE.Vector3(10109.932845156862, 918.4428499191345, -3488.241327030576),
            1000,
            ()=>{
              createPathLine(new THREE.Vector3(13506.856041894944, -471.906005859375, 911.4306848735414),false);
            }
        );
      });
      d.on("update",(time,frameIndex,frameLength)=>{
        console.log(time,frameIndex,frameLength);
        if(frameIndex === 4){
          doExplode(new THREE.Vector3(
              17496.826467420244,
              105.01158080370215,
              1175.4926223737937
          ));
        }
      });

      return d;
    }
    case 4:{//塌方演示
      let d = new Drama(()=>{
        doTest5();

        doMoveCamera(
            new THREE.Vector3(
                  1958.7543804410534,
                  150.8670384770803,
                  -101.58634781543742
            ),
            new THREE.Vector3(
                  10109.401051902736,
                  -769.2405299811503,
                  -2868.3342576023324
            )
        )

        createRootDisaster(
            new THREE.Vector3(
                2052.527461933654,
                139.1257443297718,
                -368.4082093311713
            ),
            new THREE.Vector3(
                2292.745997006982,
                139.4121086301593,
                -104.46246721050966
            ),
            5,
            2000+Math.random()*1000
        )
        createRootDisaster(
            new THREE.Vector3(
                2980.1592771270784,
                140.22451452202517,
                -299.35430245934634
            ),
            new THREE.Vector3(
                3026.7401821684043,
                140.27947477421162,
                -325.52928998848336
            ),
            5,
            2000+Math.random()*1000
        )
        createRootDisaster(
            new THREE.Vector3(
                2494.5533672942506,
                139.64986672396753,
                -268.31881183828887
            ),
            new THREE.Vector3(
                2577.6865753394422,
                139.74898185716665,
                -167.7891806255941
            ),
            5,
            2000+Math.random()*1000
        )
        createRootDisaster(
            new THREE.Vector3(
                2834.3826487893994,
                140.05409567454967,
                -69.3244841069428
            ),
            new THREE.Vector3(
                2900.27299444455,
                140.13281443172696,
                -10.774684773482818
            ),
            5,
            2000+Math.random()*1000
        )
      },()=>{},disasterAutoType.value,1000,1000*8);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        setTimeout(()=>{
          doMoveCamera(
              new THREE.Vector3(6273.000579565883, 6273.000579565884, 6273.000579565886),
              new THREE.Vector3(10109.932845156862, 918.4428499191345, -3488.241327030576),
              1000,
              ()=>{
                createPathLine(new THREE.Vector3(7029.238302754797, 129.97375334888875, -232.69925572717057),false);
              }
          );
        },1000)

      });
      d.on("update",(time,frameIndex,frameLength)=>{
        console.log(time,frameIndex,frameLength);
        if(frameIndex === 2){
          createRootDisaster(
              new THREE.Vector3(
                  2671.7776801495475,
                  139.8591602241122,
                  -340.86428564574544
              ),
              new THREE.Vector3(
                  2735.0269001253,
                  139.93403350084373,
                  -341.10457663174293
              ),
              5,
              Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(
                  2237.3197637836424,
                  139.34670478147882,
                  -74.33471468738458
              ),
              new THREE.Vector3(
                  2296.931497274114,
                  139.41753704173652,
                  -36.580508375004456
              ),
              5,
              Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(
                  2533.66491518312,
                  139.6967499019388,
                  -184.81013826909452
              ),
              new THREE.Vector3(
                  2556.2817587497816,
                  139.72373774279276,
                  -154.15984176109714
              ),
              5
          )
        }
        else if(frameIndex === 4){
          createRootDisaster(
              new THREE.Vector3(
                  2195.259132644896,
                  139.2943199746744,
                  -446.02036234675666
              ),
              new THREE.Vector3(
                  2274.97253004278,
                  139.38897807137982,
                  -404.06359204376986
              ),
              5,
              Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(
                  2266.0386857380067,
                  139.37846922114227,
                  -394.4443572366092
              ),
              new THREE.Vector3(
                  2309.753287742601,
                  139.43050536165174,
                  -353.3881091293117
              ),
              5,
              Math.random()*1000
          )
        }
        else if(frameIndex === 6){
          createRootDisaster(
              new THREE.Vector3(
                  2538.5797224039748,
                  139.7022025229776,
                  -237.20981181725688
              ),
              new THREE.Vector3(
                  2538.5797224039748,
                  139.7022025229776,
                  -237.20981181725688
              ),
              5,
              Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(
                  2859.6050493390453,
                  140.08258666416305,
                  -203.4850871801093
              ),
              new THREE.Vector3(
                  2859.6050493390453,
                  140.08258666416305,
                  -203.4850871801093
              ),
              5,
              Math.random()*1000
          )
        }
        else if(frameIndex === 8){
          createRootDisaster(
              new THREE.Vector3(
                  3427.7997196191527,
                  140.75587607457783,
                  -214.24569711080767
              ),
              new THREE.Vector3(
                  3427.7997196191527,
                  140.75587607457783,
                  -214.24569711080767
              ),
              5,
              Math.random()*1000
          )
        }
      });

      return d;
    }
    case 7:{//地压灾害演示
      let d = new Drama(()=>{
        doTest5();

        doMoveCamera(
            new THREE.Vector3(
              5981.777439342254,
              180.70039437794827,
              -150.85743886780386
            ),
            new THREE.Vector3(
              10646.591105281153,
              101.97437976732583,
              -487.5722810191982
            ),
            1000,()=>{
          createRootDisaster(
              new THREE.Vector3(6505.172836547524, 144.39805430765932, -357.8005238546731),
              new THREE.Vector3(6674.9188044971315,144.60127198370316,-244.57757956574244),
              7,
              1000+Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(6584.9073017620185, 144.49661982640822, -147.18699073313877),
              new THREE.Vector3(6775.87759888503, 144.725132252612,-45.19621490438408),
              7,
              1000+Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(6832.971513605938, 144.78766501117155,-290.21360345037715),
              new THREE.Vector3(6932.397483627399,144.90970542838448,-90.96960848590959),
              7,
              1000+Math.random()*1000
          )
          createRootDisaster(
              new THREE.Vector3(6306.782579430857,144.164200221315,-300.5156204823712),
              new THREE.Vector3(6448.550994783135,144.33417999792334,-185.61350358529364),
              7,
              1000+Math.random()*1000
          )
        });
      },()=>{},disasterAutoType.value,1000,1000*10);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        setTimeout(()=>{
          doMoveCamera(
              new THREE.Vector3(6273.000579565883, 6273.000579565884, 6273.000579565886),
              new THREE.Vector3(10109.932845156862, 918.4428499191345, -3488.241327030576),
              1000,
              ()=>{
                createPathLine(new THREE.Vector3(7029.238302754797, 129.97375334888875, -232.69925572717057),false);
              }
          );
        },1000)

      });

      return d;
    }
    case 5:{//水害演示
      let d = new Drama(()=>{
        doTest5();
        doMoveCamera(
            new THREE.Vector3(11388.296693711744, 3314.3486284894225, -6177.5160090157515),
            new THREE.Vector3(12074.511336700443, 560.173436413624, -4560.73313309426),1000,
            ()=>{
              createRootDisaster(
                  /*            new THREE.Vector3(
                                  -236.0743018534398,
                                  136.40761853831782,
                                  -413.31808676011906
                              ),
                              new THREE.Vector3(
                                  314.5109494182064,
                                  137.4014643274985,
                                  -41.32903125654525
                              ),*/
                  new THREE.Vector3(13481.634386549978,389.137451171875,-6972.425071482634),
                  new THREE.Vector3(13491.256309777204,389.137451171875,-6680.040998831553),
                  4
              );

              doEntranceAnimationForWater(waterMessage.resultObject,25,1000*5);
            }
        );

      },expandingDisaster,disasterAutoType.value,1000,1000*20);
      d.on("end",()=>{
        playing.value = false;

        drama.destroy();
        drama = null;

        //createPathLine(new THREE.Vector3(13458.213820027477,-161.96518562668098,-2140.8116100718776),false);
        createPathLine(new THREE.Vector3(10524.870201490545,445.43171555461504,-4405.066598901852),false);

        setTimeout(()=>{
          doEntranceAnimationForWater(waterMessage.resultObject,40,2000);
        },3000);

        setTimeout(()=>{
          doMoveCamera(
              new THREE.Vector3(8882.246628571515,3208.2201146463412,3692.708770155123),
              new THREE.Vector3(13401.86224345723,-307.9968098196983,-3395.2561566556165)
          );
        },1000)

      });
      d.on("update",(time,frameIndex,frameLength)=>{
/*        console.log(time,frameIndex,frameLength);
        if(frameIndex === 42){
        }
        else if(frameIndex === 11){
          createRootDisaster(
              new THREE.Vector3(
                  6543.57847763486,
                  144.4517293036306,
                  48.050268064002694
              ),
              new THREE.Vector3(
                  6976.268020619996,
                  140.97084474586427,
                  59.59579224117033
              ),
              6
          )
        }*/
      });

      return d;
    }
  }
}

//todo-- ===============================================================================================================

function createPathLine(sp,needSphere = true) {
  const ep = new YUKA.Vector3(14199.42, 2298.950, -3067.824);
  const epe = new YUKA.Vector3(13447.365, 402.112, -4636.603);


  let path1 = navMesh.findPath(new YUKA.Vector3(sp.x, sp.y, sp.z), new YUKA.Vector3(ep.x, ep.y, ep.z));
  let path2 = navMesh.findPath(new YUKA.Vector3(sp.x, sp.y, sp.z), new YUKA.Vector3(epe.x, epe.y, epe.z));

  let path = path1.length ? path1 : path2;

  let goodPath = needSphere?pathIntersectsSphere(path):path;

  if (goodPath) {
    createGreenLine(path);
  }
}

//判断path是否穿过球体
function pathIntersectsSphere(path){
  for(let i=0;i<path.length-1;i++){
    let start = path[i];
    let end = path[i+1];
    for(let j=0;j<disasters.length;j++){
      let d = disasters[j];
      let sphereCenter = d.bs.center;
      let sphereRadius = d.bs.radius;

      if(lineIntersectsSphere(start, end, sphereCenter,sphereRadius)){
        return false
      }
    }
  }

  return true;
}

// 判断线段是否穿过球体
function lineIntersectsSphere(start, end, sphereCenter, sphereRadius) {
  const lineDir = new THREE.Vector3().subVectors(end, start);
  const lineLength = lineDir.length();
  lineDir.normalize();

  const sphereToStart = new THREE.Vector3().subVectors(start, sphereCenter);

  const a = lineDir.dot(lineDir);
  const b = 2 * lineDir.dot(sphereToStart);
  const c = sphereToStart.dot(sphereToStart) - sphereRadius * sphereRadius;

  const discriminant = b * b - 4 * a * c;

  // 判别式大于等于0说明有交点
  if (discriminant >= 0) {
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    // 检查交点是否在线段范围内
    if ((t1 >= 0 && t1 <= lineLength) || (t2 >= 0 && t2 <= lineLength)) {
      return true;
    }
  }

  return false;
}

// 计算一组点之间的距离
function calculateTotalLength(path) {
  let points = [];
  path.forEach(p => {
    points.push(new THREE.Vector3(p.x, p.y, p.z));
  })

  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += points[i].distanceTo(points[i + 1]);
  }
  return totalLength;
}

// 函数：删除和销毁场景中的所有精灵对象
function removeAllSprites(scene) {
  const objectsToRemove = [];

  // 遍历场景中的所有对象，找到精灵对象
  scene.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      objectsToRemove.push(object);
    }
  });

  // 从场景中移除所有精灵对象并销毁它们
  objectsToRemove.forEach((sprite) => {
    if (sprite.material.map) sprite.material.map.dispose(); // 释放纹理
    sprite.material.dispose(); // 释放材质
    sprite.geometry.dispose(); // 释放几何体
    scene.remove(sprite); // 从场景中移除
  });
}

function createRedLine(path,type = 1,size=new THREE.Vector3(),center=new THREE.Vector3(),box,disaster){
  let points = [];

  path.forEach(p => {
    points.push(new THREE.Vector3(p.x,p.y,p.z));
  })

  //createLine(points,0xff0000);

/*  if(type === 2){
    //createWaterEmitter(points);
    createWSEmitter(points,size,center);
  }else{
    createFireEmitter(points,size,center);
  }*/

  switch (type){
    case 1:{
      createFireEmitter(points,size,center);
      break;
    }
    case 2:{
      createWSEmitter(points,size,center);
      break;
    }
    case 3:{
      createFCEmitter(points,size,center);
      break;
    }
    case 4:{
      //createWater2Emitter(size,center,box,disaster);
      break;
    }
    case 6:{
      createWaveWaterEmitter(disaster);
      break;
    }
    case 5:{
      createTFEmitter(size,center,box,disaster);
      break;
    }
    case 7:{
      //createTFEmitter(size,center,box,disaster);
      createCJDYEmitter(size,center,box,disaster)
      break;
    }
    default:{
      createFireEmitter(points,size,center);
      break;
    }
  }

}
function createGreenLine(path){
  console.log(path);
  let points = [];

  path.forEach(p => {
    points.push(new THREE.Vector3(p.x,p.y,p.z));
  })

  createLine(points,0x00ff00);

  //createGreenVehicle(path);
}
function createBlueLine(path){
  let points = [];

  path.forEach(p => {
    points.push(new THREE.Vector3(p.x,p.y,p.z));
  })

  createLine(points,0x0000ff);
}

function createGreenVehicle(path){
  const vehicleGeometry = new THREE.ConeGeometry( 125, 500, 16 );
  vehicleGeometry.rotateX( Math.PI * 0.5 );
  vehicleGeometry.translate( 0, 0.25, 0 );
  const vehicleMaterial = new THREE.MeshNormalMaterial();
  vehicleMaterial.depthTest = false;
  vehicleMaterial.transparent = true;

  const vehicleMesh = new THREE.Mesh( vehicleGeometry, vehicleMaterial );

  vehicleMesh.renderOrder = 999;
  scene.add( vehicleMesh );

  const vehicle = new YUKA.Vehicle();
  console.log(vehicle);
  vehicle.maxSpeed = 1500;
  vehicle.maxForce = 10;
  vehicle.setRenderComponent(vehicleMesh, sync);

  const followPathBehavior = new YUKA.FollowPathBehavior();
  vehicle.steering.add(followPathBehavior);

  followPathBehavior.active = true;
  followPathBehavior.path.clear();

  for ( const point of path ) {
    followPathBehavior.path.add( point );
  }

  vehicleMesh.position.copy(path[0]);
  vehicleMesh.matrixAutoUpdate = false;

  entityManager.add( vehicle );
}

//扩大灾难
function expandingDisaster(){
  disasters.map((d)=>{
    if(d.type === 5||d.type ===6) return //塌方和墙壁渗水灾难不扩大

    if(!d.isAllNode){
      doNoNodeInDisaster(d);
    }else{
      let path = d.path;
      let points = [];
      path.map((p)=>{
        points.push([p.x,p.y,p.z]);
      });

      const hull = points.length>3?QuickHull(points):[0,1,2];
      const flattenedHull = hull.flat();
      const uniqueHull = [...new Set(flattenedHull)];

      uniqueHull.map((h)=>{
        let p = path[h];
        if(p){
          if(p.index){
            let node = nodes[p.index];
            graph.getEdgesOfNode( node.index, edges );
            let path = doExpandingDisaster3(d,true,p);
            createDisaster(path,d.type,d);
          }
        }
      })
    }
  });

  //updateDisasterTypes(disasters);

  //更新所有灾难效果
  updateAllDisasters();

  //获取所有更新后的避难路径
  //getPathByAllDisasters();

  //更新显示所有灾难中的设备
  //updateAllDevices();
}

// 遍历disasters，查找相交或相邻的Box3，并更新type值
/*function updateDisasterTypes(disasters) {
  for (let i = 0; i < disasters.length; i++) {
    let d=disasters[i];
    let path = d.path;
    let points = [];
    path.map((p)=>{
      points.push([p.x,p.y,p.z]);
    });

    const hull = points.length>3?QuickHull(points):[0,1,2];
    const flattenedHull = hull.flat();
    const uniqueHull = [...new Set(flattenedHull)];

    uniqueHull.map((h)=>{
      let p = path[h];
      if(p){
        if(p.index){
          let node = nodes[p.index];
          graph.getEdgesOfNode( node.index, edges );

          for (let j = i + 1; j < disasters.length; j++) {
            let d2 = disasters[j];
            let box = d2.bb;
            edges.map((edge)=>{
              let node = nodes[edge.to];
              if(node){
                if(box.containsPoint(node.position)){
                  if((d.type === 2&&d2.type === 1)||(d.type === 1&&d2.type === 2)){
                    d2.type = 1;
                  }
                }
              }
            })
          }
        }
      }
    })
  }
}*/

//指定point处爆炸
function doExplode(point){

  const emitter = new Proton.Emitter();

  // 修改发射速率，确保在一瞬间发射大量粒子
  emitter.rate = new Proton.Rate(new Proton.Span(1000, 1000), new Proton.Span(0.1, 0.1));

  emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.25, 0.85));
  emitter.addInitialize(new Proton.Position(new Proton.BoxZone(0, 0, 0)));

  // 修改粒子的速度和方向，使其更像爆炸效果
  emitter.addInitialize(new Proton.V(new Proton.Span(500, 500), new Proton.Vector3D(0, 1, 0), 180));

  // 保持缩放行为
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(5.5, 6.5), 5.5));

// 调整重力行为，使其适合爆炸效果
  emitter.addBehaviour(new Proton.G(0));

// 保持颜色行为
  emitter.addBehaviour(new Proton.Color('#FF0000', ['#FF4500', '#FFA500', '#FFFF00'], Infinity, Proton.easeOutSine));

// 发射器只运行一次
  emitter.emit('once');

  emitter.p.x = point.x;
  emitter.p.y = point.y;
  emitter.p.z = point.z;

// 将发射器添加到Proton
  proton.addEmitter(emitter);

  emitter.addEventListener(Proton.PARTICLE_DEAD, () => {
    if (emitter.particles.length === 0) {
      // 发射结束，停止发射器
      emitter.stopEmit();

      // 从 Proton 实例中移除发射器
      proton.removeEmitter(emitter);

      // 销毁发射器
      emitter.destroy();
    }
  });



}

//点燃瓦斯根据传入point（即修改找到灾难数据中的type）
function igniteWS(point){
  for(let i=0;i<disasters.length;i++){
    let bb = disasters[i].bb;
    if(bb.containsPoint(point)){
      disasters[i].type = 1;
      let ds = findConnectedBoxes(disasters[i].bb,disasters);
      ds.forEach(disaster => {
        disaster.type = 1;
      });

      clearEmitters();
      disasters.map((d)=>{
        d.playing = false;
      });
      updateAllDisasters();
      return
    }
  }

}
function igniteWSInFrontAndBack(disaster){

/*  disasters.map((d)=>{
    if(d === disaster) return;

    let nextBB = d.bb;
    let nowBB = disaster.bb;

    if(isAdjacentOrIntersects(nowBB,nextBB)){
      d.type = 1;
    }
  })*/

/*  for(let i=0;i<disasters.length;i++){
    let d= disasters[i];

    if(d === disaster) continue;

    let nextBB = d.bb;
    let nowBB = disaster.bb;

    if(isAdjacentOrIntersects(nowBB,nextBB)){
      d.type = 1;

      return d;
    }
  }*/

}

function findConnectedBoxes(startBox, allBoxes) {
  let connectedBoxes = [];
  let toProcess = [startBox];
  let processed = new Set();

  while (toProcess.length > 0) {
    let currentBox = toProcess.pop();
    processed.add(currentBox);

    for (let disaster of allBoxes) {
      let box = disaster.bb;
      if (!processed.has(box) && (currentBox.intersectsBox(box) || isAdjacent(currentBox, box))) {
        toProcess.push(box);
        connectedBoxes.push(disaster);
        processed.add(box);
      }
    }
  }

  return connectedBoxes;
}

//判断两个box是否相交或相邻
function isAdjacent(box1,box2,epsilon = 0.1){

  const xAdjacent = (Math.abs(box1.max.x - box2.min.x) < epsilon || Math.abs(box2.max.x - box1.min.x) < epsilon) &&
      ((box1.min.y <= box2.max.y && box1.max.y >= box2.min.y) &&
          (box1.min.z <= box2.max.z && box1.max.z >= box2.min.z));

  const yAdjacent = (Math.abs(box1.max.y - box2.min.y) < epsilon || Math.abs(box2.max.y - box1.min.y) < epsilon) &&
      ((box1.min.x <= box2.max.x && box1.max.x >= box2.min.x) &&
          (box1.min.z <= box2.max.z && box1.max.z >= box2.min.z));

  const zAdjacent = (Math.abs(box1.max.z - box2.min.z) < epsilon || Math.abs(box2.max.z - box1.min.z) < epsilon) &&
      ((box1.min.x <= box2.max.x && box1.max.x >= box2.min.x) &&
          (box1.min.y <= box2.max.y && box1.max.y >= box2.min.y));

  return xAdjacent || yAdjacent || zAdjacent;
}

//查找一个点最近的导航用node点
function doNoNodeInDisaster(d){
  let sp = d.bb.min;
  let ep = d.bb.max;

  let nsp = findNearestPoint(sp,threeNodes);
  let nep = findNearestPoint(ep,threeNodes);

  let snode = nodes[nsp.nearestIndex];
  let enode = nodes[nep.nearestIndex];

  if(snode){
    graph.getEdgesOfNode( snode.index, edges );
    let path = doExpandingDisaster3(d,false,sp);
    createDisaster(path,d.type,d);

  }
  if(enode){
    graph.getEdgesOfNode( enode.index, edges );
    let path = doExpandingDisaster3(d,true,ep);
    createDisaster(path,d.type,d);

  }
  //console.log(nsp,nep);

  //console.log(d.sp,d.ep);
}

//寻找开始和结束以外的路径点
function doExpandingDisaster(disaster,isEnd = true,point){
  if(!edges.length) return;

  const otherPoints = [];
  let box = disaster.bb;
  let spp;
  edges.forEach(edge => {
    let node = nodes[edge.to];
    spp = nodes[edge.from];
    if(node){
      if(!box.containsPoint(node.position)){
        node.position.index = edge.to;
        otherPoints.push(node.position);
      }
    }
    if(spp){
      spp.position.index = edge.from;
    }
  });

  let path = point?[new YUKA.Vector3(point.x,point.y,point.z)]:(spp?[spp.position]:[]);
  point.index = point?point.index:undefined;
  let dops = isInDisaster(disaster,otherPoints);
  if(!dops){
    return [];
  }else{
    if(isEnd){
      path.push(...otherPoints);
    }else{
      path.unshift(...otherPoints);
    }
  }
  return path;
}

//寻找开始和结束以外的点
function doExpandingDisaster2(disaster){
  if(!edges.length) return;

  const otherPoints = [];
  let box = disaster.bb;
  let spp;
  edges.forEach(edge => {
    let node = nodes[edge.to];
    spp = nodes[edge.from];
    if(node){
      if(!box.containsPoint(node.position)){
        node.position.index = edge.to;
        otherPoints.push(node.position);
      }
    }
    if(spp){
      spp.position.index = edge.from;
    }
  });

  let dops = isInDisaster2(disaster,otherPoints);
  if(!dops){
    return [];
  }else{
    return otherPoints;
  }
}

function doExpandingDisaster3(disaster,isEnd = true,point){
  if(!edges.length) return;

  const otherPoints = [];
  let box = disaster.bb;
  let spp;
  edges.forEach(edge => {
    let node = nodes[edge.to];
    spp = nodes[edge.from];
    if(node){
      if(!box.containsPoint(node.position)){
        node.position.index = edge.to;
        otherPoints.push(node.position);
      }
    }
    if(spp){
      spp.position.index = edge.from;
    }
  });

  let path = point?[new YUKA.Vector3(point.x,point.y,point.z)]:(spp?[spp.position]:[]);
  point.index = point?point.index:undefined;
  let dops = isInDisaster3(disaster,otherPoints);
  if(!dops.length){
    return [];
  }else{
    if(isEnd){
      path.push(...dops);
    }else{
      path.unshift(...dops);
    }
  }
  return path;
}

//判断一组点是否已经在灾难中
function isInDisaster(disaster,points){
  let dops = [];

  for(let i=0;i<disasters.length;i++){
    if(disasters[i]===disaster) continue;
    for(let j=0;j<points.length;j++){
      if(disasters[i].bb.containsPoint(points[j])){
/*        if(disasterType.value === 1&& disasters[i].type === 2){
          disasters[i].type = 1;
        }*/
        return false
      }
    }
  }

  return true;
}
//判断一组点是否已经在灾难中
function isInDisaster2(disaster,points){
  let dops = [];

  for(let i=0;i<disasters.length;i++){
    if(disasters[i]===disaster) continue;
    for(let j=0;j<points.length;j++){
      if(disasters[i].bb.containsPoint(points[j])){
        return false
      }
    }
  }

  return true;
}

//判断一组点那些点在灾难中，哪些不在
function isInDisaster3(disaster,points){
  let dops = [];

/*  for(let i=0;i<disasters.length;i++){
    if(disasters[i]===disaster) continue;
    for(let j=0;j<points.length;j++){
      if(disasters[i].bb.containsPoint(points[j])){
        return false
      }
    }
  }

  return true;*/
    for(let i=0;i<points.length;i++){
      let notIn = true;
      for(let j=0;j<disasters.length;j++){
        if(disaster===disasters[j]) continue;
        else if(disasters[j].bb.containsPoint(points[i])){

          needExplode(disaster,disasters[j])
          notIn = false;
        }
      }

      if(notIn){
        dops.push(points[i]);
      }
    }

    if(explodeCenter){
      doExplode(explodeCenter);
      igniteWS(explodeCenter);
      explodeCenter = null;
    }

    return dops;
}

function needExplode(d1,d2){
  if(d1.type!==d2.type){
    if(d1.type===1&&d2.type===2){
      d2.type = 2;
      explodeCenter = d2.bs.center;
    }else if(d1.type===2&&d2.type===1){
      d1.type = 1;
      explodeCenter = d1.bs.center;
    }
  }
}

//更新灾难内部数据
function updateDisaster(disaster){
  let path = disaster.path;

  // 计算包围盒
  const boundingBox = new THREE.Box3().setFromPoints(path);
  // 从包围盒获取包围球
  const boundingSphere = new THREE.Sphere();
  boundingBox.getBoundingSphere(boundingSphere);

  let sp = new THREE.Vector3(path[0].x, path[0].y,path[0].z);
  let ep = new THREE.Vector3(path[path.length-1].x, path[path.length-1].y,path[path.length-1].z);

  disaster.bs = boundingSphere;
  disaster.bb = boundingBox;
  disaster.sp = sp;
  disaster.ep = ep;
}

//创建灾难内部数据
function createDisaster(path,type,disaster){
  if(path.length<=1) return;

  let sp = getThreePoint(path[0]);
  let ep = getThreePoint(path[path.length-1]);

/*  let sp0 = findClosestPointOnBoundary(sp,navEdgeVectors);
  let ep0 = findClosestPointOnBoundary(ep,navEdgeVectors);*/

/*  path.push(getYUKAPoint(sp0));
  path.push(getYUKAPoint(ep0));*/

  //console.log(path);

/*  let mesh = new THREE.Mesh(new THREE.BoxGeometry(50,50,50),new THREE.MeshBasicMaterial({color:0xff0000,depthTest:false,transparent:true}));
  mesh.position.copy(sp0);
  let mesh2 = new THREE.Mesh(new THREE.BoxGeometry(50,50,50),new THREE.MeshBasicMaterial({color:0xff0000,depthTest:false,transparent:true}));
  mesh2.position.copy(ep0);
  scene.add(mesh);
  scene.add(mesh2);*/




// 计算包围盒
  const boundingBox = new THREE.Box3().setFromPoints(path);
  // 从包围盒获取包围球
  const boundingSphere = new THREE.Sphere();
  boundingBox.getBoundingSphere(boundingSphere);

  if(type === 4||type === 3){
    //console.log(disaster.bs.center.y - boundingSphere.center.y);
    if((disaster.bs.center.y - boundingSphere.center.y)<config.options.heightThreshold) return;
  }

  let boundingBox2;
  try{
    let points = navMesh.findPath(sp,ep);
    boundingBox2 = new THREE.Box3().setFromPoints(points);
  }catch(e){
    boundingBox2 = undefined;
  }



  disasters.push({
    bs: boundingSphere,
    bb: boundingBox,
    bb2:boundingBox2,
    sp: sp,
    ep: ep,
    type: type,
    path: path,
    isAllNode: true,
    parent: disaster
  })
}

//销毁并重绘所有灾难（已改为只更新新加的灾害）
function updateAllDisasters(){
  //clearEmitters();

  //更新水以外的灾害
  disasters.forEach((d)=>{
    let bb = d.bb2?d.bb2:d.bb;
    let bs = d.bs;

    let size = new THREE.Vector3();
    bb.getSize(size);

/*    let  bh = new THREE.Box3Helper(bb,0xff0000);
    bh.material.depthTest = false;
    bh.material.transparent = true;
    bh.renderOrder = 999;
    scene.add(bh);*/

    if(!d.playing&&d.type!==4)
      createRedLine(d.path,d.type,size,bs.center,bb,d);

    d.playing = true;
  });

  //更新水灾
  createWater2Emitter();

}

//更新所有灾难中的摄像头和传感器；如果处于灾难中则优先显示摄像头和传感器
function updateAllDevices(){
  resetAllDevices();

  //outlinePass.selectedObjects = [];

  disasters.map((disaster)=>{
    let bs = disaster.bs;
    let path = disaster.path;
    let points = getThreePoints(path);
    let minD = config.options.deviceMinDis;

    cameraModels.map((c)=>{
      let md = getMinDistanceByPoints(points,c.userData.wp);
      if(md<=minD){
        c.material.depthTest = false;
        c.material.transparent = true;
        c.renderOrder = 999;
        c.scale.set(1,1,1);

        devicesInDisasters.push(c);

      }
    })
    sensorModels.map((c)=>{
      let md = getMinDistanceByPoints(points,c.userData.wp);
      if(md<=minD){
        c.children.map((cc)=>{
          cc.material.depthTest = false;
          cc.material.transparent = true;
          cc.renderOrder = 999;
        })

        devicesInDisasters.push(c);
      }
    })
  })

  //outlinePass.selectedObjects = devicesInDisasters;
}


//鼠标滑过时拾取所有灾难中的设备
function onContainerMouseMove(event){

  if(!devicesInDisasters.length) return;

  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  const intersects = raycaster.intersectObjects(devicesInDisasters,true);

  if (intersects.length > 0) {
    renderer.domElement.style.cursor = 'pointer';
  }else{
    renderer.domElement.style.cursor = 'default';
  }


}
//鼠标拾取点击灾难中的设备，显示信息
function onContainerClick(event){

  if(!devicesInDisasters.length) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  const intersects = raycaster.intersectObjects(devicesInDisasters,true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;
    let reObj;
    if(obj.name.indexOf('camera')>-1){
      reObj = obj;
    }else{
      reObj = obj.parent;
    }

    doReObjLabel(reObj);
  }
}

function clearAllLabels(){
  cameraModels.forEach((c)=>{
    if(c.userData.label){
      c.userData.label.visible = false;
    }
  })
  sensorModels.forEach((c)=>{
    if(c.userData.label){
      c.userData.label.visible = false;
    }
  })
}

function doReObjLabel(reObj){

  clearAllLabels();

  if(!reObj.userData.label){
    reObj.userData.label = createLabelObj(reObj.name,reObj);
  }

  reObj.userData.label.visible = true;

}





//计算一个点和一组点组成的线的最小距离，用于判断是否需要显示近距离的设备
function getMinDistanceByPoints(points,targetPoint){
// 初始化最小距离为一个很大的值
  let minDistance = Infinity;

// 遍历点数组，计算目标点到每个线段的距离
  for (let i = 0; i < points.length - 1; i++) {
    const segmentStart = points[i];
    const segmentEnd = points[i + 1];
    const distance = pointToSegmentDistance(targetPoint, segmentStart, segmentEnd);

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance
}
// 计算点到线段的距离
function pointToSegmentDistance(point, segmentStart, segmentEnd) {
  const segmentVector = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
  const pointVector = new THREE.Vector3().subVectors(point, segmentStart);

  const segmentLengthSquared = segmentVector.lengthSq();
  const t = Math.max(0, Math.min(1, pointVector.dot(segmentVector) / segmentLengthSquared));
  const projection = new THREE.Vector3().addVectors(segmentStart, segmentVector.multiplyScalar(t));

  return point.distanceTo(projection);
}

function resetAllDevices(){
  cameraModels.map((c)=>{
    c.material.depthTest = true;
    c.material.transparent = true;
    c.renderOrder = 0;
    c.scale.copy(c.userData.scale);
  })
  sensorModels.map((c)=>{
    c.children.map((cc)=>{
      cc.material.depthTest = true;
      cc.material.transparent = true;
      cc.renderOrder = 0;
      c.scale.copy(c.userData.scale);
    })
  })

  devicesInDisasters = [];
}

//所有灾难产生路线
function getPathByAllDisasters(){
  clearScene(lineGroup)



  disasters.forEach((d)=>{
    let bb = d.bb;

    let sp = d.sp;
    let ep = d.ep;

    let nsp = findNearestPoint(sp,threeNodes);
    let nep = findNearestPoint(ep,threeNodes);

    let snode = nodes[nsp.nearestIndex];
    let enode = nodes[nep.nearestIndex];

    let willPath = [];

    if(snode){
      graph.getEdgesOfNode( snode.index, edges );
      let otherPoints = doExpandingDisaster2(d);
      let path  = getPathByOtherPoints(otherPoints);
      //if(pathIntersectsSphere(path)){
        //willPath = path;
        if(path.length)
          createGreenLine(path);
      //}
    }
    if(enode){
      graph.getEdgesOfNode( enode.index, edges );
      let otherPoints = doExpandingDisaster2(d);
      let path = getPathByOtherPoints(otherPoints);
      //if(pathIntersectsSphere(path)){
        //willPath = path;
        if(path.length)
          createGreenLine(path);
      //}
    }

/*    if(willPath.length)
      createGreenLine(willPath);
    else
      ElMessage.error('暂无可用路径');*/


  })
}

function getPathByOtherPoints(otherPoints){
  if(!otherPoints.length) return [];
  let paths =[];

  //两个逃离点,ep1为地面撤离点
  const ep1 = new YUKA.Vector3(14199.42,2298.950,-3067.824)
  const ep2 = new YUKA.Vector3(13447.365, 402.112 ,-4636.603);

  const eps = [ep1,ep2];

  eps.map((ep)=>{
      let path = navMesh.findPath(otherPoints[0],ep);
      let totalLength = calculateTotalLength(path);

      if(pathIntersectsSphere(path)){
        paths.push({path,totalLength});
      }

  })

  //paths.sort((a,b)=>{return  a.totalLength - b.totalLength});


  return paths.length?paths[0].path:[];
}

function createLine(points,color){

  const curve = new THREE.CatmullRomCurve3( points,false,'catmullrom',0);

  const material = new THREE.MeshBasicMaterial( { color: color,side:THREE.DoubleSide,map:lineTexture,transparent:true } );
  material.depthTest = false;
  lineTexture.repeat.x=points.length;

  const tubeGeometry = new THREE.TubeGeometry(curve, 50, 30, 3, false);
  const tubeMesh = new THREE.Mesh(tubeGeometry, material);
  tubeMesh.renderOrder = 999;

  lineGroup.add(tubeMesh);
}

function doTest(scene){

  scene.children.forEach(child=>{
    child.children.forEach(cChild=>{
      testPoints.push(cChild.position);
    })
  })

/*  clearEmitters();

  scene.children.forEach(child=>{
    let points = [];
    child.children.forEach(cChild=>{
      points.push(cChild.position);
    })

    const curve = new THREE.CatmullRomCurve3( points);

    const material = new THREE.MeshBasicMaterial( { color: 0xff0000,side:THREE.DoubleSide,map:lineTexture,transparent:true } );
    material.depthTest = false;
    lineTexture.repeat.x=points.length*10;

    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 5, 8, false);
    const tubeMesh = new THREE.Mesh(tubeGeometry, material);
    tubeMesh.renderOrder = 999;

    scene.add(tubeMesh);

    createFireEmitter(points)

  })*/
}

function createFireEmitter(points,size,center){

/*  for(let i=1; i<points.length; i++){
    let p = points[i];
    let p0 = points[i-1];

    const emitter = new Proton.Emitter();
    emitter.rate = new Proton.Rate(new Proton.Span(4, 16), new Proton.Span(0.01, 0.02));
    emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
    emitter.addInitialize(new Proton.Mass(1));
    emitter.addInitialize(new Proton.Life(0.25, 1.25));
    emitter.addInitialize(new Proton.Position(new Proton.LineZone(p.x,p.y,p.z,p0.x,p0.y,p0.z)));
    emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
    emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
    emitter.addBehaviour(new Proton.Scale(new Proton.Span(3.5, 5), 0));
    emitter.addBehaviour(new Proton.G(-2));
    emitter.addBehaviour(new Proton.Color('#FF0000', ['#FF4500', '#FFA500', '#FFFF00'], Infinity, Proton.easeOutSine));
    emitter.emit();

    proton.addEmitter(emitter);

    emitters.push(emitter);
  }*/

  const emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(4, 16), new Proton.Span(0.1, 0.2));
  emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.25, 1.25));
  emitter.addInitialize(new Proton.Position(new Proton.BoxZone(size.x,size.y,size.z)));
  emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
  emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(5.5, 6.5), 0.5));
  emitter.addBehaviour(new Proton.G(-4));
  emitter.addBehaviour(new Proton.Color('#FF0000', ['#FF4500', '#FFA500', '#FFFF00'], Infinity, Proton.easeOutSine));

  emitter.p.x=center.x;
  emitter.p.y=center.y;
  emitter.p.z=center.z;

  emitter.emit();

  proton.addEmitter(emitter);

  emitters.push(emitter);

}

//创建瓦斯效果
function createWSEmitter(points,size,center){
  const emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(8, 18), new Proton.Span(0.1, 0.2));
  emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.25, 1.0));
  emitter.addInitialize(new Proton.Position(new Proton.BoxZone(size.x,size.y,size.z)));
  emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
  emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(5, 5), 5));
  emitter.addBehaviour(new Proton.G(-1));
  emitter.addBehaviour(new Proton.Color('#ff007d', ['#ff74f1', '#ffb1ee', '#ffe7eb'], Infinity, Proton.easeOutSine));

  emitter.p.x=center.x;
  emitter.p.y=center.y;
  emitter.p.z=center.z;

  emitter.emit();

  proton.addEmitter(emitter);

  emitters.push(emitter);
}

//创建粉尘效果
function createFCEmitter(points,size,center){
  const emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(8, 18), new Proton.Span(0.1, 0.2));
  emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.25, 1.0));
  emitter.addInitialize(new Proton.Position(new Proton.BoxZone(size.x,size.y,size.z)));
  emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
  emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(4, 4), 4));
  emitter.addBehaviour(new Proton.G(-1));
  emitter.addBehaviour(new Proton.Color('#ffffff', ['#ffffff', '#ffffff', '#ffffff'], Infinity, Proton.easeOutSine));

  emitter.p.x=center.x;
  emitter.p.y=center.y;
  emitter.p.z=center.z;

  emitter.emit();

  proton.addEmitter(emitter);

  emitters.push(emitter);
}

//创建冲击地压效果
function createCJDYEmitter(size,center,box,disaster){
/*  const emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(18, 40), new Proton.Span(0.05, 0.1));  // 增加喷射速率

// 初始化粒子
  emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.5, 1.0));  // 适当增加生命时间，让粒子能飞得更远

// 设置粒子起始位置为某个区域
  emitter.addInitialize(new Proton.Position(new Proton.BoxZone(size.x, size.y, size.z)));

// 设置粒子速度，向下喷射
// 速度范围加大，同时调整粒子喷射的方向
  emitter.addInitialize(new Proton.V(new Proton.Span(300, 500), new Proton.Vector3D(0, -1, 0), 30)); // 向下喷射，增加速度范围

// 添加粒子行为
  emitter.addBehaviour(new Proton.RandomDrift(30, 30, 30, 0.05));  // 使粒子有更多的漂移，增强分散效果
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(0.5, 4), 4));  // 粒子缩放，可能看起来更加快速喷射

// 重力行为，粒子会更快下落
  emitter.addBehaviour(new Proton.G(-3));  // 增加重力效果，让粒子快速向下掉

// 设置粒子颜色，颜色可以自定义
  emitter.addBehaviour(new Proton.Color('#ffffff', ['#ffffff', '#ffffff', '#ffffff'], Infinity, Proton.easeOutSine));




  emitter.p.x=center.x;
  emitter.p.y=center.y;
  emitter.p.z=center.z;

  emitter.emit();

  proton.addEmitter(emitter);

  emitters.push(emitter);

  setTimeout(()=>{
/!*    emitter.stopEmit();
    emitter.removeAllParticles();*!/
/!*    // 从Proton实例中移除发射器
    proton.removeEmitter(emitter);
    // 销毁发射器
    emitter.destroy();*!/
    emitter.emit("once")
  },1750)*/

  if(disaster.played) return;

  if (TFScene) {
    let sp = disaster.sp;
    let ep = disaster.ep;
    // 计算包围盒
    const boundingBox = new THREE.Box3().setFromPoints([sp,ep]);
    // 从包围盒获取包围球
    const boundingSphere = new THREE.Sphere();
    boundingBox.getBoundingSphere(boundingSphere);

    let position = boundingSphere.center;

    const emitter = new Proton.Emitter();
    emitter.rate = new Proton.Rate(new Proton.Span(800, 1600), new Proton.Span(0.1, 0.25));
    emitter.addInitialize(new Proton.Body([new THREE.Sprite(particleSmokeMaterial1),new THREE.Sprite(particleSmokeMaterial2),new THREE.Sprite(particleSmokeMaterial3)]));
    emitter.addInitialize(new Proton.Mass(1));
    emitter.addInitialize(new Proton.Life(4, 8));
    emitter.addInitialize(new Proton.Position(new Proton.BoxZone(400,400,400)));
    emitter.addInitialize(new Proton.V(new Proton.Span(50, 100), new Proton.Vector3D(0, 1, 0), 400));
    emitter.addBehaviour(new Proton.Scale(new Proton.Span(2, 3), new Proton.Span(2.5, 3.5)));
    emitter.addBehaviour(new Proton.Alpha(1, 0));
    emitter.addBehaviour(new Proton.Gravity(0.3));
    emitter.addBehaviour(new Proton.Color('#000000', ['#1c1c1c', '#373737', '#000000'], Infinity, Proton.easeOutSine));
    emitter.emit('once');
    emitter.p.x = position.x;
    emitter.p.y = position.y;
    emitter.p.z = position.z;

    proton.addEmitter(emitter);

    emitters.push(emitter);

    setTimeout(()=>{
      if(disasterAutoType.value !== 7) return;

      const modelClone = TFScene.clone();
      modelClone.position.copy(position);
      //modelClone.position.y+=134;//todo-- 临时代码，模型替换后去掉
      modelClone.position.y+=0
      TFGroup.add(modelClone);

      let mixer = new THREE.AnimationMixer(modelClone);
      TFAnimates.forEach((clip) => {
        let action = mixer.clipAction(clip);
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
        action.play();
      });

      disaster.played = true;

      let id = THREE.MathUtils.generateUUID();
      mixer.myId = id;
      mixerTFS[id] = mixer;


    },4750);
  }
}

function createWaterEmitter(points){
  for(let i=1; i<points.length; i++){
    let p = points[i];
    let p0 = points[i-1];

    const emitter = new Proton.Emitter();
    emitter.rate = new Proton.Rate(new Proton.Span(4, 16), new Proton.Span(0.01, 0.02));
    emitter.addInitialize(new Proton.Body(new THREE.Sprite(particleMaterial)));
    emitter.addInitialize(new Proton.Mass(1));
    emitter.addInitialize(new Proton.Life(0.25, 1.25));
    emitter.addInitialize(new Proton.Position(new Proton.LineZone(p.x,p.y,p.z,p0.x,p0.y,p0.z)));
    emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
    emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
    emitter.addBehaviour(new Proton.Scale(new Proton.Span(2, 3.5), 0));
    emitter.addBehaviour(new Proton.G(20));
    emitter.addBehaviour(new Proton.Color('#00ffff', ['#00b5ff', '#0055ff', '#0000ff'], Infinity, Proton.easeOutSine));
    emitter.emit();

    proton.addEmitter(emitter);

    emitters.push(emitter);
  }
}

function updateWater3(){
  let resultObject = waterMessage.resultObject;
  const brushes = waterMessage.brushes;
  if(!brushes.length) {
    resultObject.visible = false
    return;
  }else{
    resultObject.visible = true;
  }

  const csgEvaluator = waterMessage.csgEvaluator;
  const waterBrush = waterMessage.waterBrush;

  waterBrush.updateMatrixWorld();

  let finalBrush = brushes[ 0 ];
  for ( let i = 1, l = brushes.length; i < l; i ++ ) {

    const b = brushes[ i ];
    finalBrush = csgEvaluator.evaluate( finalBrush, b, ADDITION );
  }

  resultObject = csgEvaluator.evaluate( waterBrush, finalBrush, HOLLOW_INTERSECTION, resultObject );

  //resultObject.material = water3Material;
  resultObject.renderOrder = 999;

  scene.add(resultObject);
}
/**
 * 判断两个Box3是否足够接近以合并
 * @param {THREE.Box3} box1
 * @param {THREE.Box3} box2
 * @param {number} threshold - 允许的最大距离
 * @returns {boolean} 是否需要合并
 */
function shouldMerge(box1, box2, threshold) {
  // 计算两个Box3之间的最小距离
  const distance = box1.min.distanceTo(box2.max);
  return distance <= threshold;
}

/**
 * 合并Box3的逻辑，用于合并较为接近的Box3，提升效率
 * @param {THREE.Box3[]} boxes - 输入的Box3数组
 * @param {number} threshold - 允许的最大距离
 * @returns {THREE.Box3[]} 合并后的Box3数组
 */
function mergeBoxes(boxes, threshold) {
  const mergedBoxes = [];

  while (boxes.length > 0) {
    let currentBox = boxes.shift(); // 取出第一个Box3
    let merged = false;

    for (let i = 0; i < mergedBoxes.length; i++) {
      if (shouldMerge(currentBox, mergedBoxes[i], threshold)) {
        mergedBoxes[i].union(currentBox); // 合并Box3
        merged = true;
        break;
      }
    }

    if (!merged) {
      mergedBoxes.push(currentBox);
    }
  }

  return mergedBoxes;
}
function clearBrushes(){
  let brushes = waterMessage.brushes;
  brushes.map((b)=>{
    b.parent && b.parent.remove(b);
    b.material.dispose();
    b.geometry.dispose();
    b.geometry = null;
    b.material = null;
  })

  waterMessage.brushes = [];
}

//创建和更新渗水灾害效果
function createWater2Emitter(){


/*  let ps = getThreePoints(disaster.path);
  let rotation = getMinimumBoundingRectangle(ps);
  console.log(rotation);*/

  clearBrushes();

  let bbs = [];
  let bbs2 = [];
  disasters.map((d)=>{
    if(d.type === 4){
      const b = d.bb.clone();
/*      if(d.playing&&d.parent){
        // 计算目标点和模型当前位置之间的向量
        const direction = d.parent.bs.center.clone().sub(d.bs.center.clone()).normalize();
        // 计算模型朝向目标点所需的旋转角度
        const angle = Math.atan2(direction.x, direction.z);
        b.angle = angle;
        b.playing = d.playing;
        bbs2.push(b);
      }else{
        bbs.push(b);
      }*/

      bbs.push(b);
    }
  })

  //let boxs = mergeBoxes(disasters.map(d => d.bb.clone()),400);
  let boxs = mergeBoxes(bbs,400);
  boxs.map((box,index)=>{
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const b = new Brush( new THREE.BoxGeometry( 60+size.x, size.y+160, 60+size.z ), new THREE.MeshNormalMaterial({wireframe:true}) );
    b.position.copy(center);
    waterMessage.brushes.push(b);
    b.updateMatrixWorld();

/*    let max = box.max;
    let min = box.min;
    const p = findClosestPointOnBoundary(max, navEdgeVectors);
    const p0 = findClosestPointOnBoundary(min, navEdgeVectors);
    let rbox = new THREE.Box3(p,p0);
    const size2 = new THREE.Vector3();
    const center2 = new THREE.Vector3();
    rbox.getSize(size2);
    rbox.getCenter(center2);

    const b2 = new Brush( new THREE.BoxGeometry( 60+size2.x, size2.y+160, 60+size2.z ), new THREE.MeshNormalMaterial({wireframe:true}) );
    b2.position.copy(center);
    waterMessage.brushes.push(b2);
    b2.updateMatrixWorld();*/
  });
/*  bbs2.map((box,index)=>{
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const b = new Brush( new THREE.BoxGeometry( 60+size.x, size.y+160, 60+size.z ), new THREE.MeshNormalMaterial({wireframe:true}) );
    b.position.copy(center);
    waterMessage.brushes.push(b);
    b.updateMatrixWorld();

    console.log(box);
  })*/


/*  const bs = disaster.bs;
  const b = new Brush( new THREE.BoxGeometry( 60+size.x, size.y+160, 60+size.z ), new THREE.MeshNormalMaterial({wireframe:true}) );
  b.position.copy(center);
  //scene.add(b);
  waterMessage.brushes.push(b);

  b.updateMatrixWorld();*/

  updateWater3();

/*  let longerDirection = 'x';
  if (size.z > size.x) {
    longerDirection = 'z';
  }

  let sp = disaster.sp;
  let ep = disaster.ep;
// 获取 Box3 的最小点和最大点
  const min = box.min;
  const max = box.max;

  let r1 = getEulerRotation(sp,ep);
  let r2 = getEulerRotation(max,min);

  let rd = r1.distanceTo(r2);

  let isFlat = (size.y<=config.options.heightThreshold2);

  let points = [];
  if(isFlat){
    const center = new THREE.Vector3();
    box.getCenter(center);
    points.push(
        new THREE.Vector3(box.min.x, center.y, box.min.z),
        new THREE.Vector3(box.max.x, center.y, box.min.z),
        new THREE.Vector3(box.min.x, center.y, box.max.z),
        new THREE.Vector3(box.max.x, center.y, box.max.z),
    )
  }else{
    if(rd<0.5){
      // 根据更长的方向获取四个点
      if (longerDirection === 'z') {
        points.push(new THREE.Vector3(min.x, min.y, min.z));
        points.push(new THREE.Vector3(max.x, min.y, min.z));
        points.push(new THREE.Vector3(min.x, max.y, max.z));
        points.push(new THREE.Vector3(max.x, max.y, max.z));
      } else {
        points.push(new THREE.Vector3(min.x, min.y, min.z));
        points.push(new THREE.Vector3(min.x, min.y, max.z));
        points.push(new THREE.Vector3(max.x, max.y, min.z));
        points.push(new THREE.Vector3(max.x, max.y, max.z));
      }
    }else{
      // 根据更长的方向获取四个点
      if (longerDirection === 'z') {
        points.push(new THREE.Vector3(min.x, min.y, max.z));
        points.push(new THREE.Vector3(max.x, min.y, max.z));
        points.push(new THREE.Vector3(min.x, max.y, min.z));
        points.push(new THREE.Vector3(max.x, max.y, min.z));
      } else {
        points.push(new THREE.Vector3(min.x, max.y, min.z));
        points.push(new THREE.Vector3(max.x, min.y, min.z));
        points.push(new THREE.Vector3(min.x, max.y, max.z));
        points.push(new THREE.Vector3(max.x, min.y, max.z));
      }
    }
  }



// 创建一个 BufferGeometry 并添加顶点
  const geometry = new THREE.BufferGeometry();

  addQuad(points);

/!*  const vertices = new Float32Array([
    points[0].x, points[0].y, points[0].z,
    points[1].x, points[1].y, points[1].z,
    points[2].x, points[2].y, points[2].z,
    points[3].x, points[3].y, points[3].z
  ]);

  // 定义四边形的索引
  const indices = new Uint16Array([
    0, 1, 2,
    2, 1, 3
  ]);*!/

  const vertices = waterMessage.vertices;
  const indices = waterMessage.indices;

// 设置几何体的属性
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);

  const waterGeometry = new THREE.PlaneGeometry( size.x,size.z );

  let g = isFlat?waterGeometry:geometry;

  if(!waterMessage.water){
    const water = new THREE.Mesh(geometry,water2Material);
    let group = new THREE.Group();
    group.add(water);
    protonGroup.add(group);

    waterMessage.water = water;

    doEntranceAnimationForWater(waterMessage.waterBrush,80,1000*66);
  }else{
    const water = waterMessage.water;
    water.geometry.dispose();
    water.geometry = geometry;
  }

  waterMessage.water.visible = false;*/

  upsShowOrHide(false);

  //let testMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: false ,depthTest: false ,transparent:true });
  //const water = new THREE.Mesh(geometry,water2Material);

/*  const water = new Water( g, {
    color: 0xffffff,
    scale: 4,
    flowDirection: new THREE.Vector2( 1, 1 ),
    textureWidth: 256,
    textureHeight: 256
  } );
  water.material.depthTest = false;
  water.material.transparent = true;
  water.side = THREE.DoubleSide;
  water.renderOrder = 999;*/

  //if(isFlat){
/*    water.rotation.x = (Math.PI * - 0.5);
    water.position.copy(center);*/
  //}
  //const water = new THREE.Mesh(waterGeometry,water2Material);
  //water.rotation.x = -(Math.PI * - 0.5);
  //water.renderOrder = 999;

/*  let group = new THREE.Group();
  group.add(water);

  group.userData.isWater = true;*/
  //water.position.copy(center);
  //water.position.y+=200;

  //protonGroup.add(group);

  //entranceAnimationForWater(group,disaster);
}
function addQuad(ps) {
  let vertices = waterMessage.vertices;
  let indices = waterMessage.indices;

  // 将四个顶点添加到数组中
  for (let p of ps) {
    vertices.push(p.x, p.y, p.z);
  }

  // 计算当前已经有多少个顶点（用于生成索引）
  const indexOffset = vertices.length / 3 - 4;

  // 添加两个三角形的索引
  indices.push(
      indexOffset, indexOffset + 1, indexOffset + 2,
      indexOffset + 2, indexOffset + 1, indexOffset + 3
  );

  // 找到距离最近的两个点
  const nearestPoints = findNearestPoints(vertices, ps);
  console.log(nearestPoints);

  // 生成新的四角面
/*  indices.push(
      nearestPoints[0], nearestPoints[1], indexOffset,
      indexOffset+2, indexOffset, nearestPoints[0]
  );*/

  // 生成新的四角面
  const newIndices = [
    nearestPoints[0], nearestPoints[1], indexOffset,
    indexOffset + 2, indexOffset, nearestPoints[0]
  ];

  // 判断新生成的三角面是否与寻路模型的边缘线段相交
  //if (!doesIntersectOtherGeometry(newIndices, waterMessage.edgeLine.geometry, vertices)) {
    indices.push(...newIndices);
  //}
}
function findNearestPoints(vertices, ps) {
  const distances = [];
  const currentPointsCount = vertices.length / 3 - 4;

  for (let i = 0; i < currentPointsCount; i++) {
    for (let j = 0; j < ps.length; j++) {
      const vx = vertices[i * 3];
      const vy = vertices[i * 3 + 1];
      const vz = vertices[i * 3 + 2];
      const px = ps[j].x;
      const py = ps[j].y;
      const pz = ps[j].z;
      const distance = Math.sqrt((vx - px) ** 2 + (vy - py) ** 2 + (vz - pz) ** 2);
      distances.push({ distance, index: i });
    }
  }

  distances.sort((a, b) => a.distance - b.distance);

  return [distances[0].index, distances[1].index];
}
function doesIntersectOtherGeometry(newIndices, otherGeometry, vertices) {
  const edges = [
    [newIndices[0], newIndices[1]],
    [newIndices[1], newIndices[2]],
    [newIndices[2], newIndices[0]],
    [newIndices[3], newIndices[4]],
    [newIndices[4], newIndices[5]],
    [newIndices[5], newIndices[3]]
  ];

  const otherVertices = otherGeometry.attributes.position.array;
  const otherEdges = [];

  for (let i = 0; i < otherVertices.length; i += 9) {
    const v0 = new THREE.Vector3(otherVertices[i], otherVertices[i + 1], otherVertices[i + 2]);
    const v1 = new THREE.Vector3(otherVertices[i + 3], otherVertices[i + 4], otherVertices[i + 5]);
    const v2 = new THREE.Vector3(otherVertices[i + 6], otherVertices[i + 7], otherVertices[i + 8]);

    otherEdges.push([v0, v1], [v1, v2], [v2, v0]);
  }

  for (let edge of edges) {
    const p1 = new THREE.Vector3(vertices[edge[0] * 3], vertices[edge[0] * 3 + 1], vertices[edge[0] * 3 + 2]);
    const p2 = new THREE.Vector3(vertices[edge[1] * 3], vertices[edge[1] * 3 + 1], vertices[edge[1] * 3 + 2]);

    for (let otherEdge of otherEdges) {
      if (doLinesIntersect(p1, p2, otherEdge[0], otherEdge[1])) {
        return true;
      }
    }
  }

  return false;
}
function doLinesIntersect(p1, p2, p3, p4) {
  function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  }

  return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) && (ccw(p1, p2, p3) != ccw(p1, p2, p4));
}





//渗水从下往上动画效果
function entranceAnimationForWater(water,disaster){
  if(disaster.hasEntrance) return;

  // 创建一个 Tween 动画
  water.position.y = -50;
  doEntranceAnimationForWater(water,10)

  disaster.hasEntrance = true;
}
function doEntranceAnimationForWater(water,toY,duration = 1000){
  const tween = new TWEEN.Tween(water.position)
      .to({ y: toY }, duration) // 动画目标和持续时间
      .onComplete(() => {
        // 动画完成后销毁 Tween 对象
        TWEEN.remove(tween);
      })
      .start();
}

//相机移动动画
function doMoveCamera(position,target,duration = 1000,callback){
  const tween1 = new TWEEN.Tween(camera.position)
      .to({ x: position.x, y: position.y,z: position.z },duration)
      .onComplete(()=>{
        TWEEN.remove(tween1);
      })
      .start();

  const tween2 = new TWEEN.Tween(controls.target)
      .to({ x: target.x, y: target.y,z: target.z },duration)
      .onUpdate(()=>{
        controls.update();
      })
      .onComplete(()=>{
        TWEEN.remove(tween1);

        callback && callback();
      })
      .start();
}

//创建墙面渗水效果
function createWaveWaterEmitter(disaster){
  let sp = disaster.sp;
  let ep = disaster.ep;

  const p = findClosestPointOnBoundary(sp, navEdgeVectors);
  const p0 = findClosestPointOnBoundary(ep, navEdgeVectors);

  p.y += 80;
  p0.y += 80;

  let sprite = new THREE.Sprite(particleMaterial);
  sprite.renderOrder = 999;

  const emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(4, 16), new Proton.Span(0.01, 0.02));
  emitter.addInitialize(new Proton.Body(sprite));
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Life(0.25, 1.25));
  emitter.addInitialize(new Proton.Position(new Proton.LineZone(p.x,p.y,p.z,p0.x,p0.y,p0.z)));
  emitter.addInitialize(new Proton.V(new Proton.Span(100, 200), new Proton.Vector3D(0, 1, 0), 30));
  emitter.addBehaviour(new Proton.RandomDrift(10, 10, 10, .05));
  emitter.addBehaviour(new Proton.Scale(new Proton.Span(2, 3.5), 0));
  emitter.addBehaviour(new Proton.Alpha(new Proton.Span(0.5, 0.1), 0));
  emitter.addBehaviour(new Proton.G(20));
  emitter.addBehaviour(new Proton.Color('#008cff', ['#0066ff', '#0055ff', '#ffffff'], Infinity, Proton.easeOutSine));
  emitter.emit();

  proton.addEmitter(emitter);

  emitters.push(emitter);
}

//创建塌方灾害效果
function createTFEmitter(size,center,box,disaster){
  if(disaster.played) return;

  if (TFScene) {

    let sp = disaster.sp;
    let ep = disaster.ep;
    // 计算包围盒
    const boundingBox = new THREE.Box3().setFromPoints([sp,ep]);
    // 从包围盒获取包围球
    const boundingSphere = new THREE.Sphere();
    boundingBox.getBoundingSphere(boundingSphere);
    let position = boundingSphere.center;

    const modelClone = TFScene.clone();
    modelClone.position.copy(position);
    //modelClone.position.y+=134;//todo-- 临时代码，模型替换后去掉
    modelClone.position.y+=0
    TFGroup.add(modelClone);

    let mixer = new THREE.AnimationMixer(modelClone);
    TFAnimates.forEach((clip) => {
      let action = mixer.clipAction(clip);
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
      action.play();
    });

    disaster.played = true;

    let id = THREE.MathUtils.generateUUID();
    mixer.myId = id;
    mixerTFS[id] = mixer;

    setTimeout(()=>{

      const emitter = new Proton.Emitter();
      emitter.rate = new Proton.Rate(new Proton.Span(800, 1600), new Proton.Span(0.1, 0.25));
      emitter.addInitialize(new Proton.Body([new THREE.Sprite(particleSmokeMaterial1),new THREE.Sprite(particleSmokeMaterial2),new THREE.Sprite(particleSmokeMaterial3)]));
      emitter.addInitialize(new Proton.Mass(1));
      emitter.addInitialize(new Proton.Life(2, 4));
      emitter.addInitialize(new Proton.Position(new Proton.BoxZone(400,400,400)));
      emitter.addInitialize(new Proton.V(new Proton.Span(50, 100), new Proton.Vector3D(0, 1, 0), 400));
      emitter.addBehaviour(new Proton.Scale(new Proton.Span(2, 3), new Proton.Span(2.5, 3.5)));
      emitter.addBehaviour(new Proton.Alpha(1, 0));
      emitter.addBehaviour(new Proton.Gravity(0.3));
      emitter.addBehaviour(new Proton.Color('#000000', ['#1c1c1c', '#373737', '#000000'], Infinity, Proton.easeOutSine));
      emitter.emit('once');
      emitter.p.x = position.x;
      emitter.p.y = position.y;
      emitter.p.z = position.z;

      proton.addEmitter(emitter);

      emitters.push(emitter);
    },750);
  }
}

function createStackedGeometry(originalGeometry, offsetY) {
  // 如果原始几何体没有索引，生成索引
  if (!originalGeometry.index) {
    originalGeometry = originalGeometry.toNonIndexed();
  }

  // 克隆一个新的几何体用于位移操作
  const shiftedGeometry = originalGeometry.clone();

  // 遍历新的几何体顶点，将 y 值增加 offsetY
  const positionAttribute = shiftedGeometry.attributes.position;
  for (let i = 0; i < positionAttribute.count; i++) {
    positionAttribute.setY(i, positionAttribute.getY(i) + offsetY);
  }

  // 创建一个新的 BufferGeometry 用于存储最终合并的顶点和面
  const combinedGeometry = new THREE.BufferGeometry();

  // 合并 original 和 shifted 的顶点数据
  const combinedPositions = new Float32Array(originalGeometry.attributes.position.count * 2 * 3);
  combinedPositions.set(originalGeometry.attributes.position.array, 0);
  combinedPositions.set(shiftedGeometry.attributes.position.array, originalGeometry.attributes.position.count * 3);

  // 设置合并后的顶点数据到 combinedGeometry
  combinedGeometry.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));

  // 获取顶点数量
  const vertexCount = originalGeometry.attributes.position.count;

  // 创建新的索引数组来存储新的面数据
  const combinedIndices = [];

  // 连接上下两个几何体的边缘，生成侧面
  for (let i = 0; i < vertexCount; i++) {
    const a = i; // 原始顶点
    const b = (i + 1) % vertexCount; // 原始几何体中下一个顶点 (循环连接)
    const c = i + vertexCount; // 位移后几何体中的对应顶点
    const d = ((i + 1) % vertexCount) + vertexCount; // 位移后几何体中下一个顶点 (循环连接)

    // 形成两个三角形，连接上下两个几何体的边缘
    combinedIndices.push(a, c, b); // 三角形 a-c-b
    combinedIndices.push(b, c, d); // 三角形 b-c-d
  }

  // 设置索引到 combinedGeometry 中
  combinedGeometry.setIndex(combinedIndices);

  return combinedGeometry;
}

//初始化路径选择
function initYUKA(){
  const loader = new YUKA.NavMeshLoader();
  loader.load(base+'/models/0_9.glb').then((navigationMesh ) => {
    navMesh = navigationMesh;
    navMeshGroup = createConvexRegionHelper( navMesh );
    //scene.add( navMeshGroup );

    const edges = new THREE.EdgesGeometry( navMeshGroup.geometry );
    const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff ,depthTest:false,transparent:false } ) );
    line.renderOrder = 999;
    waterMessage.edgeLine = line;
    //scene.add( line );

    //console.log(navMeshGroup,line,edges);

/*    let gg = createStackedGeometry(navMeshGroup.geometry,100);
    let mesh = new THREE.Mesh( gg,new THREE.MeshBasicMaterial( { color: 0x00ff00 ,depthTest:false,transparent:true,wireframe:true } ) );
    scene.add(mesh);*/

/*    const waterBox = new THREE.Mesh(edges,new THREE.MeshBasicMaterial({color:0x03f3ea,depthTest:false,transparent:true,opacity:0.5,wireframe:true}));
    waterBox.renderOrder = 999;
    scene.add(waterBox);*/

    navEdgeVectors = [];
    const navEdgeVectors2d = [];
    const positionAttribute = edges.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positionAttribute, i);
      navEdgeVectors.push(vertex);
      navEdgeVectors2d.push(vertex.x, vertex.z);
    }

    graph = navMesh.graph;
    graphHelper = createGraphHelper(graph,10);
    //scene.add( graphHelper );

    graph.getNodes( nodes );
    nodes.map((n,i)=>{
      let p = n.position;
      threeNodes[i]=new THREE.Vector3(p.x,p.y,p.z);
    });

    water2Material = createWater2Material(navEdgeVectors2d);

    //todo-- 最早期测试代码
/*    const startPoint = new YUKA.Vector3(6993.680, 242.404, 41.674);
    const endPoint = new YUKA.Vector3(13447.365, 486.112 ,-4636.603);
    let path = navMesh.findPath(startPoint, endPoint);
    createBlueLine(path);*/
  })
}

//读取模型后处理操作
async function loadModel(model) {
  return new Promise((resolve, reject) => {
    loader.load(model.url, (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.position.set(0, 0, 0);

      doRayObjs(gltf.scene, model);


      if(model.onReady){
        model.onReady(gltf);
      }

      status.loaded++;
      loadposs.value = Math.round((status.loaded/config.models.length*100))+'%';
      if(status.loaded >= config.models.length){
        loading.value = false;
      }

      resolve(); // 成功加载后调用 resolve
    }, undefined, (error) => {
      reject(error); // 加载出错时调用 reject
    });
  });
}

//控制房顶显示或隐藏
function upsShowOrHide(show = true){
  let ups = status.ups;
  ups.map((up)=>{
/*    up.material.transparent = true;
    if(show){
      up.material.opacity = 1;
    }else{
      up.material.opacity = 0;
    }*/
    up.visible = show;
  })
}

function sync(entity, renderComponent) {
  renderComponent.matrix.copy(entity.worldMatrix);
}

function getWH(){
  const rect = container.value.getBoundingClientRect();
  wWidth = rect.width;
  wHeight = rect.height;
  console.log(wWidth,wHeight);
}
onMounted( async () => {
  getWH();

  //初始化场景
  scene = new THREE.Scene();

  //初始化相机
  camera = new THREE.PerspectiveCamera(75, wWidth/wHeight, 0.1, 9999999);
  camera.position.z = 5;

  //初始化渲染器
  renderer = new THREE.WebGLRenderer({antialias: true,alpha: true});
  //renderer = new WebGPURenderer(/*{antialias: true,alpha: true}*/);
  renderer.setSize(wWidth, wHeight);
  renderer.setPixelRatio( window.devicePixelRatio );
  container.value.appendChild(renderer.domElement);

  //初始化CSS2D渲染器
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize( wWidth, wHeight );
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.value.appendChild( labelRenderer.domElement );

  //追加轨道相机控制
  controls = new OrbitControls(camera, renderer.domElement);
/*  controls.enableDamping = true;
  controls.dampingFactor = 0.25;*/

  //追加全局光
  scene.add(new THREE.AmbientLight(0xffffff,1.0));

  // 初始化GLTFLoader并准备Decode压缩
  loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( base+'/libs/draco/' );
  loader.setDRACOLoader( dracoLoader );

  //初始化用于存放所有路线Mesh的group
  lineGroup = new THREE.Group();
  scene.add(lineGroup);

  //初始化textureLoader
  textureLoader = new THREE.TextureLoader();

  //读取线路texture
  lineTexture = textureLoader.load(imgLine0);
  lineTexture.wrapS = lineTexture.wrapT = THREE.RepeatWrapping;
  lineTexture.repeat.x = 10;

  //初始化默认调色
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(),0.04).texture;

  // 设置 Raycaster 和鼠标
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  //初始化粒子系统
  proton = new Proton();
  protonGroup = new THREE.Group();
  scene.add(protonGroup);
  protonSR = new Proton.SpriteRender(protonGroup)
  proton.addRender(protonSR);

  //初始化塌方group
  TFGroup = new THREE.Group();
  scene.add(TFGroup);

  //创建csgEvaluator
  waterMessage.csgEvaluator = new Evaluator();
  waterMessage.csgEvaluator.attributes = [ 'position', 'normal' ];
  waterMessage.csgEvaluator.useGroups = true;
  waterMessage.resultObject = new THREE.Mesh(new THREE.BufferGeometry(),water3Material);
  //waterMessage.resultObject = new THREE.Mesh(new THREE.BufferGeometry(),waterMessage.water.material);
  waterMessage.resultObject.frustumCulled  = false;
  //scene.add(waterMessage.resultObject);

  //读取粒子用贴图,初始化粒子用材质
  particleTexture = new THREE.TextureLoader().load(imgP0);
  particleTexture1 = new THREE.TextureLoader().load(imgP1);
  particleMaterial = new THREE.SpriteMaterial({
    map: particleTexture,
    color: 0xff0000,
    blending: THREE.AdditiveBlending,
    fog: true,
    depthTest :false,
    transparent :true
  });
  particleMaterial1 = new THREE.SpriteMaterial({
    map: particleTexture1,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    fog: true,
    depthTest :false,
    transparent :true
  })
  particleSmokeMaterial1 = new THREE.SpriteMaterial({
    map: new THREE.TextureLoader().load(imgS1),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    fog: true,
    depthTest :false,
    transparent :true
  });
  particleSmokeMaterial2 = new THREE.SpriteMaterial({
    map: new THREE.TextureLoader().load(imgS2),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    fog: true,
    depthTest :false,
    transparent :true
  })
  particleSmokeMaterial3 = new THREE.SpriteMaterial({
    map: new THREE.TextureLoader().load(imgS3),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    fog: true,
    depthTest :false,
    transparent :true
  })

  //寻路测试对象
  const vehicleGeometry = new THREE.ConeGeometry(20, 40, 8);
  vehicleGeometry.rotateX(Math.PI * 0.5);
  const vehicleMaterial = new THREE.MeshNormalMaterial({depthTest:false});
  const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
  vehicleMesh.matrixAutoUpdate = false;
  vehicleMesh.renderOrder = 999;
  vehicleMesh.visible = false;
  scene.add(vehicleMesh);
  vehicle = new YUKA.Vehicle();
  vehicle.setRenderComponent(vehicleMesh, sync);


  //初始化寻路基础对象
  entityManager = new YUKA.EntityManager();
  time = new YUKA.Time();
  entityManager.add(vehicle);

  //初始化滤镜相关
/*  composer = new EffectComposer( renderer );
  const clearPass = new ClearPass( 'black', 1.0 );
  composer.addPass(clearPass);
  const renderPass = new RenderPass( scene, camera );
  composer.addPass( renderPass );
  outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
  composer.addPass( outlinePass );
  outlinePass.edgeStrength = 6.0;
  outlinePass.edgeGlow = 2.5;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0.0;
  outlinePass.hiddenEdgeColor = new THREE.Color(0x1165d6);
  outlinePass.visibleEdgeColor = new THREE.Color(0x1165d6);
  const outputPass = new OutputPass();
  composer.addPass( outputPass );
  effectFXAA = new ShaderPass( FXAAShader );
  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
  composer.addPass( effectFXAA );*/

/*  const position = [];
  for(let i = 0; i < path._waypoints.length; i++) {
    const waypoint = path._waypoints[i];
    position.push(waypoint.x, waypoint.y, waypoint.z);
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));

  const lineMaterial = new THREE.LineBasicMaterial({color: 0x000000});
  const lines = new THREE.LineLoop(lineGeometry, lineMaterial);
  scene.add(lines);*/

  //entityManager.add(vehicle);

  //resize事件处理
  // 处理鼠标点击事件
  //window.addEventListener('click', onMouseClick);

  //读取GLB文件
  /*  loader.load('/models/GCZTD.glb', (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.position.set(0, 0, 0);

      rePerspective();
    }, undefined, (error) => {
      console.error('An error happened:', error);
    });*/
  let models = config.models;
  /*models.forEach(model => {
    loader.load(model.url,(gltf)=>{
      scene.add(gltf.scene);
      gltf.scene.position.set(0, 0, 0);

      status.loaded++;

      if(status.loaded >= models.length){
        rePerspective();

        //初始化寻路系统
        initYUKA();
      }

      doRayObjs(gltf.scene,model);

      if(gltf.scene.name === 'test'){
        doTest(gltf.scene);
      }

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });
      }
    });
  });*/
  const promises = models.map(model => loadModel(model));

  // 使用 Promise.all 等待所有模型加载完成
  await Promise.all(promises);

  // 在所有模型加载完成后执行以下操作
  rePerspective();
  initYUKA();

  window.addEventListener('resize', onWindowResize);

  //开始动画循环
  animate();

  window.camera = camera;
  window.controls = controls;

  initBottom();
});

onBeforeUnmount(() => {

  clearEmitters();

  config.models.forEach((model)=>{
    model.rayObjs = [];
    model.rayLabels = [];
  })

  clearScene(scene);
  scene = null;

  if(ao){
    cancelAnimationFrame(ao);
    ao = null;
  }

  clearAllLabels();
  devicesInDisasters =[];

  window.removeEventListener('resize', onWindowResize);
  //window.removeEventListener('click', onMouseClick);
  renderer.dispose();
});

//todo --变量名起真乱，抽个时间整理下吧
function animate(time2) {
  ao = requestAnimationFrame(animate);

  // 更新proton
  proton.update();

  //更新路线规划
  const delta = time.update().getDelta();
  entityManager.update(delta);

  controls.update();
  renderer.render(scene, camera);
  //composer.render();
  labelRenderer.render( scene, camera );

  const delta2 = clock.getDelta();
  if(mixer){
    if(!disasters.length)
      mixer.update(delta2);
  }
  for(let a in mixerTFS){
    mixerTFS[a].update(delta2);
  }

  if(water2Material)
    water2Material.uniforms.iTime.value += 0.05;

  if(water3Material)
    water3Material.uniforms.iTime.value += 0.05;

  if(waterMessage.water){
    //waterMessage.water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
  }

  lineTexture.offset.x-=0.05;

  TWEEN.update(time2);

  // console.log(camera.position,controls.target);


}

function onWindowResize() {
  getWH();

  camera.aspect = wWidth / wHeight;
  camera.updateProjectionMatrix();
  //composer.setSize(window.innerWidth, window.innerHeight);
  renderer.setSize(wWidth, wHeight);
  labelRenderer.setSize( wWidth, wHeight );

  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / wWidth, 1 / wHeight );
}

function onMouseClick(event) {
  // 计算鼠标在标准设备坐标 (-1到+1) 范围内的位置
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // 更新 Raycaster
  raycaster.setFromCamera(mouse, camera);

  // 计算与场景中的对象交点
  const intersects = raycaster.intersectObjects(config.models[0].rayObjs);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    if(intersectedObject.userData.label){
      intersectedObject.userData.label.visible = true;
    }
    // 可以在这里添加对交点对象的处理逻辑，比如高亮显示、弹出信息等
  }
}

</script>

<style>
.three-container {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background-color: transparent;
  /*background-color: #000;*/

  .label{
    width: 200px;
    height: 120px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: rgba(255, 255, 255, 0.5);
    transform: translate(-50%,0);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

    .title{
      position: relative;
      width: 100%;
      height: 50px;
      line-height: 50px;
      text-align: center;
    }
    .story{
      position: relative;
      width: 100%;
      height: 350px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-left: 15px;
      padding-right: 15px;

      .item{
        text-align: left;
      }
    }

  }
}

.tools{
  position: absolute;
  bottom: 0;
  left: 0;
  height: 40px;
  line-height: 40px;
  width: 100vw;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;

  background-color: rgba(255,255,255,0.5);
}

/* HTML: <div class="loader"></div> */

.mask{
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color:#fff;

  .text{
    font-size: 30px;
    margin-top: 5px;
    font-family: monospace;
  }

  .loader {
    font-weight: bold;
    font-family: monospace;
    display: inline-grid;
    font-size: 30px;
  }
  .loader:before,
  .loader:after {
    content:"Loading...";
    grid-area: 1/1;
    -webkit-mask-size: 100% 5px,100% 100%;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: l35-1 1s infinite;
  }
  .loader:before {
    -webkit-mask-image:
        linear-gradient(#fff 0 0),
        linear-gradient(#fff 0 0);
  }
  .loader:after {
    -webkit-mask-image:
        linear-gradient(#fff 0 0);
    animation:
        l35-1  1s infinite,
        l35-2 .2s infinite cubic-bezier(0.5,200,0.5,-200);
  }
}

.switch{
  position: absolute;
  width: 100%;
  height: 37px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  left: 0;
  top:12%;


  .button{
    border:0;
    background: transparent;
    font-size: 22px;
    height: 37px;
    line-height: 37px;
    text-align: center;
    color: #ccc;
    border-radius: 4px;
    min-width: 180px;
    font-family: MyFont2;
    position: relative;
    cursor: pointer;

    div{
      width:136px;
      height:42px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: 0;
      background-repeat: no-repeat;
      background-image: url("../assets/img/bg_tab_select.png");
      display: none;
    }
  }

  .selected{
    color:#fff;

    div{
      display: block;
    }
  }
}


@keyframes l35-1{
  0%   {-webkit-mask-position:0 20px,0 0}
  20%  {-webkit-mask-position:0 8px ,0 0}
  40%  {-webkit-mask-position:0 100%,0 0}
  60%  {-webkit-mask-position:0 3px ,0 0}
  80%  {-webkit-mask-position:0 15px,0 0}
  100% {-webkit-mask-position:0 0   ,0 0}
}
@keyframes l35-2{
  100% {transform:translate(0.1px)}
}
</style>
