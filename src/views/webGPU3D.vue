<script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue';
  import * as THREE from 'three';
  import {OrbitControls} from "three/addons";
  import CameraControls from 'camera-controls';
  import {GLTFLoader} from "three/addons";
  import WebGPURenderer from "three/src/renderers/webgpu/WebGPURenderer.js";
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

  import { color, vec2, pass, linearDepth, normalWorld, triplanarTexture, texture, objectPosition, viewportTopLeft, viewportLinearDepth, viewportDepthTexture, viewportSharedTexture, mx_worley_noise_float, positionWorld, timerLocal ,PostProcessing } from 'three/tsl';

  //import Proton from "three.proton.js";

  CameraControls.install( { THREE: THREE } );

  const config = {
    models:[
      {name: '地上', url: '/models/GCZTD2.glb',rayNames:[],rayObjs:[],rayLabels:{},isStage:true},
      {name: '地下', url: '/models/2_3.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:()=>{},isStage:true},
      {name: '测试', url: '/models/test2.glb',rayNames:[],rayObjs:[],rayLabels:{}},
      {name: '塌方', url: '/models/t2.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:()=>{},},
      {name: '寻路模型测试', url: '/0_9.glb',rayNames:[],rayObjs:[],rayLabels:{},onReady:()=>{}},
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

  const container = ref(null);

  let camera, scene, renderer, clock;
  let postProcessing;
  let controls;
  let loader;
  let animateObj;

  function init(){
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera = new THREE.PerspectiveCamera( 50, width / height, 0.25, 999999 );

    scene = new THREE.Scene();
    //scene.backgroundNode = normalWorld.y.mix( color( 0x0487e2 ), color( 0x0066ff ) );

    renderer = new WebGPURenderer(/*{antialias: true,alpha: false}*/);
    renderer.setSize(width, height);
    renderer.setPixelRatio( window.devicePixelRatio );
    container.value.appendChild(renderer.domElement);

    const waterAmbientLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 5 );
    const skyAmbientLight = new THREE.HemisphereLight( 0xffffff, 0, 1 );

    scene.add( skyAmbientLight );
    scene.add( waterAmbientLight );

    loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( '/libs/draco/' );
    loader.setDRACOLoader( dracoLoader );

    controls = new CameraControls( camera, renderer.domElement );

    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xffffff,1));

    initWater();

  }

  function initWater(){
    // water

    const timer = timerLocal( .8 );
    const floorUV = positionWorld.xzy;

    const waterLayer0 = mx_worley_noise_float( floorUV.mul( 4 ).add( timer ) );
    const waterLayer1 = mx_worley_noise_float( floorUV.mul( 2 ).add( timer ) );

    const waterIntensity = waterLayer0.mul( waterLayer1 );
    const waterColor = waterIntensity.mul( 1.4 ).mix( color( 0x0487e2 ), color( 0x74ccf4 ) );

    // linearDepth() returns the linear depth of the mesh
    const depth = linearDepth();
    const depthWater = viewportLinearDepth.sub( depth );
    const depthEffect = depthWater.remapClamp( - .002, .04 );

    const refractionUV = viewportTopLeft.add( vec2( 0, waterIntensity.mul( .1 ) ) );

    // linearDepth( viewportDepthTexture( uv ) ) return the linear depth of the scene
    const depthTestForRefraction = linearDepth( viewportDepthTexture( refractionUV ) ).sub( depth );

    const depthRefraction = depthTestForRefraction.remapClamp( 0, .1 );

    const finalUV = depthTestForRefraction.lessThan( 0 ).cond( viewportTopLeft, refractionUV );

    const viewportTexture = viewportSharedTexture( finalUV );

    const waterMaterial = new MeshBasicNodeMaterial();
    waterMaterial.colorNode = waterColor;
    waterMaterial.backdropNode = depthEffect.mix( viewportSharedTexture(), viewportTexture.mul( depthRefraction.mix( 1, waterColor ) ) );
    waterMaterial.backdropAlphaNode = depthRefraction.oneMinus();
    waterMaterial.transparent = true;

    const water = new THREE.Mesh( new THREE.BoxGeometry( 50, .001, 50 ), waterMaterial );
    water.position.set( 0, 0, 0 );
    scene.add( water );
  }

  async function loadResource(){

    const promises = config.models.map(model => loadModel(model));

    // 使用 Promise.all 等待所有模型加载完成
    await Promise.all(promises);

  }

  async function loadModel(model){
    return new Promise((resolve, reject) => {
      loader.load(model.url, (gltf) => {
        if(model.isStage)
          scene.add(gltf.scene);

        if(model.onReady){
          model.onReady(gltf);
        }

        resolve(); // 成功加载后调用 resolve
      }, undefined, (error) => {
        reject(error); // 加载出错时调用 reject
      });
    });
  }

  function animate(){
    animateObj = requestAnimationFrame(animate);

    const delta = clock.getDelta();

    controls.update(delta);

    renderer.render(scene, camera);
  }
  function resize(){

  }

  onMounted(async ()=>{

    init();
    //initWater();
    animate();

    await loadResource();
    rePerspective();

  })
  onBeforeUnmount(()=>{

  })

  //获取当前场景包围盒和包围球，以此来重置相机
  function rePerspective(){

    let rs = getRS(scene);
    let sphere = rs.sphere;
    let box = rs.box;

    controls.fitToSphere(scene,true);
    controls.minDistance = sphere.radius/100;
    controls.maxDistance = sphere.radius*1.5;

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
</script>

<template>
  <div ref="container" class="three-container"></div>
</template>

<style scoped>
.three-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  background-color: #000000;

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
</style>