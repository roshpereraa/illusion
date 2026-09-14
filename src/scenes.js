import * as THREE from 'three';

const MAX_DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const IS_SMALL = window.matchMedia('(max-width: 700px)').matches;

// Shared boilerplate: sizes to the canvas box, only renders while on screen and the tab is visible.
function base(canvas, { alpha = false, clear = 0x0d0d0f, antialias = true, pixelRatio = MAX_DPR } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: antialias && MAX_DPR < 1.5, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(clear, alpha ? 0 : 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const mouse = new THREE.Vector2();
  const mouseSmooth = new THREE.Vector2();
  let visible = false;
  let w = 1, h = 1;

  const resize = () => {
    w = canvas.clientWidth || 1; h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let frameFn = null;
  let firstFrame;
  const firstFrameDone = new Promise((r) => (firstFrame = r));
  const clock = new THREE.Clock(false);
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    mouseSmooth.lerp(mouse, 0.06);
    frameFn(clock.elapsedTime, dt);
    renderer.render(scene, camera);
    firstFrame();
  };
  const setRunning = (run) => {
    if (!frameFn) return;
    if (run) { clock.start(); renderer.setAnimationLoop(tick); }
    else { clock.stop(); renderer.setAnimationLoop(null); }
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(canvas);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  window.addEventListener('pointermove', (e) => {
    if (!visible) return;
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, { passive: true });

  const loop = (fn) => {
    frameFn = fn;
    // Render one frame immediately so the canvas is never blank, then run only while visible.
    tick();
    setRunning(visible && !document.hidden);
    return firstFrameDone;
  };
  return { renderer, scene, camera, mouse: mouseSmooth, loop, size: () => ({ w, h }) };
}

// A painted "studio light" sphere used as a matcap: glossy look with zero lighting cost.
function matcap(base, { highlight = '#ffffff', shadow = '#000000', gloss = 0.9 } = {}) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  let grad = g.createRadialGradient(s * 0.42, s * 0.38, s * 0.05, s / 2, s / 2, s / 2);
  grad.addColorStop(0, base);
  grad.addColorStop(0.75, base);
  grad.addColorStop(1, shadow);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  grad = g.createRadialGradient(s * 0.33, s * 0.28, 0, s * 0.33, s * 0.28, s * 0.22);
  grad.addColorStop(0, `rgba(255,255,255,${gloss})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  grad = g.createRadialGradient(s * 0.7, s * 0.78, s * 0.3, s * 0.5, s * 0.5, s * 0.5);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, highlight + '55');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- Hero: a drift of glossy rings, capsules & knots ---------- */
export function heroScene(canvas) {
  const { scene, camera, mouse, loop } = base(canvas);
  camera.position.set(0, 0, 18);

  const mats = [
    new THREE.MeshMatcapMaterial({ matcap: matcap('#ff5a2a', { shadow: '#5a1400', highlight: '#ffb37a' }) }),
    new THREE.MeshMatcapMaterial({ matcap: matcap('#e9e4da', { shadow: '#6f6a60', highlight: '#ffffff', gloss: 0.6 }) }),
    new THREE.MeshMatcapMaterial({ matcap: matcap('#1a1a1d', { shadow: '#000000', highlight: '#ff4f1f', gloss: 0.95 }) }),
  ];
  const geos = [
    new THREE.TorusGeometry(1, 0.42, 20, 40),
    new THREE.CapsuleGeometry(0.55, 1.6, 6, 16),
    new THREE.TorusKnotGeometry(0.8, 0.28, 80, 12, 2, 3),
  ];

  const COUNT = IS_SMALL ? 20 : 36;
  const bodies = [];
  const buckets = new Map();
  for (let i = 0; i < COUNT; i++) {
    const key = `${i % 3}-${(i * 7) % 3}`;
    if (!buckets.has(key)) buckets.set(key, []);
    const b = {
      p: new THREE.Vector3((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8 - 2),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: new THREE.Vector3().randomDirection().multiplyScalar(0.3),
      scale: 0.7 + Math.random() * 0.8,
      seed: Math.random() * 10,
    };
    b.home = b.p.clone();
    bodies.push(b);
    buckets.get(key).push(b);
  }
  const meshes = [...buckets].map(([key, list]) => {
    const [gi, mi] = key.split('-').map(Number);
    const mesh = new THREE.InstancedMesh(geos[gi], mats[mi], list.length);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, list };
  });

  const dummy = new THREE.Object3D();
  const target = new THREE.Vector3();
  const away = new THREE.Vector3();
  const pointer3 = new THREE.Vector3();
  return loop((t, dt) => {
    pointer3.set(mouse.x * 13, mouse.y * 6, 1);
    for (const b of bodies) {
      target.copy(b.home);
      target.y += Math.sin(t * 0.6 + b.seed) * 0.6;
      target.x += Math.cos(t * 0.4 + b.seed) * 0.4;
      away.subVectors(b.p, pointer3);
      const d = away.length();
      if (d < 4.5 && d > 0.001) target.addScaledVector(away, ((4.5 - d) * 1.6) / d);
      b.vel.addScaledVector(target.sub(b.p), dt * 2.4).multiplyScalar(0.92);
      b.p.add(b.vel);
      b.rot.x += b.spin.x * dt + b.vel.y * 0.2;
      b.rot.y += b.spin.y * dt + b.vel.x * 0.2;
    }
    for (const { mesh, list } of meshes) {
      list.forEach((b, i) => {
        dummy.position.copy(b.p);
        dummy.rotation.copy(b.rot);
        dummy.scale.setScalar(b.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    camera.position.x = mouse.x * 0.8;
    camera.position.y = mouse.y * 0.5;
    camera.lookAt(0, 0, 0);
  });
}

/* ---------- Full-screen shader plane (reel + manifesto). Soft by design, so render at low res. ---------- */
export function flowScene(canvas, { colors = ['#ff4f1f', '#0d0d0f', '#d6ff3f'] } = {}) {
  const { scene, camera, mouse, loop, size } = base(canvas, { antialias: false, pixelRatio: 0.5 });
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
      precision mediump float;
      uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform vec3 uA, uB, uC; varying vec2 vUv;
      vec2 hash(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(dot(hash(i),f), dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x), mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)), dot(hash(i+vec2(1)),f-vec2(1)),u.x),u.y); }
      float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
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
        gl_FragColor = vec4(col, 1.);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  return loop((t) => {
    const { w, h } = size();
    uniforms.uTime.value = t;
    uniforms.uRes.value.set(w, h);
    uniforms.uMouse.value.copy(mouse);
  });
}

/* ---------- Voyage: chrome orb drifting through a warp tunnel (particles move on the GPU) ---------- */
export function voyageScene(canvas, getProgress) {
  const { renderer, scene, camera, mouse, loop } = base(canvas);
  camera.position.set(0, 0, 10);

  const voyager = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 5),
    new THREE.MeshMatcapMaterial({ matcap: matcap('#bdb8ae', { shadow: '#1a1a1d', highlight: '#ff4f1f', gloss: 1 }) })
  );
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.035, 8, 120), new THREE.MeshBasicMaterial({ color: 0xff4f1f }));
  halo.rotation.x = Math.PI / 2.4;
  const halo2 = new THREE.Mesh(halo.geometry, new THREE.MeshBasicMaterial({ color: 0xefebe3, transparent: true, opacity: 0.4 }));
  halo2.scale.setScalar(1.25);
  halo2.rotation.set(Math.PI / 1.8, 0.4, 0);
  voyager.add(shell, halo, halo2);
  scene.add(voyager);

  const N = IS_SMALL ? 2500 : 5000;
  const DEPTH = 170;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const palette = [new THREE.Color('#ff4f1f'), new THREE.Color('#efebe3'), new THREE.Color('#d6ff3f'), new THREE.Color('#7b61ff')];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 9;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, Math.random() * DEPTH], i * 3);
    const c = palette[Math.random() < 0.55 ? 1 : (1 + Math.floor(Math.random() * 3)) % 4];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const uniforms = {
    uTravel: { value: 0 },
    uSize: { value: 1 },
    uOpacity: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
  };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute vec3 color; uniform float uTravel, uSize, uDpr; varying vec3 vColor;
      void main(){
        vec3 p = position;
        p.z = mod(p.z + uTravel, ${DEPTH.toFixed(1)}) - ${(DEPTH - 10).toFixed(1)};
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = uSize * uDpr * (22. / -mv.z);
        gl_Position = projectionMatrix * mv;
        vColor = color;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec3 vColor;
      void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vColor, uOpacity * smoothstep(.5, .1, d)); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false;
  scene.add(pts);

  const ringGlow = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.6, 96),
    new THREE.MeshBasicMaterial({ color: 0xff4f1f, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  ringGlow.position.z = -2;
  scene.add(ringGlow);

  const bg = new THREE.Color();
  const c0 = new THREE.Color('#0d0d0f'), c1 = new THREE.Color('#1a0904'), c2 = new THREE.Color('#ff4f1f');
  let lastFov = 35;
  return loop((t, dt) => {
    // Pull the camera back on tall, narrow screens so the orb and halo stay in frame.
    camera.position.z = 10 * Math.max(1, 0.9 / camera.aspect);
    const p = getProgress();
    const warp = THREE.MathUtils.smoothstep(p, 0.25, 0.8);
    uniforms.uTravel.value += (2 + warp * 90) * dt;
    uniforms.uOpacity.value = THREE.MathUtils.smoothstep(p, 0.15, 0.35);
    uniforms.uSize.value = 2 + warp * 4;

    const s = THREE.MathUtils.lerp(1, 0.35, THREE.MathUtils.smoothstep(p, 0.2, 0.6));
    voyager.scale.setScalar(s * (1 + Math.sin(t * 1.4) * 0.02));
    voyager.position.set(mouse.x * 0.8, Math.sin(t * 0.8) * 0.25 + mouse.y * 0.4 - p * 0.5, 0);
    shell.rotation.y = t * 0.3;
    halo.rotation.z = t * 0.6;
    halo2.rotation.z = -t * 0.4;
    ringGlow.scale.setScalar(1 + warp * 3 + Math.sin(t * 2) * 0.03);
    ringGlow.material.opacity = 0.25 * (1 - warp);

    if (p < 0.85) bg.copy(c0).lerp(c1, warp);
    else bg.copy(c1).lerp(c2, THREE.MathUtils.smoothstep(p, 0.85, 1));
    renderer.setClearColor(bg, 1);
    camera.rotation.z = warp * t * 0.15;
    const fov = 35 + warp * 30;
    if (Math.abs(fov - lastFov) > 0.01) { camera.fov = lastFov = fov; camera.updateProjectionMatrix(); }
  });
}

/* ---------- Particle field that scatters away from the cursor ---------- */
export function scatterScene(canvas, { count = IS_SMALL ? 260 : 520, colors = ['#0d0d0f', '#ff4f1f', '#7b61ff', '#d6ff3f'] } = {}) {
  const { scene, camera, mouse, loop } = base(canvas, { alpha: true });
  camera.position.z = 30;
  const shapes = [new THREE.OctahedronGeometry(0.4), new THREE.TorusGeometry(0.34, 0.12, 6, 14), new THREE.IcosahedronGeometry(0.34, 1), new THREE.BoxGeometry(0.45, 0.45, 0.45)];
  const groups = shapes.map((geo, gi) => {
    const n = Math.floor(count / shapes.length);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: colors[gi % colors.length] }), n);
    mesh.frustumCulled = false;
    scene.add(mesh);
    const data = Array.from({ length: n }, () => {
      const hx = (Math.random() - 0.5) * 60;
      const hy = -8 - Math.pow(Math.random(), 2) * 10 + (Math.random() < 0.25 ? Math.random() * 26 : 0);
      return { hx, hy, hz: (Math.random() - 0.5) * 10, x: hx, y: hy, vx: 0, vy: 0, rx: Math.random() * 6, ry: Math.random() * 6, s: 0.6 + Math.random() };
    });
    return { mesh, data };
  });
  const dummy = new THREE.Object3D();
  return loop((t, dt) => {
    const mx = mouse.x * 27, my = mouse.y * 16;
    const k = dt * 3;
    for (const { mesh, data } of groups) {
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        let tx = d.hx, ty = d.hy + Math.sin(t + d.hx) * 0.4;
        const ax = d.x - mx, ay = d.y - my;
        const dist = Math.hypot(ax, ay);
        if (dist < 7 && dist > 0.001) { const f = ((7 - dist) * 1.4) / dist; tx += ax * f; ty += ay * f; }
        d.vx = (d.vx + (tx - d.x) * k) * 0.9;
        d.vy = (d.vy + (ty - d.y) * k) * 0.9;
        d.x += d.vx; d.y += d.vy;
        d.rx += dt * 0.6 + Math.abs(d.vx) * 0.3;
        d.ry += dt * 0.4;
        dummy.position.set(d.x, d.y, d.hz);
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
}

/* ---------- Nebula: swirling point cloud for the About page ---------- */
export function nebulaScene(canvas, getProgress = () => 0) {
  const { scene, camera, mouse, loop } = base(canvas, { antialias: false });
  camera.position.set(0, 0, 14);
  const N = IS_SMALL ? 5000 : 10000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const a = new THREE.Color('#efebe3'), b = new THREE.Color('#ff4f1f'), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const arm = i % 3;
    const r = Math.pow(Math.random(), 1.6) * 7;
    const ang = arm * ((Math.PI * 2) / 3) + r * 0.9 + (Math.random() - 0.5) * 0.9;
    pos.set([Math.cos(ang) * r + 3, (Math.random() - 0.5) * (1.6 - r * 0.12) + 2, Math.sin(ang) * r], i * 3);
    c.copy(a).lerp(b, Math.random() < 0.12 ? 1 : r / 14);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.rotation.x = 0.9;
  scene.add(pts);
  return loop((t) => {
    const p = getProgress();
    pts.rotation.y = t * 0.05 + p * 2;
    pts.rotation.x = 0.9 - p * 0.6 + mouse.y * 0.1;
    pts.position.x = mouse.x * 0.4 - p * 3;
    camera.position.z = 14 - p * 6;
  });
}
