import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const DPR = Math.min(window.devicePixelRatio, 2);

// Shared boilerplate: sizes to the canvas box, only renders while on screen.
function base(canvas, { alpha = false, clear = 0x0d0d0f } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  if (!alpha) renderer.setClearColor(clear, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const mouse = new THREE.Vector2();
  const mouseSmooth = new THREE.Vector2();
  let visible = true;
  let w = 1, h = 1;

  const resize = () => {
    w = canvas.clientWidth || 1; h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });

  const loop = (fn) => {
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      mouseSmooth.lerp(mouse, 0.06);
      fn(clock.elapsedTime, dt);
      renderer.render(scene, camera);
    });
  };
  return { renderer, scene, camera, mouse: mouseSmooth, loop, size: () => ({ w, h }) };
}

/* ---------- Hero: a drift of glossy rings & capsules ---------- */
export function heroScene(canvas) {
  const { renderer, scene, camera, mouse, loop } = base(canvas);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  camera.position.set(0, 0, 18);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 8, 6); scene.add(key);
  const rim = new THREE.PointLight(0xff4f1f, 60, 40); rim.position.set(-8, -4, 4); scene.add(rim);

  const mats = [
    new THREE.MeshPhysicalMaterial({ color: 0xff4f1f, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
    new THREE.MeshPhysicalMaterial({ color: 0xefebe3, roughness: 0.45, clearcoat: 0.6 }),
    new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.12, clearcoat: 1, metalness: 0.2 }),
  ];
  const geos = [
    new THREE.TorusGeometry(1, 0.42, 32, 64),
    new THREE.CapsuleGeometry(0.55, 1.6, 12, 24),
    new THREE.TorusKnotGeometry(0.8, 0.28, 128, 24, 2, 3),
  ];

  const bodies = [];
  const COUNT = window.innerWidth < 700 ? 22 : 40;
  for (let i = 0; i < COUNT; i++) {
    const m = new THREE.Mesh(geos[i % 3], mats[(i * 7) % 3]);
    const home = new THREE.Vector3((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8 - 2);
    m.position.copy(home);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const s = 0.7 + Math.random() * 0.8;
    m.scale.setScalar(s);
    scene.add(m);
    bodies.push({ m, home, vel: new THREE.Vector3(), spin: new THREE.Vector3().randomDirection().multiplyScalar(0.3), seed: Math.random() * 10 });
  }

  const pointer3 = new THREE.Vector3();
  loop((t, dt) => {
    pointer3.set(mouse.x * 13, mouse.y * 6, 1);
    for (const b of bodies) {
      const target = b.home.clone();
      target.y += Math.sin(t * 0.6 + b.seed) * 0.6;
      target.x += Math.cos(t * 0.4 + b.seed) * 0.4;
      const toMouse = b.m.position.clone().sub(pointer3);
      const d = toMouse.length();
      if (d < 4.5) target.add(toMouse.normalize().multiplyScalar((4.5 - d) * 1.6));
      b.vel.add(target.sub(b.m.position).multiplyScalar(dt * 2.4)).multiplyScalar(0.92);
      b.m.position.add(b.vel);
      b.m.rotation.x += b.spin.x * dt + b.vel.y * 0.2;
      b.m.rotation.y += b.spin.y * dt + b.vel.x * 0.2;
    }
    camera.position.x = mouse.x * 0.8;
    camera.position.y = mouse.y * 0.5;
    camera.lookAt(0, 0, 0);
  });
}

/* ---------- Full-screen shader plane (reel + expertise) ---------- */
export function flowScene(canvas, { colors = ['#ff4f1f', '#0d0d0f', '#d6ff3f'] } = {}) {
  const { scene, camera, mouse, loop, size } = base(canvas);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2() },
    uMouse: { value: new THREE.Vector2() },
    uA: { value: new THREE.Color(colors[0]) },
    uB: { value: new THREE.Color(colors[1]) },
    uC: { value: new THREE.Color(colors[2]) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform vec3 uA, uB, uC; varying vec2 vUv;
      vec2 hash(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(dot(hash(i),f), dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x), mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)), dot(hash(i+vec2(1)),f-vec2(1)),u.x),u.y); }
      float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
      void main(){
        vec2 uv = vUv; vec2 p = (uv-.5) * vec2(uRes.x/uRes.y, 1.);
        p += uMouse * .08;
        float t = uTime * .12;
        vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 - t + 4.2));
        float f = fbm(p*2.2 + q*2.4 + t*1.5);
        vec3 col = mix(uB, uA, smoothstep(-.25, .45, f));
        col = mix(col, uC, smoothstep(.35, .75, f + q.x*.3) * .75);
        float bands = sin((f + length(p)) * 40. - uTime) * .5 + .5;
        col += pow(bands, 18.) * .12;
        col *= 1. - .35 * length(uv-.5);
        col += (fract(sin(dot(uv*uTime, vec2(12.9,78.2)))*43758.5)-.5) * .05;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  loop((t) => {
    const { w, h } = size();
    uniforms.uTime.value = t;
    uniforms.uRes.value.set(w, h);
    uniforms.uMouse.value.copy(mouse);
  });
}

/* ---------- Voyage: chrome orb drifting through a warp tunnel ---------- */
export function voyageScene(canvas, getProgress) {
  const { renderer, scene, camera, mouse, loop } = base(canvas);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  camera.position.set(0, 0, 10);

  // Voyager: chrome orb with an orbiting halo and a small ember core
  const voyager = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 8),
    new THREE.MeshPhysicalMaterial({ color: 0xdedad2, metalness: 1, roughness: 0.08, iridescence: 0.6, iridescenceIOR: 1.6 })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.035, 16, 160),
    new THREE.MeshBasicMaterial({ color: 0xff4f1f })
  );
  halo.rotation.x = Math.PI / 2.4;
  const halo2 = halo.clone();
  halo2.material = new THREE.MeshBasicMaterial({ color: 0xefebe3, transparent: true, opacity: 0.4 });
  halo2.scale.setScalar(1.25);
  halo2.rotation.set(Math.PI / 1.8, 0.4, 0);
  const core = new THREE.PointLight(0xff4f1f, 30, 12);
  voyager.add(shell, halo, halo2, core);
  scene.add(voyager);

  // Warp tunnel particles
  const N = 5000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const palette = [new THREE.Color('#ff4f1f'), new THREE.Color('#efebe3'), new THREE.Color('#d6ff3f'), new THREE.Color('#7b61ff')];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 9;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * 160], i * 3);
    const c = palette[Math.random() < 0.55 ? 1 : (1 + Math.floor(Math.random() * 3)) % 4];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts);

  const ringGlow = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.6, 128),
    new THREE.MeshBasicMaterial({ color: 0xff4f1f, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  ringGlow.position.z = -2;
  scene.add(ringGlow);

  const bg = new THREE.Color();
  const c0 = new THREE.Color('#0d0d0f'), c1 = new THREE.Color('#1a0904'), c2 = new THREE.Color('#ff4f1f');
  loop((t, dt) => {
    const p = getProgress();
    const warp = THREE.MathUtils.smoothstep(p, 0.25, 0.8);
    const speed = 2 + warp * 90;
    const arr = g.attributes.position.array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 2] += speed * dt;
      if (arr[i * 3 + 2] > 10) arr[i * 3 + 2] -= 160;
    }
    g.attributes.position.needsUpdate = true;
    pts.material.opacity = THREE.MathUtils.smoothstep(p, 0.15, 0.35);
    pts.material.size = 0.05 + warp * 0.12;

    const s = THREE.MathUtils.lerp(1, 0.35, THREE.MathUtils.smoothstep(p, 0.2, 0.6));
    voyager.scale.setScalar(s * (1 + Math.sin(t * 1.4) * 0.02));
    voyager.position.set(mouse.x * 0.8, Math.sin(t * 0.8) * 0.25 + mouse.y * 0.4 - p * 0.5, 0);
    voyager.rotation.y = t * 0.3;
    halo.rotation.z = t * 0.6;
    halo2.rotation.z = -t * 0.4;
    ringGlow.scale.setScalar(1 + warp * 3 + Math.sin(t * 2) * 0.03);
    ringGlow.material.opacity = 0.25 * (1 - warp);

    if (p < 0.85) bg.copy(c0).lerp(c1, warp);
    else bg.copy(c1).lerp(c2, THREE.MathUtils.smoothstep(p, 0.85, 1));
    renderer.setClearColor(bg, 1);
    camera.rotation.z = warp * t * 0.15;
    camera.fov = 35 + warp * 30;
    camera.updateProjectionMatrix();
  });
}

/* ---------- Particle field that scatters away from the cursor ---------- */
export function scatterScene(canvas, { dark = false, count = 900, colors = ['#0d0d0f', '#ff4f1f', '#7b61ff', '#d6ff3f'] } = {}) {
  const { renderer, scene, camera, mouse, loop } = base(canvas, { alpha: true });
  renderer.setClearColor(0x000000, 0);
  camera.position.z = 30;
  const shapes = [new THREE.OctahedronGeometry(0.35), new THREE.TorusGeometry(0.3, 0.1, 8, 20), new THREE.SphereGeometry(0.28, 12, 12), new THREE.BoxGeometry(0.4, 0.4, 0.4)];
  const groups = shapes.map((geo, gi) => {
    const n = Math.floor(count / shapes.length);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: colors[gi % colors.length] }), n);
    scene.add(mesh);
    const data = Array.from({ length: n }, () => {
      // Concentrate particles in a band along the lower edge, like drifting confetti
      const home = new THREE.Vector3((Math.random() - 0.5) * 60, -8 - Math.pow(Math.random(), 2) * 10 + (Math.random() < 0.25 ? Math.random() * 26 : 0), (Math.random() - 0.5) * 10);
      return { home, p: home.clone(), v: new THREE.Vector3(), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: 0.6 + Math.random() };
    });
    return { mesh, data };
  });
  const dummy = new THREE.Object3D();
  const m3 = new THREE.Vector3();
  loop((t, dt) => {
    m3.set(mouse.x * 27, mouse.y * 16, 0);
    for (const { mesh, data } of groups) {
      data.forEach((d, i) => {
        const target = d.home.clone();
        target.y += Math.sin(t + d.home.x) * 0.4;
        const diff = d.p.clone().sub(m3);
        const dist = diff.length();
        if (dist < 7) target.add(diff.normalize().multiplyScalar((7 - dist) * 1.4));
        d.v.add(target.sub(d.p).multiplyScalar(dt * 3)).multiplyScalar(0.9);
        d.p.add(d.v);
        d.r.x += dt * 0.6 + d.v.length() * 0.3;
        d.r.y += dt * 0.4;
        dummy.position.copy(d.p);
        dummy.rotation.copy(d.r);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
}

/* ---------- Nebula: swirling point cloud for the About page ---------- */
export function nebulaScene(canvas, getProgress = () => 0) {
  const { scene, camera, mouse, loop } = base(canvas);
  camera.position.set(0, 0, 14);
  const N = 14000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const a = new THREE.Color('#efebe3'), b = new THREE.Color('#ff4f1f');
  for (let i = 0; i < N; i++) {
    const arm = i % 3;
    const r = Math.pow(Math.random(), 1.6) * 7;
    const ang = arm * ((Math.PI * 2) / 3) + r * 0.9 + (Math.random() - 0.5) * 0.9;
    pos.set([Math.cos(ang) * r + 3, (Math.random() - 0.5) * (1.6 - r * 0.12) + 2, Math.sin(ang) * r], i * 3);
    const c = a.clone().lerp(b, Math.random() < 0.12 ? 1 : r / 14);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.rotation.x = 0.9;
  scene.add(pts);
  loop((t) => {
    const p = getProgress();
    pts.rotation.y = t * 0.05 + p * 2;
    pts.rotation.x = 0.9 - p * 0.6 + mouse.y * 0.1;
    pts.position.x = mouse.x * 0.4 - p * 3;
    camera.position.z = 14 - p * 6;
  });
}
