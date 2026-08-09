import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * ThreeScene — cinematic coastal seascape for the PortNova hero.
 *
 * Real animated shader waves, warm golden sky, iris-style sun, moon, and a
 * fleet of real 3D ships that SAIL — each boat rides a continuous elliptical
 * orbit (never pops, never reverses), floats on the exact wave surface, and
 * carries a pennant that flutters in the wind. Tuned for 60fps.
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
 */
const getCelestial = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const t = mins / 1440;
    const dayLight = (Math.cos((t - 0.5) * Math.PI * 2) + 1) / 2;

    const dayPhase = (t - 0.25) / 0.5;
    const dc = Math.min(Math.max(dayPhase, 0), 1);
    const sunAlt = Math.sin(dc * Math.PI);
    const sunAz = Math.cos(dc * Math.PI);
    const sunDir = new THREE.Vector3(sunAz * 0.9, sunAlt * 1.15, -1.0).normalize();
    const sunSize = 0.8 + sunAlt * 0.45;

    const nightPhase = (t - 0.75) / 0.5;
    const nc = ((nightPhase % 1) + 1) % 1;
    const moonAlt = Math.sin(nc * Math.PI);
    const moonAz = Math.cos(nc * Math.PI);
    const moonDir = new THREE.Vector3(moonAz * 0.9, moonAlt * 1.15, -1.0).normalize();
    const moonSize = 0.8 + moonAlt * 0.4;

    return { t, dayLight, sunDir, sunAlt, sunSize, moonDir, moonAlt, moonSize };
};

/* ------------------------------------------------------------------ */
/* Sky dome: warm golden near horizon, Mediterranean blue overhead.     */
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
/* Water: layered waves scaled to the boats so hulls float with real    */
/* freeboard — the surface never exceeds the boat's draft.             */
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
            <planeGeometry args={[70, 70, 128, 128]} />
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
                        w += sin(p.x * 0.32 + t * 0.70) * 0.12;
                        w += cos(p.y * 0.48 + t * 0.52) * 0.08;
                        w += sin((p.x + p.y) * 0.21 + t * 0.85) * 0.05;
                        w += cos(p.x * 0.72 - t * 1.05 + p.y * 0.55) * 0.02;
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

                        float depth = 1.0 - vUv.y;
                        vec3 day = mix(uShallow, uDeep, depth);
                        day = mix(day, uHorizon, smoothstep(0.55, 0.95, vUv.y));
                        vec3 night = mix(vec3(0.04,0.12,0.2), uNight, depth);
                        vec3 col = mix(night, day, uDayLight);

                        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
                        col += vec3(0.9, 0.95, 1.0) * fres * 0.25;

                        vec3 refl = reflect(-uSunDir, n);
                        float spec = pow(max(dot(refl, viewDir), 0.0), 120.0);
                        col += vec3(1.0, 0.9, 0.62) * spec * (0.5 + 0.5 * uDayLight);

                        vec3 reflM = reflect(-uMoonDir, n);
                        float specM = pow(max(dot(reflM, viewDir), 0.0), 160.0);
                        col += vec3(0.72, 0.82, 1.0) * specM * (1.0 - uDayLight) * 0.8;

                        // Foam on the (now realistic) wave crests
                        float crest = smoothstep(0.10, 0.21, abs(vH));
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
/* Boat geometry — smooth lofted hulls with round bilge + tumblehome.  */
/* ------------------------------------------------------------------ */

/* Build a smooth, lofted boat hull. Each station is a curved rib with a
   round bilge and a gentle tumblehome — genuine boat curvature. Bow +X. */
const buildHullGeometry = (length, beam, depth, { stations = 36, ribs = 14, rocker = 0.06, sheerLift = 0.24, transom = 0.16, belly = 0.25 } = {}) => {
    const pos = [];
    const idx = [];
    const profile = (t) => {
        const s = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
        return Math.pow(s, 0.75);
    };
    const grid = [];
    for (let i = 0; i <= stations; i++) {
        const t = i / stations;
        const x = -length / 2 + length * t;
        const hw = (beam / 2) * (transom + (1 - transom) * profile(t));
        const kd = depth * profile(t);
        const sh = sheerLift + rocker * Math.sin(Math.PI * t);
        const rib = [];
        for (let r = 0; r <= ribs; r++) {
            const th = (r / ribs) * Math.PI;
            const c = Math.cos(th);
            const sn = Math.sin(th);
            const z = -hw * c;
            const y = sh * c * c - kd * sn * sn;
            pos.push(x, y, z);
            rib.push(pos.length / 3 - 1);
        }
        grid.push(rib);
    }
    for (let i = 0; i < stations; i++) {
        for (let r = 0; r < ribs; r++) {
            const a = grid[i][r];
            const b = grid[i][r + 1];
            const c = grid[i + 1][r];
            const d = grid[i + 1][r + 1];
            idx.push(a, b, d, a, d, c);
        }
    }
    for (let i = 0; i < stations; i++) {
        const lp = grid[i][0];
        const lq = grid[i + 1][0];
        const rp = grid[i][ribs];
        const rq = grid[i + 1][ribs];
        idx.push(lp, rp, rq, lp, rq, lq);
    }
    const stern = grid[0];
    const sternCX = pos.length / 3;
    pos.push(-length / 2, -depth * 0.5, 0);
    for (let r = 0; r < ribs; r++) {
        idx.push(stern[r], stern[r + 1], sternCX);
    }
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

/* Billowing triangular sail with a red band baked into vertex colors
   (no overlapping plane — kills the z-fighting flicker). */
const buildSailGeometry = (chord, height, belly, segments = 14) => {
    const pos = [];
    const idx = [];
    const col = [];
    const n = segments;
    const CREAM = [0.965, 0.975, 0.995];
    const RED = [0.72, 0.24, 0.15];
    for (let j = 0; j <= n; j++) {
        const v = j / n;
        for (let i = 0; i <= n; i++) {
            const u = i / n;
            const w = u * (1 - v);
            const x = w * chord;
            const y = v * height;
            const z = belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
            pos.push(x, y, z);
            const inBand = v > 0.70 && v < 0.90 && u > 0.06;
            const c = inBand ? RED : CREAM;
            col.push(c[0], c[1], c[2]);
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
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

/* Tapered triangular pennant grid (animated by the wind in Banner). */
const buildPennantGeometry = (length, height, segments = 12) => {
    const pos = [];
    const idx = [];
    const n = segments;
    for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = u * length;
        pos.push(x, 0, 0); // top edge, level
        pos.push(x, -height * (1 - u * 0.88), 0); // bottom edge rises to tip
    }
    for (let i = 0; i < n; i++) {
        const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
        idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
};

const WOOD = '#8b7355';
const WOOD_DARK = '#5c4033';

/* Clash-Royale-style identity banner whose pennant FLUTTERS in the wind
   (anchored at the pole, free end waves). */
const Banner = ({ color = '#1f9ac4', poleH = 2.0, topY = 1.7, length = 1.15 }) => {
    const meshRef = useRef(null);
    const geo = useMemo(() => buildPennantGeometry(length, 0.62), [length]);

    useFrame((state) => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const attr = mesh.geometry.attributes.position;
        const arr = attr.array;
        const t = state.clock.elapsedTime;
        for (let i = 0; i < arr.length; i += 3) {
            const x = arr[i];
            const u = x / length;
            const flutter = Math.pow(u, 1.4);
            arr[i + 2] = flutter * (Math.sin(x * 8 - t * 11) + 0.5 * Math.sin(x * 13 - t * 18)) * 0.09;
        }
        attr.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
    });

    return (
        <group>
            <mesh position={[0, poleH / 2, 0]}>
                <cylinderGeometry args={[0.035, 0.045, poleH, 8]} />
                <meshStandardMaterial color={WOOD_DARK} metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh ref={meshRef} geometry={geo} position={[0.02, topY, 0]}>
                <meshStandardMaterial color={color} metalness={0.05} roughness={0.55} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh position={[0, poleH, 0]}>
                <sphereGeometry args={[0.07, 10, 10]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.2} roughness={0.4} />
            </mesh>
        </group>
    );
};

const CargoShipMesh = () => (
    <group>
        {/* lofted hull — closes its own deck, no overlapping boxes */}
        <mesh geometry={cargoHullGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color="#1a365d" metalness={0.6} roughness={0.38} />
        </mesh>
        {/* bridge / superstructure sitting on the hull deck */}
        <mesh position={[1.05, 0.62, 0]}>
            <boxGeometry args={[0.95, 0.55, 0.7]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* window band — clearly proud of the bridge face (no coplanar overlap) */}
        <mesh position={[1.05, 0.62, 0.43]}>
            <boxGeometry args={[0.85, 0.3, 0.04]} />
            <meshStandardMaterial color="#0c4a6e" metalness={0.2} roughness={0.4} />
        </mesh>
        {/* funnel */}
        <mesh position={[1.35, 1.1, 0]}>
            <cylinderGeometry args={[0.11, 0.16, 0.6, 14]} />
            <meshStandardMaterial color="#123048" metalness={0.55} roughness={0.35} />
        </mesh>
        {/* cargo containers on the deck */}
        <mesh position={[-0.85, 0.62, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.55]} />
            <meshStandardMaterial color="#e0762a" metalness={0.25} roughness={0.45} />
        </mesh>
        <mesh position={[-0.15, 0.62, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.55]} />
            <meshStandardMaterial color="#1f9ac4" metalness={0.25} roughness={0.45} />
        </mesh>
        <mesh position={[-0.5, 0.94, 0]}>
            <boxGeometry args={[0.6, 0.24, 0.55]} />
            <meshStandardMaterial color="#3fa785" metalness={0.25} roughness={0.45} />
        </mesh>
        {/* identity banner (blue) at the stern */}
        <group position={[-1.35, 0.34, 0]}>
            <Banner color="#1f9ac4" poleH={2.1} topY={1.85} length={1.15} />
        </group>
    </group>
);

/* Sail that keeps billowing and gently rippling in the wind. */
const Sail = () => {
    const meshRef = useRef(null);
    const geo = useMemo(() => buildSailGeometry(1.8, 1.6, 0.34), []);

    useFrame((state) => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const attr = mesh.geometry.attributes.position;
        const arr = attr.array;
        const t = state.clock.elapsedTime;
        for (let i = 0; i < arr.length; i += 3) {
            const x = arr[i];
            const y = arr[i + 1];
            const u = Math.min(x / 1.8, 1);
            arr[i + 2] = 0.34 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (y / 1.6))
                + 0.05 * u * Math.sin(x * 7 - t * 10 + y * 2.5);
        }
        attr.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
    });

    return (
        <mesh ref={meshRef} geometry={geo} position={[0.45, 0.4, 0]}>
            <meshStandardMaterial vertexColors side={THREE.DoubleSide} color="#ffffff" metalness={0.03} roughness={0.78} />
        </mesh>
    );
};

const SailboatMesh = () => (
    <group>
        {/* keel fin below the waterline */}
        <mesh position={[0, -0.6, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.06]} />
            <meshStandardMaterial color={WOOD_DARK} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* rounded wooden hull — closes its own deck, no overlapping boxes */}
        <mesh geometry={sailHullGeo} position={[0, 0, 0]}>
            <meshStandardMaterial color={WOOD} metalness={0.18} roughness={0.55} />
        </mesh>
        {/* small cabin sitting on the hull deck */}
        <mesh position={[-0.55, 0.34, 0]}>
            <boxGeometry args={[0.7, 0.22, 0.5]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.15} roughness={0.45} />
        </mesh>
        {/* mast from the deck */}
        <mesh position={[0.45, 1.0, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 2.1, 10]} />
            <meshStandardMaterial color={WOOD_DARK} metalness={0.25} roughness={0.55} />
        </mesh>
        {/* billowing, rippling sail (red band baked into vertex colors) */}
        <Sail />
        {/* identity banner (gold) at the bow */}
        <group position={[-0.35, 0.22, 0]}>
            <Banner color="#d4af37" poleH={2.2} topY={1.9} length={1.2} />
        </group>
    </group>
);

const sailHullGeo = buildHullGeometry(2.6, 0.95, 0.5, { stations: 36, ribs: 14, rocker: 0.07, sheerLift: 0.26, transom: 0.2, belly: 0.25 });
const cargoHullGeo = buildHullGeometry(3.3, 1.2, 0.55, { stations: 36, ribs: 14, rocker: 0.06, sheerLift: 0.32, transom: 0.16, belly: 0.3 });

/* Exact match of the Water shader's surface — same amplitudes, same time.
   The boat's heave tracks this precisely, so it floats and never sinks. */
const waveH = (x, z, t) => {
    let w = 0;
    w += Math.sin(x * 0.32 + t * 0.70) * 0.12;
    w += Math.cos(z * 0.48 + t * 0.52) * 0.08;
    w += Math.sin((x + z) * 0.21 + t * 0.85) * 0.05;
    w += Math.cos(x * 0.72 - t * 1.05 + z * 0.55) * 0.02;
    return w;
};

/* Sailing fleet. Each boat sails steadily FORWARD across the sea — straight
   through the visible water, exiting one edge and seamlessly re-entering the
   other fully off-screen (no pop, no reversal) — exactly like Clash Royale
   boats. The travel span tracks the visible sea width for the current screen,
   so all boats stay on view on any device. Projects each boat's screen
   position so the DOM cards follow it. */
const Fleet = ({ fleet, positionsRef }) => {
    const groups = useRef([]);
    const v = useRef(new THREE.Vector3());

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const cam = state.camera;
        const pos = positionsRef.current;
        // Horizontal half-width of the view at a given depth, for this aspect
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(46 / 2)) * (state.size.width / state.size.height);
        fleet.forEach((b, i) => {
            const g = groups.current[i];
            if (!g || !pos) return;

            // Span = visible half-width at the boat's depth + a small margin,
            // so it crosses the whole sea and wraps fully off-screen.
            const span = (7.2 - b.z) * tanHalf + (b.margin || 2);
            const raw = (t * b.speed * b.dir + (b.phase || 0) * span * 2) % (span * 2);
            const x = raw - span;
            const z = b.z;

            // Float on the exact wave surface, plus the boat's draft so the
            // hull has real freeboard (visible waterline, never submerged).
            const eps = 0.5;
            const h0 = waveH(x, z, t);
            const hx = waveH(x + eps, z, t) - waveH(x - eps, z, t);
            const hz = waveH(x, z + eps, t) - waveH(x, z - eps, t);
            const y = -0.35 + h0 + (b.lift || 0);

            // Fixed facing: sail right with the bow forward, left turned round
            g.rotation.y = b.dir > 0 ? 0 : Math.PI;
            g.rotation.z = Math.atan(hx) * 0.5;
            g.rotation.x = Math.atan(hz) * 0.4;

            g.position.set(x, y, z);

            // project center to screen (%)
            v.current.set(x, y + b.anchorY, z);
            v.current.project(cam);
            const sx = (v.current.x + 1) / 2;
            const sy = (1 - v.current.y) / 2;
            v.current.set(x + b.w, y, z);
            v.current.project(cam);
            const wPct = Math.abs(((v.current.x + 1) / 2) - sx) * 100;
            const visible = v.current.z < 1 && sx > -0.2 && sx < 1.2 && sy > -0.2 && sy < 1.2;
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
        <Bloom intensity={0.32} luminanceThreshold={0.62} luminanceSmoothing={0.5} mipmapBlur radius={0.6} />
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
