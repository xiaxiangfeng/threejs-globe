import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

class CircleLineGeometry extends THREE.BufferGeometry {
  constructor(radius = 1, segmentCount = 32) {
    super();

    this.type = "CircleLineGeometry";

    this.parameters = { radius, segmentCount };

    const points = [];
    for (let i = 0; i <= segmentCount; i++) {
      const theta = (i / segmentCount - 0.25) * Math.PI * 2;
      points.push({
        x: Math.cos(theta) * radius,
        y: Math.sin(theta) * radius,
        z: 0,
      });
    }
    this.setFromPoints(points);
  }
}

function getRandomColor() {
  // 确保生成的颜色是明亮的，通常亮色的 R、G、B 值较高
  const r = Math.floor(Math.random() * 128) + 128; // 红色分量：128-255
  const g = Math.floor(Math.random() * 128) + 128; // 绿色分量：128-255
  const b = Math.floor(Math.random() * 128) + 128; // 蓝色分量：128-255
  return `rgb(${r}, ${g}, ${b})`;
}

let scene;
let renderer;
let camera;
let controls;
let canvas = document.getElementById("c");
let ArcMaterial = [];
let time = 0;

const GLOBE_RADIUS = 100;
const group = new THREE.Group();
const circles = [];

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
  directionalLight.position.set(GLOBE_RADIUS, GLOBE_RADIUS, GLOBE_RADIUS);
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

  const gridHelper = new THREE.GridHelper(GLOBE_RADIUS, 50, 0x808080, 0x808080);
  gridHelper.position.y = 0;
  gridHelper.position.x = 0;
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  // 地球本体
  const earthGeometry = new THREE.SphereGeometry(
    GLOBE_RADIUS,
    GLOBE_RADIUS,
    GLOBE_RADIUS
  );
  // 材质
  const meshBasic = new THREE.MeshLambertMaterial({ color: "#1c1ca7" });
  const mesh = new THREE.Mesh(earthGeometry, meshBasic);
  group.add(mesh);

  const imgData = await getImgData();
  const earthParticles = createEarthParticles(imgData.data, imgData.image);

  group.add(earthParticles[0]);
  group.add(earthParticles[1]);

  scene.add(group);

  const city = [
    {
      s: { lat: 39.9042, lng: 116.4074 },
      e: { lat: 3.2028, lng: 73.2207 },
    },
    {
      s: { lat: 39.9042, lng: 116.4074 },
      e: { lat: 40.68007900420875, lng: -73.98802300054996 },
    },
    {
      s: { lat: 30.5728, lng: 104.0668 },
      e: { lat: 21.3069, lng: 157.8583 },
    },
    {
      s: { lat: 29.652, lng: 91.172 },
      e: { lat: 51.5074, lng: 0.1278 },
    },
    {
      s: { lat: -25.746, lng: 28.1881 },
      e: { lat: 19.4326, lng: 0.1332 },
    },
  ];

  city.forEach((item) => {
    arcCurve(item.s, item.e);
    const color = getRandomColor();
    circles.push(Circle(item.s, Math.random() * 2.5 + 0.5, color));
    circles.push(Circle(item.e, Math.random() * 3 + 0.5, color));
  });

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
  spherical.radius = GLOBE_RADIUS;
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

function arcCurve(s, e) {
  const vertexShader = `
    uniform float time;
    uniform float size;
    uniform float len;
    uniform vec3 bcolor;
    uniform vec3 fcolor;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vIntensity;
    
    void main() {
      // 初始化变量
      vAlpha = 0.3;  // 基础可见度，让整条弧线始终有一定可见度
      vColor = bcolor;
      vIntensity = 0.0;
      
      // 获取当前点在曲线上的位置
      float curvePos = uv.x;
      
      // 计算到动画点的距离
      float d = curvePos - time;
      
      // 循环动画，处理从弧线尾部到头部的过渡
      if (d < -0.5) d += 1.0;
      
      // 计算光效强度，使用平滑过渡而非硬切换
      float intensity = 1.0 - smoothstep(0.0, len * 1.2, abs(d));
      
      // 添加二次波动效果
      float pulseEffect = 0.4 * (1.0 + sin(curvePos * 30.0 + time * 12.0));
      
      // 计算扰动系数，根据曲线位置变化
      float distortion = size * (intensity + pulseEffect * 0.3);
      
      // 应用法线方向扰动
      vec3 pos = position + normal * distortion;
      
      // 保存光效强度给片段着色器
      vIntensity = intensity;
      
      // 根据强度混合颜色
      vColor = mix(bcolor, fcolor, intensity);
      
      // 增强主光效部分的alpha值
      vAlpha = mix(0.3, 1.0, intensity * (1.0 + pulseEffect * 0.5));
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }`;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    varying float vIntensity;
    
    void main() {
      // 添加一点外发光效果
      float glow = smoothstep(0.4, 1.0, vIntensity);
      vec3 finalColor = mix(vColor, vColor * 1.5, glow);
      
      gl_FragColor = vec4(finalColor, vAlpha);
    }`;

  // 转换为三维坐标
  const start = createPosition([s.lng, s.lat]);
  const end = createPosition([e.lng, e.lat]);

  // 计算直线距离来决定中点的高度
  const distance = start.distanceTo(end);
  
  // 根据距离动态调整中点高度 - 距离越远，弧线越高
  const heightFactor = Math.min(1.8, Math.max(1.3, distance / 100));
  
  // 计算中间点（抬高的中间点，以模拟弧线）
  const mid = start.clone().lerp(end, 0.5).normalize().multiplyScalar(GLOBE_RADIUS * heightFactor);

  // 创建弧线的控制点
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

  // 根据弧线生成几何体
  const points = curve.getPoints(100); // 生成更多的点可以让弧线更平滑
  
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.round(points.length * 0.6), // 增加分段数提高平滑度
    0.1,  // 适当的弧线粗细
    12,    // 增加管道分段，使圆滑度更好
    false
  );

  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending, // 使用加法混合让颜色更亮
    uniforms: {
      time: { value: 0.0 },
      len: { value: 0.15 },  // 流动效果的长度
      size: { value: 0.03 }, // 弧线凸起大小
      bcolor: { value: new THREE.Color("black") },
      fcolor: { value: new THREE.Color(0xbfe3dd) },
    },
    vertexShader,
    fragmentShader,
  });

  ArcMaterial.push(material);

  // 使用Mesh而不是Line，因为我们有TubeGeometry
  const arc = new THREE.Mesh(geometry, material);

  // 将弧线添加到场景中
  group.add(arc);
}

function Circle(lnglat, radius, color) {
  const circleObj = new THREE.Line(
    new CircleLineGeometry(1, 60),
    new THREE.LineBasicMaterial({ color })
  );
  const circleGroup = new THREE.Group();

  circleGroup.add(circleObj);

  group.add(circleGroup);

  const position = createPosition([lnglat.lng, lnglat.lat]);
  circleGroup.position.copy(position);

  const globeCenter = scene.localToWorld(new THREE.Vector3(0, 0, 0));
  circleGroup.lookAt(globeCenter);

  const curveR = GLOBE_RADIUS * (1 + 0.0015);
  const maxAngle = (radius * Math.PI) / 180; // in radians

  return (t) => {
    const ang = t * maxAngle;
    circleObj.scale.x = curveR * Math.sin(ang);
    circleObj.scale.y = curveR * Math.sin(ang);
    circleObj.position.z = curveR * (1 - Math.cos(ang));
  };
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

  const duration = 3000; // 增加动画周期
  const t = (performance.now() % duration) / duration;

  if (circles.length > 0) {
    circles.forEach((item) => {
      item(t);
    });
  }

  // 减慢地球旋转速度，便于观察弧线效果
  group.rotation.y += 0.0005;

  if (ArcMaterial?.length > 0) {
    // 使用sin函数让动画速度有所变化，更加自然
    const sinTime = Math.sin(performance.now() * 0.0005) * 0.5 + 0.5;
    const speed = 0.008 + sinTime * 0.004;
    
    if (time >= 1.0) {
      time = 0.0;
    }
    time = time + speed;
    ArcMaterial.forEach((item) => {
      item.uniforms.time.value = time;
    });
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

