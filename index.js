import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let scene;
let renderer;
let camera;
let controls;
let canvas = document.getElementById("c");

const group = new THREE.Group();

init();

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });

  //

  camera = new THREE.PerspectiveCamera(
    45,
    canvas.innerWidth / canvas.innerHeight,
    1,
    10000
  );

  const pos = {
    x: -214.44738415794845,
    y: 57.45155487044122,
    z: 270.66223699911563,
  };
  camera.position.copy(pos);

  window._camera = camera;

  scene = new THREE.Scene();
  scene.background = new THREE.Color("black");

  let directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(100, 100, 100);
  scene.add(directionalLight);

  const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  // scene.add(helper);

  let ambient = new THREE.AmbientLight(0xffffff, 0.3);
  // scene.add(ambient);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.enablePan = true;
  controls.enableDamping = true;

  window._controls = controls;

  const gridHelper = new THREE.GridHelper(100, 50, 0x808080, 0x808080);
  gridHelper.position.y = 0;
  gridHelper.position.x = 0;
  // scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  // 地球本体
  const earthGeometry = new THREE.SphereGeometry(100, 100, 100);
  // 材质
  const meshBasic = new THREE.MeshLambertMaterial({ color: "#1c1ca7" });
  const mesh = new THREE.Mesh(earthGeometry, meshBasic);
  group.add(mesh);

  const imgData = await getImgData();
  const earthParticles = createEarthParticles(imgData.data, imgData.image);

  group.add(earthParticles[0]);
  group.add(earthParticles[1]);

  scene.add(group);

  group.rotation.y = 85;
}

function getImgData() {
  const earthImg = document.createElement("img");
  earthImg.src = "./map.png";
  return new Promise((resolve) => {
    earthImg.onload = () => {
      const earthCanvas = document.createElement("canvas");
      const earthCtx = earthCanvas.getContext("2d");
      earthCanvas.width = earthImg.width;
      earthCanvas.height = earthImg.height;
      earthCtx?.drawImage(earthImg, 0, 0, earthImg.width, earthImg.height);
      const earthImgData = earthCtx?.getImageData(
        0,
        0,
        earthImg.width,
        earthImg.height
      );
      resolve({ data: earthImgData, image: earthImg });
    };
  });
}

function createEarthParticles(earthImgData, earthImg) {
  const particles = [];
  const positions = [];
  const sizes = [];
  for (let i = 0; i < 2; i++) {
    positions[i] = {
      positions: [],
    };
    sizes[i] = {
      sizes: [],
    };
  }
  const material = new THREE.PointsMaterial();
  material.size = 1;
  material.color = new THREE.Color("#fff");
  material.map = new THREE.TextureLoader().load("./dot.png");
  material.depthWrite = false;
  material.transparent = true;
  material.opacity = 0.5;
  material.side = THREE.FrontSide;
  material.blending = THREE.AdditiveBlending;

  const spherical = new THREE.Spherical();
  spherical.radius = 100;
  const step = 300;
  for (let i = 0; i < step; i++) {
    const vec = new THREE.Vector3();
    const radians = 1 - Math.sin((i / step) * Math.PI) + 1;
    for (let j = 0; j < step; j += radians) {
      const c = j / step;
      const f = i / step;
      const index = Math.floor(2 * Math.random());
      const pos = positions[index];
      const size = sizes[index];
      if (
        isLand(c, f, {
          earthImgData: earthImgData,
          width: earthImg.width,
          height: earthImg.height,
        })
      ) {
        spherical.theta = c * Math.PI * 2 - Math.PI / 2;
        spherical.phi = f * Math.PI;
        vec.setFromSpherical(spherical);
        pos.positions.push(vec.x);
        pos.positions.push(vec.y);
        pos.positions.push(vec.z);
        if (j % 3 === 0) {
          size.sizes.push(1.0);
        }
      }
    }
  }
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const size = sizes[i];
    const geometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(pos.positions.length);
    const sizeArray = new Float32Array(size.sizes.length);
    for (let j = 0; j < pos.positions.length; j++) {
      positionArray[j] = pos.positions[j];
    }
    for (let j = 0; j < size.sizes.length; j++) {
      sizeArray[j] = size.sizes[j];
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positionArray, 3)
    );
    geometry.setAttribute("size", new THREE.BufferAttribute(sizeArray, 1));
    geometry.computeBoundingSphere();
    const particle = new THREE.Points(geometry, material);
    particles.push(particle);
  }
  return particles;
}

function isLand(u, v, { earthImgData, width, height }) {
  // 计算对应的像素坐标
  const x = Math.floor(u * width);
  const y = Math.floor(v * height);

  // 确保坐标在合法范围内
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false; // 超出范围返回 false
  }

  // 获取像素的颜色数据
  const index = (y * width + x) * 4; // 每个像素有四个通道（RGBA）
  const r = earthImgData.data[index]; // 红色通道
  const g = earthImgData.data[index + 1]; // 绿色通道
  const b = earthImgData.data[index + 2]; // 蓝色通道
  const a = earthImgData.data[index + 3]; //

  // 判断颜色值是否表示陆地
  if (a > 0) {
    return true;
  }

  return false; // 否则认为是水域
}

function createPosition(lnglat) {
  const spherical = new THREE.Spherical();
  spherical.radius = 100;
  const lng = lnglat[0];
  const lat = lnglat[1];
  const theta = (lng + 90) * (Math.PI / 180);
  const phi = (90 - lat) * (Math.PI / 180);
  spherical.phi = phi;
  spherical.theta = theta;
  const position = new THREE.Vector3();
  position.setFromSpherical(spherical);

  return position;
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}

function render() {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  controls.update();
  renderer.render(scene, camera);
  group.rotation.y += 0.002;
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
