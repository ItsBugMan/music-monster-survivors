/* Music Monster 3D renderer. Needs the global THREE (three.js r149 UMD build).
   Read-only consumer of game state: it never mutates simulation data, never touches
   the character generator, and only reads the wrapper's already-rendered sprite
   canvases (player / enemy / boss) to build billboards and extruded meshes.
   Coordinates: game (x, y, z-up)  ->  three (X = x, Y = z, Z = y).
   Classic script: window.MMSRender3D. */
(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.MMSRender3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrapPi = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

  const POSE_3D = Object.freeze({ elev: 46, dist: 820, fov: 46, anchor: 0.55 });
  const LIMITS = Object.freeze({ elevMin: 12, elevMax: 86, distMin: 260, distMax: 2600 });
  // The 2D / 2.5D canvas camera expressed as a 3D pose, so the two layers line up while cross-fading.
  function canvasPose(progress, height, distance = 1500) {
    return { yaw: 0, elev: lerp(88, 35, progress), dist: distance,
      fov: 2 * Math.atan(height / 2 / distance) / DEG, anchor: lerp(0.5, 0.6, progress) };
  }

  function supported() {
    return typeof THREE !== 'undefined' && !!globalThis.WebGLRenderingContext;
  }

  /* ------------------------------------------------------------------ camera */
  class Camera3D {
    constructor({ width = 960, height = 600 } = {}) {
      this.width = width; this.height = height; this.x = 0; this.y = 0; this.lookHeight = 18;
      this.user = { yaw: 0, elev: POSE_3D.elev, dist: POSE_3D.dist };
      this.cur = { yaw: 0, elev: POSE_3D.elev, dist: POSE_3D.dist, fov: POSE_3D.fov, anchor: POSE_3D.anchor };
      this.goal = { ...this.cur }; this.following = 'user'; this.ease = 5.5; this.followSpeed = 10;
      this.camera = new THREE.PerspectiveCamera(POSE_3D.fov, width / height, 20, 9000);
      this._v = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
      this.apply();
    }
    // Same shape as the canvas CameraController where the game relies on it.
    get progress() { return 1; }
    get yaw() { return this.cur.yaw; }
    get elevation() { return this.cur.elev; }
    resize(width, height) { this.width = width; this.height = height; this.camera.aspect = width / height; this.apply(); }
    setPosition(x, y) { this.x = x; this.y = y; }
    follow(x, y, dt) {
      const k = 1 - Math.exp(-this.followSpeed * Math.max(0, dt));
      this.x = lerp(this.x, x, k); this.y = lerp(this.y, y, k);
    }
    rotate(dYaw, dElevDeg = 0) {
      this.user.yaw = wrapPi(this.user.yaw + dYaw);
      this.user.elev = clamp(this.user.elev + dElevDeg, LIMITS.elevMin, LIMITS.elevMax);
    }
    zoom(factor) { this.user.dist = clamp(this.user.dist * factor, LIMITS.distMin, LIMITS.distMax); }
    resetUser() { this.user = { yaw: 0, elev: POSE_3D.elev, dist: POSE_3D.dist }; }
    useUserPose() { this.following = 'user'; }
    matchCanvasPose(progress) { this.following = 'match'; this.goal = { ...canvasPose(progress, this.height) }; }
    snapToCanvasPose(progress) { this.cur = { ...canvasPose(progress, this.height) }; this.goal = { ...this.cur }; this.apply(); }
    snapToUserPose() {
      this.cur = { yaw: this.user.yaw, elev: this.user.elev, dist: this.user.dist, fov: POSE_3D.fov, anchor: POSE_3D.anchor };
      this.goal = { ...this.cur }; this.apply();
    }
    update(dt) {
      if (this.following === 'user') {
        this.goal = { yaw: this.user.yaw, elev: this.user.elev, dist: this.user.dist, fov: POSE_3D.fov, anchor: POSE_3D.anchor };
      }
      const k = 1 - Math.exp(-this.ease * Math.max(0, dt)), c = this.cur, g = this.goal;
      c.yaw += wrapPi(g.yaw - c.yaw) * k;
      for (const key of ['elev', 'dist', 'fov', 'anchor']) c[key] = lerp(c[key], g[key], k);
      this.apply();
    }
    apply() {
      const c = this.cur, cam = this.camera, e = c.elev * DEG;
      cam.fov = c.fov; cam.aspect = this.width / this.height;
      cam.position.set(this.x + Math.sin(c.yaw) * Math.cos(e) * c.dist, this.lookHeight + Math.sin(e) * c.dist,
        this.y + Math.cos(c.yaw) * Math.cos(e) * c.dist);
      cam.up.set(0, 1, 0); cam.lookAt(this.x, this.lookHeight, this.y);
      // Shift the principal point so the hero sits at `anchor` of the screen height (matches 2.5D's 0.6).
      if (Math.abs(c.anchor - 0.5) > 1e-4) cam.setViewOffset(this.width, this.height, 0, -(c.anchor - 0.5) * this.height, this.width, this.height);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    }
    // Canvas logical pixels, same contract as CameraController.project (null = behind the camera).
    project(x, y, z = 0) {
      const cam = this.camera, v = this._v.set(x, z, y).applyMatrix4(cam.matrixWorldInverse);
      if (v.z >= -cam.near) return null;
      const m = cam.projectionMatrix.elements, w = -v.z;
      const nx = (m[0] * v.x + m[8] * v.z) / w, ny = (m[5] * v.y + m[9] * v.z) / w;
      return { x: (nx * 0.5 + 0.5) * this.width, y: (1 - (ny * 0.5 + 0.5)) * this.height, scale: m[5] * 0.5 * this.height / w, depth: w };
    }
    screenToGround(sx, sy) {
      const cam = this.camera, nx = sx / this.width * 2 - 1, ny = -(sy / this.height * 2 - 1);
      const a = this._a.set(nx, ny, -1).unproject(cam), b = this._b.set(nx, ny, 1).unproject(cam);
      const dy = b.y - a.y; if (dy >= -1e-6) return null;
      const t = -a.y / dy; if (t < 0) return null;
      return { x: a.x + (b.x - a.x) * t, y: a.z + (b.z - a.z) * t };
    }
    // Ground polygon covered by the screen; rays above the horizon are clamped to a far ring.
    footprint(far = 4200) {
      const pts = [];
      for (const [sx, sy] of [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]]) {
        let g = this.screenToGround(sx, sy);
        if (!g) {
          const cam = this.camera, nx = sx / this.width * 2 - 1, ny = -(sy / this.height * 2 - 1);
          const a = new THREE.Vector3(nx, ny, -1).unproject(cam), b = new THREE.Vector3(nx, ny, 1).unproject(cam);
          const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
          g = { x: this.x + dx / len * far, y: this.y + dz / len * far };
        }
        pts.push({ x: g.x, y: g.y });
      }
      return pts;
    }
    onScreen(o, margin = 70) {
      const q = this.project(o.x, o.y, o.z || 0); if (!q) return false;
      const m = margin * q.scale;
      return q.x > -m && q.x < this.width + m && q.y > -m && q.y < this.height + m;
    }
  }

  /* ---------------------------------------------------------------- renderer */
  const PICKUP_GLYPH = { health: '+', magnet: 'M', shield: 'S', haste: '>', bomb: '!', chest: '★', xp: 'X' };
  const NEEDLE_ELEMENTS = new Set(['Shadow', 'Water']);

  class Renderer3D {
    // world: { MW, MH, stage, zone:{name,color,bg}, obstacles, landmarks }
    // art:   { floor(): canvas, colors, pickupColors, elementOf(obj) }
    constructor({ canvas, width = 960, height = 600, world, art, camera, shadowSize }) {
      if (!supported()) throw new Error('WebGL is not available');
      THREE.ColorManagement.legacyMode = false;
      this.world = world; this.art = art; this.cam = camera; this.frame = 0; this.lost = false;
      this.maps = { enemies: new Map(), crates: new Map(), pickups: new Map(), fields: new Map(), hazards: new Map(), fx: new Map(), turrets: new Map() };
      this.voxCache = new WeakMap(); this.spriteCache = new WeakMap(); this.proceduralCache = {};
      this.dummy = new THREE.Object3D(); this.tmpColor = new THREE.Color();
      const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      r.outputEncoding = THREE.sRGBEncoding; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2)); r.setSize(width, height, false);
      this.onContextLost = e => { e.preventDefault(); this.lost = true; };
      canvas.addEventListener('webglcontextlost', this.onContextLost);
      this.canvas = canvas;
      const scene = this.scene = new THREE.Scene();
      this.buildAtmosphere(shadowSize || 2048);
      this.dynamic = new THREE.Group(); scene.add(this.dynamic);
      this.buildGround(); this.buildStatic(); this.buildSharedAssets(); this.buildInstanced(); this.buildGlow();
      this.player = null;
    }

    col(hex) { return new THREE.Color().setStyle(typeof hex === 'string' ? hex.slice(0, 7) : '#ffffff'); }
    gradientTexture(top, bottom) {
      const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, top); grd.addColorStop(0.55, bottom); grd.addColorStop(1, bottom);
      g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
    }
    radialTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, inner); grd.addColorStop(0.35, mid); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }

    buildAtmosphere(shadowSize) {
      const { zone } = this.world, bg = this.col(zone.bg), scene = this.scene;
      const fogColor = bg.clone().multiplyScalar(1.35);
      scene.background = this.gradientTexture('#05060c', '#' + fogColor.clone().convertLinearToSRGB().getHexString());
      scene.fog = new THREE.Fog(fogColor, 900, 3400);
      this.hemi = new THREE.HemisphereLight(0x9fb4e0, 0x2c2338, 0.95); scene.add(this.hemi);
      const sun = this.sun = new THREE.DirectionalLight(0xc9d7ff, 1.15);
      sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize);
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.4; sun.shadow.radius = 2;
      Object.assign(sun.shadow.camera, { near: 50, far: 3600, left: -700, right: 700, top: 700, bottom: -700 });
      this.shadowHalf = 700; this.shadowSize = shadowSize;
      scene.add(sun, sun.target);
      this.heroLight = new THREE.PointLight(0xffe2b0, 1.5, 560, 1.5); scene.add(this.heroLight);
      this.pool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 380, 1.8); scene.add(l); return l; });
    }

    buildGround() {
      const { MW, MH, zone } = this.world, scene = this.scene;
      const tex = this.groundTexture = new THREE.CanvasTexture(this.art.floor());
      tex.encoding = THREE.sRGBEncoding; tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(MW / 2, 0, MH / 2); ground.receiveShadow = true; scene.add(ground);
      const voidMat = new THREE.MeshBasicMaterial({ color: this.col(zone.bg).multiplyScalar(0.55) });
      const abyss = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), voidMat);
      abyss.rotation.x = -Math.PI / 2; abyss.position.set(MW / 2, -2, MH / 2); scene.add(abyss);
    }

    inst(geometry, material, matrices, colors, { cast = true, receive = true } = {}) {
      const m = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
      matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
      if (colors) colors.forEach((c, i) => m.setColorAt(i, c));
      m.count = matrices.length; m.castShadow = cast; m.receiveShadow = receive; m.frustumCulled = false;
      this.scene.add(m); return m;
    }
    matrix(x, y, z, sx, sy, sz, ry = 0) {
      const d = this.dummy; d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(sx, sy, sz); d.updateMatrix(); return d.matrix.clone();
    }

    buildStatic() {
      const { obstacles, landmarks, MW, MH, zone, stage } = this.world, scene = this.scene;
      const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color: this.col(color), roughness: 0.9, metalness: 0.02, ...extra });
      const cyl6 = new THREE.CylinderGeometry(1, 1, 1, 6), cyl10 = new THREE.CylinderGeometry(1, 1, 1, 10), cone7 = new THREE.ConeGeometry(1, 1, 7);
      const box = new THREE.BoxGeometry(1, 1, 1), dodeca = new THREE.DodecahedronGeometry(1, 0);
      const buckets = { tree: [], stone: [], column: [], machine: [], building: [], car: [], lamp: [] };
      for (const o of obstacles) (buckets[o.type] || buckets.stone).push(o);
      // Trees: trunk + two stacked canopies.
      const tr = [], c1 = [], c2 = [];
      for (const o of buckets.tree) {
        const h = 28 + o.r * 1.2, k = 1.9 * o.r + 26;
        tr.push(this.matrix(o.x, h / 2, o.y, 5, h, 5));
        c1.push(this.matrix(o.x, h * 0.55 + k / 2, o.y, o.r + 10, k, o.r + 10, o.x));
        c2.push(this.matrix(o.x - 3, h * 0.55 + k * 0.45 + (o.r * 1.5 + 14) / 2, o.y, o.r * 0.85, o.r * 1.5 + 14, o.r * 0.85, o.y));
      }
      if (tr.length) { this.inst(cyl6, std('#433b38'), tr); this.inst(cone7, std('#233f3b'), c1); this.inst(cone7, std('#31564a'), c2); }
      // Stones (rubble tinted per stage).
      const stoneColor = stage === 0 ? '#495359' : stage === 1 ? '#554652' : '#554652';
      if (buckets.stone.length) this.inst(dodeca, std(stoneColor, { flatShading: true }), buckets.stone.map(o => this.matrix(o.x, o.r * 0.45, o.y, o.r, o.r * 0.8, o.r, o.x * 0.1)));
      // Columns: plinth, shaft, cap.
      if (buckets.column.length) {
        this.inst(box, std('#343044'), buckets.column.map(o => this.matrix(o.x, 6, o.y, o.r * 2, 12, o.r * 2)));
        this.inst(cyl10, std('#60556f'), buckets.column.map(o => { const h = 80 + o.r * 1.5; return this.matrix(o.x, 12 + h / 2, o.y, o.r * 0.72, h, o.r * 0.72); }));
        this.inst(box, std('#7a6e89'), buckets.column.map(o => { const h = 80 + o.r * 1.5; return this.matrix(o.x, 12 + h + 5, o.y, o.r * 1.9, 10, o.r * 1.9); }));
      }
      // Machines: body, plate, glowing status light, antenna.
      if (buckets.machine.length) {
        this.inst(box, std('#49323b'), buckets.machine.map(o => this.matrix(o.x, o.r * 0.65, o.y, o.r * 2, o.r * 1.3, o.r * 2)));
        this.inst(box, std('#72505a'), buckets.machine.map(o => this.matrix(o.x, o.r * 1.3 + 4, o.y, o.r * 2 - 6, 8, o.r * 2 - 6)));
        this.inst(box, new THREE.MeshStandardMaterial({ color: this.col('#ed9479'), emissive: this.col('#ed9479'), emissiveIntensity: 0.9 }), buckets.machine.map(o => this.matrix(o.x, o.r * 0.8, o.y + o.r + 0.6, 16, 5, 1.5)), null, { cast: false });
        this.inst(cyl6, std('#a66b68'), buckets.machine.map(o => this.matrix(o.x + 7, o.r * 1.3 + 22, o.y, 1.8, 28, 1.8)));
      }
      // Neon Boulevard: towers with lit windows, parked cars, street lamps.
      if (buckets.building.length) {
        const { map, glow } = this.windowTextures();
        const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.8, roughness: 0.85 });
        for (const o of buckets.building) {
          const w = o.r * 2, h = 50 + o.h * 0.33, geo = new THREE.BoxGeometry(w, h, w), uv = geo.attributes.uv, nor = geo.attributes.normal, off = (o.tint || 0) * 0.173;
          for (let i = 0; i < uv.count; i++) { const top = Math.abs(nor.getY(i)) > 0.5; uv.setXY(i, uv.getX(i) * w / 160 + off, uv.getY(i) * (top ? w : h) / 160 + off * 0.6); }
          const mesh = new THREE.Mesh(geo, mat); mesh.position.set(o.x, h / 2, o.y); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
        }
      }
      if (buckets.car.length) {
        const palette = ['#b8454f', '#4a7fb5', '#c9a13b', '#6b7280', '#3f9b7a'].map(c => this.col(c));
        const rot = o => -(o.a || 0);
        this.inst(box, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.3 }), buckets.car.map(o => this.matrix(o.x, 8, o.y, o.r * 2.3, 11, o.r * 1.2, rot(o))), buckets.car.map(o => palette[o.tint % 5]));
        this.inst(box, std('#12141c', { roughness: 0.2 }), buckets.car.map(o => { const m = this.matrix(0, 0, 0, o.r * 1.2, 9, o.r * 1.0, 0); const d = this.dummy; d.position.set(o.x - Math.cos(o.a || 0) * o.r * 0.1, 17, o.y - Math.sin(o.a || 0) * o.r * 0.1); d.rotation.set(0, rot(o), 0); d.scale.set(o.r * 1.2, 9, o.r * 1.0); d.updateMatrix(); return d.matrix.clone(); }));
        this.inst(box, new THREE.MeshStandardMaterial({ color: this.col('#ffe9b0'), emissive: this.col('#ffe9b0'), emissiveIntensity: 1 }), buckets.car.map(o => { const d = this.dummy; d.position.set(o.x + Math.cos(o.a || 0) * o.r * 1.15, 9, o.y + Math.sin(o.a || 0) * o.r * 1.15); d.rotation.set(0, rot(o), 0); d.scale.set(1.5, 4, o.r * 1.0); d.updateMatrix(); return d.matrix.clone(); }), null, { cast: false });
      }
      if (buckets.lamp.length) {
        this.inst(cyl6, std('#6b7080'), buckets.lamp.map(o => this.matrix(o.x, 28, o.y, 1.8, 56, 1.8)));
        this.inst(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: this.col('#ffe9b0'), emissive: this.col('#ffe9b0'), emissiveIntensity: 1.4 }), buckets.lamp.map(o => this.matrix(o.x, 58, o.y, 5, 5, 5)), null, { cast: false });
        this.inst(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: this.col('#ffd98a'), transparent: true, opacity: 0.18, depthWrite: false, fog: false }), buckets.lamp.map(o => this.matrix(o.x, 58, o.y, 20, 20, 20)), null, { cast: false, receive: false });
      }
      // Arena walls and landmark pillars/crystals.
      const wallMat = new THREE.MeshStandardMaterial({ color: this.col(zone.color).multiplyScalar(0.35), emissive: this.col(zone.color), emissiveIntensity: 0.22, roughness: 0.7 });
      for (const [x, z, w, d] of [[MW / 2, -7, MW + 28, 14], [MW / 2, MH + 7, MW + 28, 14], [-7, MH / 2, 14, MH], [MW + 7, MH / 2, 14, MH]]) {
        const wall = new THREE.Mesh(box, wallMat); wall.scale.set(w, 46, d); wall.position.set(x, 23, z); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
      }
      const pillarMat = std('#2c3a40'), glowMat = new THREE.MeshStandardMaterial({ color: this.col(zone.color), emissive: this.col(zone.color), emissiveIntensity: 1.1 });
      const pillars = [], tops = [];
      this.crystals = [];
      for (const l of landmarks) {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, x = l.x + Math.cos(a) * (l.r - 25), z = l.y + Math.sin(a) * (l.r - 25), h = 44 + (i % 2) * 18;
          pillars.push(this.matrix(x, h / 2, z, 9, h, 9, a)); tops.push(this.matrix(x, h + 3, z, 6, 6, 6, a));
        }
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), glowMat);
        crystal.scale.set(18, 30, 18); crystal.position.set(l.x, 62, l.y); crystal.castShadow = true;
        scene.add(crystal); this.crystals.push(crystal);
      }
      if (pillars.length) { this.inst(box, pillarMat, pillars); this.inst(box, glowMat, tops, null, { cast: false }); }
    }

    // Tileable facade: dark glass with randomly lit windows (colour map + matching emissive map). One tile = 8x8 windows over 160 units.
    windowTextures() {
      const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; };
      const a = mk(), b = mk(), ga = a.getContext('2d'), gb = b.getContext('2d');
      ga.fillStyle = '#2b2e40'; ga.fillRect(0, 0, 256, 256); gb.fillStyle = '#000'; gb.fillRect(0, 0, 256, 256);
      let seed = 91; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const lit = rnd(), px = x * 32 + 6, py = y * 32 + 6;
        ga.fillStyle = '#161824'; ga.fillRect(px, py, 20, 22);
        if (lit > 0.62) { const col = lit > 0.9 ? '#8ff4ff' : lit > 0.8 ? '#ff7fc8' : '#ffd98a'; ga.fillStyle = col; ga.fillRect(px, py, 20, 22); gb.fillStyle = col; gb.fillRect(px, py, 20, 22); }
      }
      const tex = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      return { map: tex(a), glow: tex(b) };
    }
    buildSharedAssets() {
      const THREE_ = THREE;
      this.glowTex = this.radialTexture();
      this.unitPlane = new THREE.PlaneGeometry(1, 1);
      this.unitBox = new THREE.BoxGeometry(1, 1, 1);
      this.unitOcta = new THREE.OctahedronGeometry(1, 0);
      this.unitDisc = new THREE.CircleGeometry(1, 40);
      this.unitRing = new THREE.RingGeometry(0.92, 1, 56);
      this.unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
      this.add = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE_.AdditiveBlending, depthWrite: false, side: THREE_.DoubleSide, fog: false });
      // Crate art (original look: planks, border, brace).
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#765641'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#b59267'; g.lineWidth = 6; g.strokeRect(6, 6, 52, 52);
      g.beginPath(); g.moveTo(6, 6); g.lineTo(58, 58); g.stroke();
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; this.crateMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
      this.voxMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, emissive: new THREE.Color(0x151515) });
      this.glyphCache = {};
    }

    // Instanced projectile classes + gems.
    buildInstanced() {
      const mk = (geo, mat, cap, cast) => {
        const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.castShadow = cast;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, this.tmpColor.set(0xffffff)); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(m); return m;
      };
      const basic = () => new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
      const cone = new THREE.ConeGeometry(1, 3, 6); cone.rotateX(Math.PI / 2);
      const disc = new THREE.CylinderGeometry(1, 1, 0.18, 18);
      this.shotMeshes = {
        orb: mk(new THREE.SphereGeometry(1, 12, 10), basic(), 800, false),
        needle: mk(cone, basic(), 800, false),
        lance: mk(new THREE.BoxGeometry(1, 1, 1), basic(), 800, false),
        boulder: mk(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), 800, true),
        disc: mk(disc, basic(), 800, false)
      };
      this.gemMesh = mk(new THREE.OctahedronGeometry(1, 0), basic(), 2000, false);
    }

    buildGlow() {
      const mk = (size, cap) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: this.glowTex, vertexColors: true, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false }));
        pts.frustumCulled = false; this.scene.add(pts); return { pts, geo, cap, n: 0 };
      };
      this.glowBig = mk(60, 1500); this.glowSmall = mk(22, 1500);
    }
    glow(sys, x, y, z, color, k = 1) {
      if (sys.n >= sys.cap) return;
      const p = sys.geo.attributes.position.array, c = sys.geo.attributes.color.array, i = sys.n++ * 3;
      p[i] = x; p[i + 1] = z; p[i + 2] = y; c[i] = color.r * k; c[i + 1] = color.g * k; c[i + 2] = color.b * k;
    }

    /* ------------------------------------------------ wrapper-data meshes */
    // Extrudes the wrapper's finished pixel-art canvas into a thin voxel slab (front/back + exposed sides).
    voxelGeometry(canvas, sw, sh, worldW, worldH, depth) {
      const key = [sw, sh, worldW, worldH, depth].join(',');
      const hit = this.voxCache.get(canvas); if (hit && hit.key === key) return hit.geo;
      const px = canvas.getContext('2d').getImageData(0, 0, sw, sh).data;
      const solid = (ix, iy) => ix >= 0 && iy >= 0 && ix < sw && iy < sh && px[(iy * sw + ix) * 4 + 3] >= 128;
      const pos = [], nor = [], colr = [], idx = [], c = new THREE.Color();
      const sx = worldW / sw, sy = worldH / sh, hz = depth / 2, x0 = -worldW / 2;
      const quad = (a, b, cc, d, n, color) => {
        const base = pos.length / 3;
        for (const v of [a, b, cc, d]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); colr.push(color.r, color.g, color.b); }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };
      for (let iy = 0; iy < sh; iy++) for (let ix = 0; ix < sw; ix++) {
        if (!solid(ix, iy)) continue;
        const o = (iy * sw + ix) * 4; c.setStyle('rgb(' + px[o] + ',' + px[o + 1] + ',' + px[o + 2] + ')');
        const x1 = x0 + ix * sx, x2 = x1 + sx, yT = worldH - iy * sy, yB = yT - sy;
        quad([x1, yB, hz], [x2, yB, hz], [x2, yT, hz], [x1, yT, hz], [0, 0, 1], c);
        quad([x2, yB, -hz], [x1, yB, -hz], [x1, yT, -hz], [x2, yT, -hz], [0, 0, -1], c);
        if (!solid(ix - 1, iy)) quad([x1, yB, -hz], [x1, yB, hz], [x1, yT, hz], [x1, yT, -hz], [-1, 0, 0], c);
        if (!solid(ix + 1, iy)) quad([x2, yB, hz], [x2, yB, -hz], [x2, yT, -hz], [x2, yT, hz], [1, 0, 0], c);
        if (!solid(ix, iy - 1)) quad([x1, yT, hz], [x2, yT, hz], [x2, yT, -hz], [x1, yT, -hz], [0, 1, 0], c);
        if (!solid(ix, iy + 1)) quad([x1, yB, -hz], [x2, yB, -hz], [x2, yB, hz], [x1, yB, hz], [0, -1, 0], c);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
      geo.setIndex(idx); geo.computeBoundingSphere();
      this.voxCache.set(canvas, { key, geo }); return geo;
    }
    // Camera-facing sprite plane using the wrapper's sprite canvas as the texture (alpha-tested, shadow-casting).
    spriteMaterials(canvas) {
      let s = this.spriteCache.get(canvas); if (s) return s;
      const map = new THREE.CanvasTexture(canvas); map.encoding = THREE.sRGBEncoding;
      map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
      const base = { map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 };
      s = { map,
        n: new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color(0x181818) }),
        h: new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.85 }),
        f: new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color(0x96e6ff), emissiveIntensity: 0.55 }),
        depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 }) };
      this.spriteCache.set(canvas, s); return s;
    }
    glyph(type) {
      if (this.glyphCache[type]) return this.glyphCache[type];
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#181525'; g.font = 'bold 44px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(PICKUP_GLYPH[type] || '?', 32, 34);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return (this.glyphCache[type] = t);
    }
    procMaterials(type, color) {
      const k = type; if (this.proceduralCache[k]) return this.proceduralCache[k];
      const mk = (hex, ei) => new THREE.MeshStandardMaterial({ color: this.col(hex), roughness: 0.7, emissive: this.col(hex), emissiveIntensity: ei });
      return (this.proceduralCache[k] = { n: mk(color, 0.12), h: mk('#ffffff', 0.9), f: mk('#96e6ff', 0.5) });
    }

    /* ------------------------------------------------------- record makers */
    ring(color, inner = 0.92, opacity = 0.8) {
      const m = new THREE.Mesh(new THREE.RingGeometry(inner, 1, 48), this.add(color, opacity));
      m.rotation.x = -Math.PI / 2; m.position.y = 1.2; return m;
    }
    makeEnemy(e) {
      const group = new THREE.Group(), rec = { group, e, state: 'n', stamp: 0 };
      const colors = this.art.colors;
      if (e.chart && e.bossSprite) {
        const grid = e.chart.art?.grid, dw = grid?.[0]?.length || 32, dh = grid?.length || 32;
        const geo = this.voxelGeometry(e.bossSprite, dw, dh, e.bossSize, e.bossSize * 1.08, Math.max(10, e.bossSize * 0.12));
        const mesh = new THREE.Mesh(geo, this.voxMat.clone()); mesh.castShadow = mesh.receiveShadow = true;
        rec.body = mesh; rec.kind = 'boss'; rec.mats = { n: 0x151515, h: 0xffffff, f: 0x96e6ff };
        group.add(mesh); const ring = this.ring(this.col(colors[e.element] || '#fa6384'), 0.9, 0.85); ring.scale.setScalar(e.r + 14); group.add(ring);
        rec.size = e.bossSize;
      } else if (e.chartEnemy && e.enemySprite) {
        const s = this.spriteMaterials(e.enemySprite), size = e.enemySize;
        const mesh = new THREE.Mesh(this.unitPlane, s.n); mesh.scale.set(size, size, 1); mesh.position.y = size * 0.5;
        mesh.castShadow = true; mesh.customDepthMaterial = s.depth; mesh.receiveShadow = false;
        rec.body = mesh; rec.sprite = s; rec.kind = 'sprite'; rec.size = size; group.add(mesh);
        if (e.type === 'elite') { const ring = this.ring(this.col('#f6c16e'), 0.9, 0.8); ring.scale.setScalar(e.r + 8); group.add(ring); }
      } else {
        const sides = e.type === 'hunter' ? 3 : e.type === 'wisp' ? 4 : 6, tall = e.type === 'brute' ? 1.9 : e.type === 'wisp' ? 1.5 : 1.5;
        const pal = { boss: '#fa6384', elite: '#f6c16e', hunter: '#efa971', brute: '#9d83bd', wisp: '#c79de9' }[e.type] || '#7b9caa';
        const mats = this.procMaterials(e.type, pal), r = e.r;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, sides), mats.n);
        body.scale.set(r, r * tall, r); body.position.y = r * tall / 2 + (e.type === 'wisp' ? 16 : 0); body.castShadow = body.receiveShadow = true;
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x191426 });
        for (const sx of [-0.36, 0.3]) { const eye = new THREE.Mesh(this.unitBox, eyeMat); eye.scale.set(r * 0.3, r * 0.3, r * 0.2); eye.position.set(sx * r, body.position.y + r * 0.2, r * 0.82); group.add(eye); }
        group.add(body); rec.body = body; rec.mats3 = mats; rec.kind = 'proc'; rec.size = r * tall;
        if (e.type === 'elite') { const ring = this.ring(this.col(pal), 0.9, 0.8); ring.scale.setScalar(r + 8); group.add(ring); }
      }
      this.dynamic.add(group); return rec;
    }
    makeCrate() { const m = new THREE.Mesh(this.unitBox, this.crateMat); m.scale.set(30, 30, 30); m.position.y = 15; m.castShadow = m.receiveShadow = true; this.dynamic.add(m); return { group: m }; }
    makePickup(item) {
      const group = new THREE.Group(), color = this.col(this.art.pickupColors[item.type] || '#ffffff');
      const geo = item.type === 'chest' ? this.unitBox : this.unitOcta;
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.1 });
      const body = new THREE.Mesh(geo, mat); const s = item.type === 'chest' ? 22 : 10; body.scale.set(s, item.type === 'chest' ? 16 : s * 1.3, item.type === 'chest' ? 16 : s); body.castShadow = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glyph(item.type), depthWrite: false })); sprite.scale.set(16, 16, 1); sprite.position.y = 24;
      const ring = this.ring(color, 0.85, 0.5); ring.scale.setScalar(17);
      group.add(body, sprite, ring); this.dynamic.add(group); return { group, body, ring, color, mat };
    }
    makeTurret() {
      const group = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: this.col('#837ab0'), roughness: 0.5, emissive: this.col('#4a3f7a'), emissiveIntensity: 0.4 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(19, 22, 16, 6), mat); base.position.y = 8; base.castShadow = base.receiveShadow = true;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 10), new THREE.MeshStandardMaterial({ color: this.col('#d8caff'), emissive: this.col('#d8caff'), emissiveIntensity: 0.8 }));
      orb.position.y = 28; orb.castShadow = true; group.add(base, orb); this.dynamic.add(group); return { group, base, orb };
    }
    makeField(f) {
      const group = new THREE.Group(), color = this.col(f.color || this.art.colors[this.art.elementOf(f)] || '#ffffff');
      const disc = new THREE.Mesh(this.unitDisc, this.add(color, 0.14)); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.8;
      const ring = this.ring(color, 0.93, 0.75); const beams = [];
      for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(this.unitCyl, this.add(color, 0.5)); beams.push(b); group.add(b); }
      group.add(disc, ring); this.dynamic.add(group); return { group, disc, ring, beams, color, element: this.art.elementOf(f), seed: Math.random() * 6 };
    }
    makeHazard(h) {
      const color = this.col(h.friendly ? (h.color || '#ffd68c') : '#ff617e'), group = new THREE.Group();
      const disc = new THREE.Mesh(this.unitDisc, this.add(color, 0.2)), ring = this.ring(color, 0.94, 0.9), fill = new THREE.Mesh(this.unitDisc, this.add(color, 0.28));
      disc.rotation.x = fill.rotation.x = -Math.PI / 2; disc.position.y = 0.8; fill.position.y = 1;
      const pillar = new THREE.Mesh(this.unitCyl, this.add(color, 0.0)); group.add(disc, fill, ring, pillar);
      this.dynamic.add(group); return { group, disc, fill, ring, pillar, color };
    }
    makeFx(f) {
      const color = this.col(f.color || '#ffffff'), group = new THREE.Group();
      if (f.line) {
        const outer = new THREE.Mesh(this.unitCyl, this.add(color, 0.35)), inner = new THREE.Mesh(this.unitCyl, this.add(0xf5faff, 0.9));
        group.add(outer, inner); this.dynamic.add(group); return { group, outer, inner, color, line: true };
      }
      const ring = this.ring(color, 0.86, 1); group.add(ring); this.dynamic.add(group); return { group, ring, color, seed: Math.random() * 6 };
    }

    /* -------------------------------------------------------------- updates */
    sync(map, list, make, update) {
      const stamp = this.frame;
      for (const o of list) {
        let r = map.get(o); if (!r) { r = make(o); if (!r) continue; map.set(o, r); }
        r.stamp = stamp; update(r, o);
      }
      for (const [o, r] of map) if (r.stamp !== stamp) { this.dynamic.remove(r.group); map.delete(o); }
    }
    setEnemyState(rec, state) {
      if (rec.state === state) return; rec.state = state;
      if (rec.kind === 'sprite') rec.body.material = rec.sprite[state];
      else if (rec.kind === 'proc') rec.body.material = rec.mats3[state];
      else if (rec.kind === 'boss') rec.body.material.emissive.setHex(rec.mats[state]);
    }

    render(f) {
      if (this.lost) return false;
      this.frame++;
      const { time, player: p, enemies, shots, fields, hazards, fx, gems, pickups, crates, turrets } = f;
      const cam = this.cam, yaw = cam.yaw, THREE_ = THREE, heroColor = this.col(f.heroColor || '#ffe2b0');
      this.glowBig.n = this.glowSmall.n = 0; const lightCand = [];

      // Player: extruded wrapper art.
      if (f.playerSprite) {
        if (!this.player || this.player.sprite !== f.playerSprite) {
          if (this.player) this.dynamic.remove(this.player.group);
          const geo = this.voxelGeometry(f.playerSprite, 32, 32, 56, 56, 9);
          const mat = this.voxMat.clone(); mat.transparent = true;
          const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true;
          const ring = this.ring(heroColor, 0.9, 0.7); ring.scale.setScalar(20);
          const shield = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 14), this.add(0xbda6ff, 0.22)); shield.position.y = 28; shield.visible = false;
          const group = new THREE.Group(); group.add(mesh, ring, shield); this.dynamic.add(group);
          this.player = { group, mesh, mat, ring, shield, sprite: f.playerSprite };
        }
        const pl = this.player, bob = Math.sin(time * 8) * 2;
        pl.group.position.set(p.x, 0, p.y); pl.mesh.rotation.y = yaw; pl.mesh.position.y = 2 + bob;
        pl.mat.opacity = p.inv > 0 ? 0.55 : 1; pl.shield.visible = p.shield > 0;
        pl.ring.scale.setScalar(20 + Math.sin(time * 4) * 1.5);
      }
      this.heroLight.position.set(p.x, 74, p.y); this.heroLight.color.copy(heroColor).lerp(new THREE_.Color(1, 0.9, 0.75), 0.55);

      // Enemies (billboard sprites, extruded bosses, or native solids for the fallback waves).
      const near2 = Math.pow(Math.max(700, cam.cur.dist * 1.1), 2);
      this.sync(this.maps.enemies, enemies.filter(e => e.hp > 0), e => this.makeEnemy(e), (r, e) => {
        const g = r.group; g.position.set(e.x, 0, e.y);
        this.setEnemyState(r, e.hit > 0 ? 'h' : e.freeze > 0 ? 'f' : 'n');
        if (r.kind === 'sprite') r.body.rotation.y = yaw;
        else if (r.kind === 'boss') { r.body.rotation.y = yaw; r.body.position.y = 3 + Math.sin(time * 3 + e.id) * 2; }
        const dx = p.x - e.x, dz = p.y - e.y;
        if (r.kind === 'proc') { g.rotation.y = Math.atan2(dx, dz); if (e.type === 'wisp') g.position.y = Math.sin(time * 3 + e.id) * 4; }
        r.body.castShadow = dx * dx + dz * dz < near2;
      });

      this.sync(this.maps.crates, crates, () => this.makeCrate(), (r, c) => r.group.position.set(c.x, 15, c.y));
      this.sync(this.maps.turrets, turrets, () => this.makeTurret(), (r, t) => { r.group.position.set(t.x, 0, t.y); r.base.rotation.y = time; r.orb.position.y = 28 + Math.sin(time * 3) * 2; });
      this.sync(this.maps.pickups, pickups, it => this.makePickup(it), (r, it) => {
        r.group.position.set(it.x, 0, it.y); r.body.position.y = 20 + Math.sin(time * 3 + it.x) * 3; r.body.rotation.y = time * 1.6;
        r.ring.scale.setScalar(17 + Math.sin(time * 3) * 2);
        this.glow(this.glowSmall, it.x, it.y, 22, r.color, 0.55);
      });

      // Fields / hazards / impact effects: flat additive ground markers plus rising volumes.
      this.sync(this.maps.fields, fields, o => this.makeField(o), (r, o) => {
        const fade = Math.min(1, o.life * 2), rad = o.r; r.group.position.set(o.x, 0, o.y);
        r.disc.scale.setScalar(rad); r.ring.scale.setScalar(rad * 0.97); r.disc.material.opacity = 0.14 * fade; r.ring.material.opacity = 0.75 * fade;
        const el = r.element, hgt = Math.min(110, 30 + rad * 0.7);
        r.beams.forEach((b, i) => {
          const a = i / r.beams.length * TAU + time * (el === 'Air' ? 2.2 : el === 'Shadow' ? -1.4 : 0.6) + r.seed, rr = rad * (el === 'Air' ? 0.25 + i * 0.1 : 0.7);
          const h = hgt * (0.55 + 0.45 * Math.sin(time * 3 + i * 1.7 + r.seed)); b.position.set(Math.cos(a) * rr, h / 2, Math.sin(a) * rr);
          b.scale.set(el === 'Light' ? 1.8 : 2.6, h, el === 'Light' ? 1.8 : 2.6); b.material.opacity = 0.5 * fade;
        });
        lightCand.push({ x: o.x, y: o.y, z: 30, c: r.color, i: 0.9 * fade, w: 1 });
      });
      this.sync(this.maps.hazards, hazards, o => this.makeHazard(o), (r, o) => {
        const total = o.friendly ? 0.65 : 1.3, wait = o.wait > 0, u = wait ? 1 - clamp(o.wait / total, 0, 1) : 1;
        r.group.position.set(o.x, 0, o.y); r.disc.scale.setScalar(o.r); r.ring.scale.setScalar(o.r);
        r.fill.scale.setScalar(Math.max(0.001, o.r * u)); r.fill.material.opacity = wait ? 0.2 + u * 0.25 : Math.max(0, o.life * 2.2);
        r.ring.material.opacity = wait ? 0.95 : Math.max(0, o.life * 3);
        r.pillar.material.opacity = wait ? 0 : Math.max(0, o.life * 1.4) * 0.7; r.pillar.scale.set(o.r * 0.6, 120 * Math.min(1, (2.1 - o.life) * 6 + 0.2), o.r * 0.6); r.pillar.position.y = r.pillar.scale.y / 2;
        if (!wait) lightCand.push({ x: o.x, y: o.y, z: 40, c: r.color, i: Math.min(1.6, o.life * 2), w: 2 });
      });
      this.sync(this.maps.fx, fx, o => this.makeFx(o), (r, o) => {
        const q = clamp(o.t / o.max, 0, 1), u = 1 - q;
        if (r.line) {
          const ax = o.x, az = o.y, bx = o.tx, bz = o.ty, dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
          r.group.position.set((ax + bx) / 2, 24, (az + bz) / 2); r.group.quaternion.setFromUnitVectors(new THREE_.Vector3(0, 1, 0), new THREE_.Vector3(dx, 0, dz).normalize());
          r.outer.scale.set(4 + 3 * q, len, 4 + 3 * q); r.inner.scale.set(1.3, len, 1.3); r.outer.material.opacity = 0.4 * q; r.inner.material.opacity = q;
          this.glow(this.glowBig, bx, bz, 24, r.color, q); lightCand.push({ x: bx, y: bz, z: 30, c: r.color, i: 1.6 * q, w: 3 });
        } else {
          const rad = Math.max(1, o.r) * (0.25 + u * 0.75); r.group.position.set(o.x, 0, o.y); r.ring.scale.setScalar(rad); r.ring.material.opacity = q;
          this.glow(this.glowBig, o.x, o.y, 14 + 20 * u, r.color, q * 0.9);
          for (let i = 0; i < 6; i++) { const a = i * 2.399 + r.seed, rr = rad * 0.8; this.glow(this.glowSmall, o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr, 8 + Math.sin(Math.PI * u) * rad * 0.5 * (0.6 + (i % 3) * 0.25), r.color, q); }
          lightCand.push({ x: o.x, y: o.y, z: 30, c: r.color, i: 1.4 * q, w: 2 });
        }
      });

      // Gems.
      const gm = this.gemMesh, gc = Math.min(gems.length, 2000), d = this.dummy, cA = new THREE_.Color('#c4b3ff'), cB = new THREE_.Color('#84dfcf');
      for (let i = 0; i < gc; i++) {
        const g = gems[i], big = g.v > 5; d.position.set(g.x, 7 + Math.sin(time * 4 + i) * 1.5, g.y); d.rotation.set(0, time * 2 + i, 0); d.scale.setScalar(big ? 6 : 4.2); d.updateMatrix();
        gm.setMatrixAt(i, d.matrix); gm.setColorAt(i, big ? cA : cB); if (i % 3 === 0) this.glow(this.glowSmall, g.x, g.y, 7, big ? cA : cB, 0.35);
      }
      gm.count = gc; gm.instanceMatrix.needsUpdate = true; if (gm.instanceColor) gm.instanceColor.needsUpdate = true;

      // Projectiles.
      const counts = { orb: 0, needle: 0, lance: 0, boulder: 0, disc: 0 };
      for (const s of shots) {
        const el = s.element, hostile = s.hostile, cls = hostile ? 'orb' : el === 'Earth' ? 'boulder' : el === 'Air' ? 'disc' : el === 'Light' ? 'lance' : NEEDLE_ELEMENTS.has(el) ? 'needle' : 'orb';
        const mesh = this.shotMeshes[cls], i = counts[cls]; if (i >= 800) continue; counts[cls]++;
        const z = el === 'Earth' ? 12 : el === 'Spirit' ? 32 + Math.sin(s.age * 7) * 6 : el === 'Air' ? 30 : 24, r = Math.max(3, s.r);
        d.position.set(s.x, z, s.y); d.rotation.set(0, 0, 0);
        if (cls === 'needle' || cls === 'lance') { d.lookAt(s.x + s.vx, z, s.y + s.vy); d.scale.set(r * 0.8, r * 0.8, cls === 'lance' ? 36 : r * 1.6); }
        else if (cls === 'disc') { d.rotation.set(0.25, time * 14 + s.age * 9, 0); d.scale.setScalar(r * 1.6); }
        else if (cls === 'boulder') { d.rotation.set(time * 2, s.age * 3, 0); d.scale.setScalar(r); }
        else d.scale.setScalar(r * (el === 'Spirit' ? 1 + Math.sin(s.age * 12) * 0.15 : 1));
        d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
        const color = this.tmpColor.set(hostile ? '#ff6b81' : (s.color || this.art.colors[el] || '#ffffff').slice(0, 7)); mesh.setColorAt(i, color);
        if (cls !== 'boulder') this.glow(this.glowBig, s.x, s.y, z, color, 0.8);
        if (!hostile && el !== 'Earth') lightCand.push({ x: s.x, y: s.y, z, c: color.clone(), i: 0.9, w: 0.5 });
      }
      for (const k in this.shotMeshes) { const m = this.shotMeshes[k]; m.count = counts[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      for (const sys of [this.glowBig, this.glowSmall]) { sys.geo.setDrawRange(0, sys.n); sys.geo.attributes.position.needsUpdate = true; sys.geo.attributes.color.needsUpdate = true; }

      // Landmark crystals.
      this.crystals.forEach((c, i) => { c.rotation.y = time * 0.8 + i; c.position.y = 62 + Math.sin(time * 1.6 + i) * 4; });

      // Dynamic lights: the four brightest/nearest effects drive point lights.
      lightCand.forEach(c => c.d2 = (c.x - p.x) ** 2 + (c.y - p.y) ** 2);
      lightCand.sort((a, b) => a.d2 / (a.w * a.i + 0.01) - b.d2 / (b.w * b.i + 0.01));
      this.pool.forEach((l, i) => { const c = lightCand[i]; if (c && c.d2 < 900 * 900) { l.position.set(c.x, c.z, c.y); l.color.copy(c.c); l.intensity = c.i * 1.8; } else l.intensity = 0; });

      // Sun / shadow volume follows the hero, snapped to shadow texels to avoid swimming.
      const half = clamp(cam.cur.dist * 0.9, 560, 1500), sc = this.sun.shadow.camera;
      if (Math.abs(half - this.shadowHalf) / this.shadowHalf > 0.04) { this.shadowHalf = half; Object.assign(sc, { left: -half, right: half, top: half, bottom: -half }); sc.updateProjectionMatrix(); }
      const texel = this.shadowHalf * 2 / this.shadowSize, cx = Math.round(cam.x / texel) * texel, cz = Math.round(cam.y / texel) * texel;
      this.sun.position.set(cx - 420, 900, cz - 300); this.sun.target.position.set(cx, 0, cz); this.sun.target.updateMatrixWorld();

      const camObj = cam.camera;
      if (f.shake) { camObj.position.x += (Math.random() - 0.5) * f.shake * 2; camObj.position.y += (Math.random() - 0.5) * f.shake * 2; camObj.updateMatrixWorld(); }
      this.renderer.render(this.scene, camObj);
      return true;
    }

    // CSS size of the layer; the camera keeps the game's logical 960x600 space so HUD projection stays valid.
    resize(cssWidth, cssHeight) { this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2)); this.renderer.setSize(cssWidth, cssHeight, false); }
    dispose() {
      this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
      this.scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.dispose?.()); });
      this.groundTexture?.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss?.();
    }
  }

  return { Camera3D, Renderer3D, POSE_3D, LIMITS, canvasPose, supported };
});
