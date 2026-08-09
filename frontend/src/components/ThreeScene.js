import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * ThreeScene — cinematic coastal seascape for the PortNova hero.
 *
 * Real animated shader waves (not a flat reflector), a custom warm golden
 * sky that blends to night, an iris-style glowing sun with light rays, and
 * a time-responsive moon. Mouse movement drifts the camera for depth.
 * Fully procedural, tuned for 60fps.
 */

/* Time of day: t in [0,1] over 24h, dayLight peaks at noon. */
const getDayLight = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const t = mins / 1440;
    return (Math.cos((t - 0.5) * Math.PI * 2) + 1) / 2;
};

/**
 * Celestial positions that track the real clock.
 * Sun: rises on the right (+X) at ~6am, arcs overhead to the middle at
 * noon, sets on the left (-X) at ~6pm. Moon runs the opposite night arc.
 * Returns direction vectors (for shaders + lights) plus altitude and sizes.
 */
const getCelestial = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const t = mins / 1440;
    const dayLight = (Math.cos((t - 0.5) * Math.PI * 2) + 1) / 2;

    // Sun: dayPhase 0 at 6am -> 1 at 6pm
    const dayPhase = (t - 0.25) / 0.5;
    const dc = Math.min(Math.max(dayPhase, 0), 1);
    const sunAlt = Math.sin(dc * Math.PI); // 0 horizon, 1 overhead
    const sunAz = Math.cos(dc * Math.PI); // +1 right, 0 center, -1 left
    const sunDir = new THREE.Vector3(sunAz * 0.9, sunAlt * 1.15, -1.0).normalize();
    const sunSize = 0.8 + sunAlt * 0.45; // slightly larger high in the sky

    // Moon: nightPhase 0 at 6pm -> 1 at 6am (opposite of sun)
    const nightPhase = (t - 0.75) / 0.5;
    const nc = ((nightPhase % 1) + 1) % 1;
    const moonAlt = Math.sin(nc * Math.PI);
    const moonAz = Math.cos(nc * Math.PI);
    const moonDir = new THREE.Vector3(moonAz * 0.9, moonAlt * 1.15, -1.0).normalize();
    const moonSize = 0.8 + moonAlt * 0.4;

    return { t, dayLight, sunDir, sunAlt, sunSize, moonDir, moonAlt, moonSize };
};

const SUN_DIR = new THREE.Vector3(0, 1.15, -1.0).normalize();
const MOON_DIR = new THREE.Vector3(0, 1.15, -1.0).normalize();

/* ------------------------------------------------------------------ */
/* Sky dome: warm golden near horizon, Mediterranean blue overhead,     */
/* blends to deep night colors, with sun + moon glow.                  */
/* ------------------------------------------------------------------ */
const SkyDome = () => {
    const mat = useRef(null);

    useFrame((state) => {
        if (!mat.current) return;
        const { dayLight, sunDir, moonDir } = getCelestial();
        mat.current.uniforms.uDayLight.value = dayLight;
        mat.current.uniforms.uSunDir.value.copy(sunDir);
        mat.current.uniforms.uMoonDir.value.copy(moonDir);
        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
        <mesh scale={[60, 60, 60]}>
            <sphereGeometry args={[1, 48, 32]} />
            <shaderMaterial
                ref={mat}
                side={THREE.BackSide}
                depthWrite={false}
                uniforms={{
                    uDayLight: { value: getDayLight() },
                    uTime: { value: 0 },
                    uSunDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                    uMoonDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                }}
                vertexShader={`
                    varying vec3 vDir;
                    void main() {
                        vDir = normalize(position);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform float uDayLight;
                    uniform float uTime;
                    uniform vec3 uSunDir;
                    uniform vec3 uMoonDir;
                    varying vec3 vDir;

                    vec3 dayTop    = vec3(0.16, 0.42, 0.68);
                    vec3 dayMid    = vec3(0.55, 0.72, 0.85);
                    vec3 dayHor    = vec3(1.00, 0.78, 0.52);
                    vec3 nightTop  = vec3(0.015, 0.03, 0.075);
                    vec3 nightHor  = vec3(0.10, 0.18, 0.32);

                    void main() {
                        vec3 d = normalize(vDir);
                        float h = clamp(d.y, -1.0, 1.0);

                        vec3 top = mix(nightTop, dayTop, uDayLight);
                        vec3 hor = mix(nightHor, dayHor, uDayLight);

                        vec3 col = mix(hor, top, smoothstep(0.0, 0.55, h));
                        col = mix(col, dayMid, smoothstep(0.18, 0.5, h) * uDayLight * 0.4);

                        // Golden sun glow (iris-style warm halo)
                        float s = max(dot(d, uSunDir), 0.0);
                        col += vec3(1.0, 0.72, 0.42) * pow(s, 6.0) * 1.1 * uDayLight;
                        col += vec3(1.0, 0.86, 0.62) * pow(s, 20.0) * 0.9 * uDayLight;

                        // Cool moon glow at night
                        float m = max(dot(d, uMoonDir), 0.0);
                        col += vec3(0.62, 0.72, 0.95) * pow(m, 8.0) * 0.8 * (1.0 - uDayLight);

                        gl_FragColor = vec4(col, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

/* ------------------------------------------------------------------ */
/* Water: animated layered waves with sun/moon glint + fresnel.        */
/* ------------------------------------------------------------------ */
const Water = () => {
    const mat = useRef(null);

    useFrame((state) => {
        if (!mat.current) return;
        const { dayLight, sunDir, moonDir } = getCelestial();
        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
        mat.current.uniforms.uDayLight.value = dayLight;
        mat.current.uniforms.uSunDir.value.copy(sunDir);
        mat.current.uniforms.uMoonDir.value.copy(moonDir);
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
            <planeGeometry args={[70, 70, 160, 160]} />
            <shaderMaterial
                ref={mat}
                uniforms={{
                    uTime: { value: 0 },
                    uDayLight: { value: getDayLight() },
                    uSunDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                    uMoonDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                    uShallow: { value: new THREE.Color('#1d8ba3') },
                    uDeep: { value: new THREE.Color('#06445f') },
                    uNight: { value: new THREE.Color('#071c30') },
                    uHorizon: { value: new THREE.Color('#f2c285') },
                }}
                vertexShader={`
                    uniform float uTime;
                    varying vec2 vUv;
                    varying vec3 vWorldPos;
                    varying vec3 vNormal;
                    varying float vH;

                    float wave(vec2 p, float t) {
                        float w = 0.0;
                        w += sin(p.x * 0.32 + t * 0.70) * 0.24;
                        w += cos(p.y * 0.48 + t * 0.52) * 0.17;
                        w += sin((p.x + p.y) * 0.21 + t * 0.85) * 0.13;
                        w += cos(p.x * 0.72 - t * 1.05 + p.y * 0.55) * 0.06;
                        return w;
                    }

                    void main() {
                        vUv = uv;
                        vec3 p = position;
                        float e = 0.18;
                        float h  = wave(p.xy, uTime);
                        float hx = wave(p.xy + vec2(e, 0.0), uTime);
                        float hy = wave(p.xy + vec2(0.0, e), uTime);
                        p.z = h;
                        vH = h;
                        vec3 n = normalize(vec3(h - hx, h - hy, e));
                        vNormal = normalize(normalMatrix * n);
                        vec4 wp = modelMatrix * vec4(p, 1.0);
                        vWorldPos = wp.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wp;
                    }
                `}
                fragmentShader={`
                    uniform float uTime;
                    uniform float uDayLight;
                    uniform vec3 uSunDir;
                    uniform vec3 uMoonDir;
                    uniform vec3 uShallow;
                    uniform vec3 uDeep;
                    uniform vec3 uNight;
                    uniform vec3 uHorizon;
                    varying vec2 vUv;
                    varying vec3 vWorldPos;
                    varying vec3 vNormal;
                    varying float vH;

                    void main() {
                        vec3 viewDir = normalize(cameraPosition - vWorldPos);
                        vec3 n = normalize(vNormal);

                        // Depth: uv.y = 1 at horizon, 0 near camera
                        float depth = 1.0 - vUv.y;
                        vec3 day = mix(uShallow, uDeep, depth);
                        day = mix(day, uHorizon, smoothstep(0.55, 0.95, vUv.y));
                        vec3 night = mix(vec3(0.04,0.12,0.2), uNight, depth);
                        vec3 col = mix(night, day, uDayLight);

                        // Fresnel: reflect sky near horizon
                        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
                        col += vec3(0.9, 0.95, 1.0) * fres * 0.25;

                        // Sun glint (iris-style sparkle)
                        vec3 refl = reflect(-uSunDir, n);
                        float spec = pow(max(dot(refl, viewDir), 0.0), 120.0);
                        col += vec3(1.0, 0.9, 0.62) * spec * (0.5 + 0.5 * uDayLight);

                        // Moon glint
                        vec3 reflM = reflect(-uMoonDir, n);
                        float specM = pow(max(dot(reflM, viewDir), 0.0), 160.0);
                        col += vec3(0.72, 0.82, 1.0) * specM * (1.0 - uDayLight) * 0.8;

                        // Foam on wave crests
                        float crest = smoothstep(0.16, 0.3, abs(vH));
                        col = mix(col, vec3(0.92, 0.96, 1.0), crest * 0.22);

                        gl_FragColor = vec4(col, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

/* ------------------------------------------------------------------ */
/* Iris-style glowing sun with light rays.                             */
/* ------------------------------------------------------------------ */
const Sun = () => {
    const mat = useRef(null);
    const groupRef = useRef(null);

    useFrame(() => {
        const { dayLight, sunDir, sunSize } = getCelestial();
        if (mat.current) mat.current.uniforms.uDayLight.value = dayLight;
        if (groupRef.current) {
            groupRef.current.position.set(sunDir.x * 22, sunDir.y * 22, sunDir.z * 22);
            groupRef.current.scale.setScalar(sunSize);
        }
    });

    return (
        <Billboard ref={groupRef} position={[0, 22, -22]}>
            <mesh>
                <planeGeometry args={[7, 7]} />
                <shaderMaterial
                    ref={mat}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uniforms={{ uDayLight: { value: getDayLight() } }}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uDayLight;
                        varying vec2 vUv;
                        void main() {
                            vec2 uv = vUv * 2.0 - 1.0;
                            float d = length(uv);
                            float core = smoothstep(0.42, 0.0, d);
                            float glow = exp(-d * 2.6);
                            float ang = atan(uv.y, uv.x);
                            float rays = pow(abs(sin(ang * 6.0)), 24.0) * exp(-d * 3.4);
                            vec3 col = vec3(1.0, 0.86, 0.55) * (core * 2.2 + glow * 0.7 + rays * 1.1);
                            gl_FragColor = vec4(col * uDayLight, 1.0);
                        }
                    `}
                />
            </mesh>
        </Billboard>
    );
};

/* ------------------------------------------------------------------ */
/* Moon with craters + halo, fades in at night.                        */
/* ------------------------------------------------------------------ */
const Moon = () => {
    const mat = useRef(null);
    const groupRef = useRef(null);

    useFrame(() => {
        const { dayLight, moonDir, moonSize } = getCelestial();
        if (mat.current) mat.current.uniforms.uNight.value = 1.0 - dayLight;
        if (groupRef.current) {
            groupRef.current.position.set(moonDir.x * 22, moonDir.y * 22, moonDir.z * 22);
            groupRef.current.scale.setScalar(moonSize);
        }
    });

    return (
        <Billboard ref={groupRef} position={[0, 22, -22]}>
            <mesh>
                <planeGeometry args={[2.4, 2.4]} />
                <shaderMaterial
                    ref={mat}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uniforms={{ uNight: { value: 1.0 - getDayLight() } }}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uNight;
                        varying vec2 vUv;
                        void main() {
                            vec2 uv = vUv * 2.0 - 1.0;
                            float d = length(uv);
                            float disc = smoothstep(0.5, 0.44, d);
                            float halo = exp(-d * 5.0) * 0.5;
                            // craters
                            float c1 = smoothstep(0.06, 0.0, distance(uv, vec2(0.18, -0.12)));
                            float c2 = smoothstep(0.05, 0.0, distance(uv, vec2(-0.2, 0.14)));
                            float c3 = smoothstep(0.04, 0.0, distance(uv, vec2(0.05, 0.2)));
                            vec3 col = vec3(0.9, 0.94, 1.0) * disc * 1.6;
                            col -= vec3(0.35, 0.4, 0.5) * (c1 + c2 + c3) * 0.5;
                            col += vec3(0.75, 0.82, 0.98) * halo;
                            gl_FragColor = vec4(col * uNight, 1.0);
                        }
                    `}
                />
            </mesh>
        </Billboard>
    );
};

/* ------------------------------------------------------------------ */
/* Mouse parallax rig: the camera drifts gently with the pointer.      */
/* ------------------------------------------------------------------ */
const MouseRig = ({ children }) => {
    const target = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const onMove = (event) => {
            target.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
            target.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    useFrame((state, delta) => {
        const cam = state.camera;
        const k = Math.min(1, delta * 2.2);
        cam.position.x += (target.current.x * 1.15 - cam.position.x) * k;
        cam.position.y += (2.35 + target.current.y * 0.45 - cam.position.y) * k;
        cam.lookAt(0, 1.0, 0);
    });

    return <>{children}</>;
};

/* ------------------------------------------------------------------ */
const SunLight = () => {
    const lightRef = useRef(null);

    useFrame(() => {
        const { sunDir, dayLight } = getCelestial();
        if (!lightRef.current) return;
        lightRef.current.position.copy(sunDir).multiplyScalar(6);
        lightRef.current.intensity = 0.6 + dayLight * 2.2;
    });

    return <directionalLight ref={lightRef} intensity={2.2} color="#ffd9a0" />;
};

/* ------------------------------------------------------------------ */
/* Real boat geometry — smooth chined hulls built from parametric       */
/* BufferGeometry, curved billowing sails, keel fin, proper materials.  */
/* No stacked cubes: a genuine ship silhouette.                        */
/* ------------------------------------------------------------------ */

/* Build a boat hull: a rounded, chined shell with a crowned deck.
   Bow points +X. Returns a BufferGeometry. */
/**
 * Build a smooth, lofted boat hull. Each station is a curved rib with a
 * round bilge and a gentle tumblehome — genuine boat curvature (concaves
 * and junctions), not angular chines. Bow points +X.
 */
const buildHullGeometry = (length, beam, depth, { stations = 36, ribs = 14, rocker = 0.06, sheerLift = 0.24, transom = 0.16, belly = 0.25 } = {}) => {
    const pos = [];
    const idx = [];
    // half-breadth along the length: transom at stern, pointed bow
    const profile = (t) => {
        const s = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
        return Math.pow(s, 0.75);
    };
    // grid[station][rib] -> vertex index
    const grid = [];
    for (let i = 0; i <= stations; i++) {
        const t = i / stations;
        const x = -length / 2 + length * t;
        const hw = (beam / 2) * (transom + (1 - transom) * profile(t));
        const kd = depth * profile(t);
        const sh = sheerLift + rocker * Math.sin(Math.PI * t);
        const rib = [];
        for (let r = 0; r <= ribs; r++) {
            const th = (r / ribs) * Math.PI; // 0 port sheer -> π starboard sheer
            // cross-section: sheer at θ=0/π, keel at θ=π/2, with round bilge
            const c = Math.cos(th);
            const sn = Math.sin(th);
            const z = -hw * c;
            const y = sh * c * c - kd * sn * sn;
            pos.push(x, y, z);
            rib.push(pos.length / 3 - 1);
        }
        grid.push(rib);
    }
    // connect hull shell between stations
    for (let i = 0; i < stations; i++) {
        for (let r = 0; r < ribs; r++) {
            const a = grid[i][r];
            const b = grid[i][r + 1];
            const c = grid[i + 1][r];
            const d = grid[i + 1][r + 1];
            idx.push(a, b, d, a, d, c);
        }
    }
    // deck: strip between port sheer (r=0) and starboard sheer (r=ribs)
    for (let i = 0; i < stations; i++) {
        const lp = grid[i][0];
        const lq = grid[i + 1][0];
        const rp = grid[i][ribs];
        const rq = grid[i + 1][ribs];
        idx.push(lp, rp, rq, lp, rq, lq);
    }
    // stern transom cap (fan from a center vertex)
    const stern = grid[0];
    const sternCX = pos.length / 3;
    pos.push(-length / 2, -depth * 0.5, 0);
    for (let r = 0; r < ribs; r++) {
        idx.push(stern[r], stern[r + 1], sternCX);
    }
    // bow cap (fan from a center vertex, just behind the point)
    const bow = grid[stations];
    const bowCX = pos.length / 3;
    pos.push(length / 2, sheerLift * 0.5, 0);
    for (let r = 0; r < ribs; r++) {
        idx.push(bow[r + 1], bow[r], bowCX);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

/* Build a billowing triangular sail (lateen/sloop). Belly in Z. */
const buildSailGeometry = (chord, height, belly, segments = 14) => {
    const pos = [];
    const idx = [];
    const n = segments;
    for (let j = 0; j <= n; j++) {
        const v = j / n; // 0 foot -> 1 head
        for (let i = 0; i <= n; i++) {
            const u = i / n; // 0 luff -> 1 leech
            const w = u * (1 - v); // tapers to a point at the head
            const x = w * chord;
            const y = v * height;
            const z = belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
            pos.push(x, y, z);
        }
    }
    const S = n + 1;
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const a = j * S + i;
            const b = a + 1;
            const c = a + S;
            const d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

/* Hulls are built with the deck well ABOVE the waterline (local y≈0.25-0.3)
   so the boat visibly floats instead of sinking to the keel. */
const sailHullGeo = buildHullGeometry(2.6, 0.95, 0.5, { stations: 36, ribs: 14, rocker: 0.07, sheerLift: 0.26, transom: 0.2, belly: 0.25 });
const cargoHullGeo = buildHullGeometry(3.3, 1.2, 0.55, { stations: 36, ribs: 14, rocker: 0.06, sheerLift: 0.32, transom: 0.16, belly: 0.3 });
const sailGeo = buildSailGeometry(1.8, 1.6, 0.34);

const WOOD = '#8b7355';
const WOOD_DARK = '#5c4033';
const DECK = '#d4a373';
const SAIL = '#f8fafc';

const CargoShipMesh = () => (
    <group>
        {/* chined hull (dark blue steel) — deck at local y≈0.34 above waterline */}
        <mesh geometry={cargoHullGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color="#1a365d" metalness={0.6} roughness={0.38} />
        </mesh>
        {/* deck sitting on the raised hull */}
        <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[3.1, 0.08, 1.0]} />
            <meshStandardMaterial color={DECK} metalness={0.15} roughness={0.6} />
        </mesh>
        {/* bridge / superstructure on the deck */}
        <mesh position={[1.05, 0.72, 0]}>
            <boxGeometry args={[0.95, 0.6, 0.72]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.3} />
        </mesh>
        <mesh position={[1.05, 0.82, 0.37]}>
            <boxGeometry args={[0.9, 0.4, 0.02]} />
            <meshStandardMaterial color="#0c4a6e" metalness={0.2} roughness={0.4} />
        </mesh>
        {/* funnel */}
        <mesh position={[1.35, 1.32, 0]}>
            <cylinderGeometry args={[0.11, 0.16, 0.6, 14]} />
            <meshStandardMaterial color="#123048" metalness={0.55} roughness={0.35} />
        </mesh>
        {/* cargo containers on the deck */}
        <mesh position={[-0.85, 0.68, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.55]} />
            <meshStandardMaterial color="#e0762a" metalness={0.25} roughness={0.45} />
        </mesh>
        <mesh position={[-0.15, 0.68, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.55]} />
            <meshStandardMaterial color="#1f9ac4" metalness={0.25} roughness={0.45} />
        </mesh>
        <mesh position={[-0.5, 1.0, 0]}>
            <boxGeometry args={[0.6, 0.24, 0.55]} />
            <meshStandardMaterial color="#3fa785" metalness={0.25} roughness={0.45} />
        </mesh>
        {/* foremast + flag */}
        <mesh position={[-1.4, 1.05, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 1.5, 8]} />
            <meshStandardMaterial color="#3a4a5c" metalness={0.45} roughness={0.45} />
        </mesh>
        <mesh position={[-1.4, 1.85, 0.04]} rotation={[0, 0, 0.35]}>
            <planeGeometry args={[0.6, 0.34]} />
            <meshStandardMaterial color="#1f9ac4" metalness={0.1} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
    </group>
);

const SailboatMesh = () => (
    <group>
        {/* keel fin below the waterline */}
        <mesh position={[0, -0.42, 0]}>
            <boxGeometry args={[0.9, 0.4, 0.06]} />
            <meshStandardMaterial color={WOOD_DARK} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* rounded wooden hull — deck at local y≈0.26 above waterline */}
        <mesh geometry={sailHullGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color={WOOD} metalness={0.18} roughness={0.55} />
        </mesh>
        {/* gunwale highlight on the raised rail */}
        <mesh position={[0, 0.26, 0]}>
            <boxGeometry args={[2.4, 0.04, 0.7]} />
            <meshStandardMaterial color="#c9a468" metalness={0.3} roughness={0.4} />
        </mesh>
        {/* deck */}
        <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[2.3, 0.04, 0.56]} />
            <meshStandardMaterial color={DECK} metalness={0.15} roughness={0.6} />
        </mesh>
        {/* small cabin */}
        <mesh position={[-0.55, 0.38, 0]}>
            <boxGeometry args={[0.7, 0.22, 0.5]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.15} roughness={0.45} />
        </mesh>
        {/* mast from the deck */}
        <mesh position={[0.45, 1.0, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 2.1, 10]} />
            <meshStandardMaterial color={WOOD_DARK} metalness={0.25} roughness={0.55} />
        </mesh>
        {/* billowing cream sail */}
        <mesh geometry={sailGeo} position={[0.45, 0.4, 0]} rotation={[0, 0, 0]}>
            <meshStandardMaterial color={SAIL} metalness={0.03} roughness={0.78} side={THREE.DoubleSide} />
        </mesh>
        {/* red sail stripe */}
        <mesh position={[1.25, 0.8, 0.02]} rotation={[0, 0, 0.35]}>
            <planeGeometry args={[1.05, 0.18]} />
            <meshStandardMaterial color="#b03a24" metalness={0.03} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* pennant */}
        <mesh position={[0.45, 2.05, 0]} rotation={[0, 0, 0.5]}>
            <planeGeometry args={[0.55, 0.13]} />
            <meshStandardMaterial color="#b03a24" metalness={0.03} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
    </group>
);

/* Approximate the water shader's surface height for boat bobbing. */
const waveH = (x, z, t) => {
    let w = 0;
    w += Math.sin(x * 0.32 + t * 0.7) * 0.24;
    w += Math.cos(z * 0.48 + t * 0.52) * 0.17;
    w += Math.sin((x + z) * 0.21 + t * 0.85) * 0.13;
    w += Math.cos(x * 0.72 - t * 1.05 + z * 0.55) * 0.06;
    return w;
};

/* Sailing fleet: 3D ships riding the waves. Projects each boat's real
   screen position into positionsRef so the DOM cards can follow it. */
const Fleet = ({ fleet, positionsRef }) => {
    const groups = useRef([]);
    const v = useRef(new THREE.Vector3());

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const cam = state.camera;
        const pos = positionsRef.current;
        fleet.forEach((b, i) => {
            const g = groups.current[i];
            if (!g || !pos) return;
            const range = b.range || 14;
            const raw = (t * b.speed + b.phase) % (2 * range);
            const x = raw > range ? 2 * range - raw : raw;
            const xs = x - range;
            const z = b.z;

            // Surface height + local slopes -> the boat truly rides the waves
            const eps = 0.35;
            const h0 = waveH(xs, z, t);
            const hx = waveH(xs + eps, z, t) - waveH(xs - eps, z, t);
            const hz = waveH(xs, z + eps, t) - waveH(xs, z - eps, t);
            const y = -0.35 + h0 * 0.7;

            g.position.set(xs, y, z);
            // pitch (X slope) and roll (Z slope) follow the wave face
            g.rotation.z = Math.atan(hx) * 0.55;
            g.rotation.x = Math.atan(hz) * 0.55;
            g.rotation.y = b.dir > 0 ? 0 : Math.PI;

            // project center to screen (%)
            v.current.set(xs, y + b.anchorY, z);
            v.current.project(cam);
            const sx = (v.current.x + 1) / 2;
            const sy = (1 - v.current.y) / 2;
            // project an offset to estimate on-screen width
            v.current.set(xs + b.w, y, z);
            v.current.project(cam);
            const wPct = Math.abs(((v.current.x + 1) / 2) - sx) * 100;
            const visible = v.current.z < 1 && sx > -0.25 && sx < 1.25 && sy > -0.25 && sy < 1.25;
            pos[b.id] = { x: sx * 100, y: sy * 100, w: Math.max(wPct, 7), visible };
        });
    });

    return (
        <group>
            {fleet.map((b, i) => (
                <group key={b.id} ref={(el) => { groups.current[i] = el; }} scale={b.scale}>
                    {b.kind === 'jobs' ? <CargoShipMesh /> : <SailboatMesh />}
                </group>
            ))}
        </group>
    );
};

/* ------------------------------------------------------------------ */
const SceneContents = () => (
    <>
        <ambientLight intensity={0.55} color="#ffe6c0" />
        <SunLight />
        <pointLight position={[-3, 2.2, 3]} intensity={8} distance={16} color="#ffe9c9" />

        <SkyDome />
        <Sun />
        <Moon />
        <Water />

        <Environment resolution={256}>
            <Lightformer intensity={3} position={[5, 3, -6]} scale={[8, 8, 1]} color="#ffd9a0" />
            <Lightformer intensity={1.4} position={[-4, 2, 3]} scale={[6, 6, 1]} color="#8fd8e8" />
            <Lightformer intensity={1.8} position={[0, 5, 0]} scale={[10, 4, 1]} color="#fff3cf" />
        </Environment>
    </>
);

const PostFX = () => (
    <EffectComposer>
        <Bloom intensity={0.45} luminanceThreshold={0.6} luminanceSmoothing={0.5} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.22} darkness={0.5} />
    </EffectComposer>
);

const ThreeScene = ({ className = '', fleet = [], positionsRef = null }) => (
    <div className={`three-scene ${className}`.trim()}>
        <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 2.35, 7.2], fov: 46, near: 0.1, far: 600 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
            <Suspense fallback={null}>
                <MouseRig>
                    <SceneContents />
                </MouseRig>
                {fleet.length ? <Fleet fleet={fleet} positionsRef={positionsRef} /> : null}
                <PostFX />
            </Suspense>
        </Canvas>
    </div>
);

export default ThreeScene;
