import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
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

/* Sky brightness 0..1 for the current clock. Full by day, fades through dusk
   after sunset, deep night from ~20:15, and dawn fades in before sunrise. */
const getDayLight = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const SUNRISE = 330; // 5:30
    const SUNSET = 1125; // 18:45
    const NIGHT = 1215;  // 20:15
    if (mins >= SUNRISE && mins <= SUNSET) {
        const alt = Math.sin((Math.PI * (mins - SUNRISE)) / (SUNSET - SUNRISE));
        return Math.max(0.5, alt);
    }
    if (mins > SUNSET) {
        return Math.max(0, 0.5 * (1 - (mins - SUNSET) / (NIGHT - SUNSET)));
    }
    const dawnStart = SUNRISE - 120;
    return Math.max(0, Math.min(0.5, ((mins - dawnStart) / (SUNRISE - dawnStart)) * 0.5));
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

    const SUNRISE = 330;   // 5:30
    const SUNSET = 1125;   // 18:45
    const NIGHT = 1215;    // 20:15
    const NOON = (SUNRISE + SUNSET) / 2;

    // Sun altitude 0..1 (0 at/below the horizon, 1 overhead at noon)
    let sunAlt = 0;
    if (mins >= SUNRISE && mins <= SUNSET) {
        sunAlt = Math.sin((Math.PI * (mins - SUNRISE)) / (SUNSET - SUNRISE));
    }

    const skyLight = getDayLight();

    // Warmth: 0 at high noon, 1 at the horizon — drives the dawn/dusk glow
    const warmth = Math.pow(Math.max(0, 1 - sunAlt), 1.35);
    const isDusk = mins > NOON;

    // Sun glow: full while the sun is up, fades through dusk, off at deep
    // night, and a faint pre-dawn glow returns just before sunrise.
    let sunGlow = 0;
    if (sunAlt > 0) {
        sunGlow = 1;
    } else if (mins > SUNSET) {
        sunGlow = Math.max(0, 1 - (mins - SUNSET) / (NIGHT - SUNSET));
    } else {
        sunGlow = Math.max(0, Math.min(1, (mins - (SUNRISE - 60)) / 60));
    }

    // Azimuth: rises on the right, crosses the middle at noon, sets on the left
    const dc = Math.min(Math.max((mins - SUNRISE) / (SUNSET - SUNRISE), 0), 1);
    const sunAz = Math.cos(dc * Math.PI);
    const sunDir = new THREE.Vector3(sunAz * 0.85, sunAlt * 1.15 + 0.02, -1.0).normalize();

    // Sun colour follows the real clock: white-gold at noon, yellow at dawn,
    // deep orange at dusk — fully responsive, never static.
    const sunColor = new THREE.Color('#fff2cf')
        .lerp(isDusk ? new THREE.Color('#ff8a3d') : new THREE.Color('#ffd27a'), warmth);

    // Moon: opposite night arc, fades in as night falls (~30 min after dusk)
    const nightPhase = (t - 0.75) / 0.5;
    const nc = ((nightPhase % 1) + 1) % 1;
    const moonAlt = Math.sin(nc * Math.PI);
    const moonAz = Math.cos(nc * Math.PI);
    const moonDir = new THREE.Vector3(moonAz * 0.85, moonAlt * 1.1, -1.0).normalize();
    const moonVisible = Math.max(0, Math.min(1, 1 - skyLight * 1.8));

    return {
        t, skyLight, sunDir, sunAlt, sunColor, warmth, sunGlow, isDusk,
        moonDir, moonAlt, moonSize: 0.9 + moonAlt * 0.35, sunSize: 0.8 + sunAlt * 0.45, moonVisible,
    };
};

/* Keep a celestial body inside the visible sky on narrow (phone) screens,
   preserving its elevation. On wide screens the full rise/fall sweep is used. */
const fitToView = (dir, aspect) => {
    const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(46 / 2)) * aspect);
    const az = Math.atan2(dir.x, -dir.z);
    // The sun/moon sweep about ±40° of azimuth in reality. Remap that whole
    // sweep onto the visible sky width, so they travel edge-to-edge above the
    // sea following the real clock, and never leave the frame.
    const CEL = THREE.MathUtils.degToRad(40);
    const k = Math.min(1, halfH / CEL);
    const cl = az * k;
    // Keep them inside the vertical view, arcing just above the horizon.
    const el = Math.atan2(dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z));
    const maxEl = THREE.MathUtils.degToRad(8);
    const minEl = THREE.MathUtils.degToRad(2);
    const clEl = Math.max(minEl, Math.min(maxEl, el));
    const cosE = Math.cos(clEl);
    const sinE = Math.sin(clEl);
    return new THREE.Vector3(Math.sin(cl) * cosE, sinE, -Math.cos(cl) * cosE);
};

/* ------------------------------------------------------------------ */
/* Sky dome: warm golden near horizon, Mediterranean blue overhead.     */
/* ------------------------------------------------------------------ */
const SkyDome = () => {
    const mat = useRef(null);

    useFrame((state) => {
        if (!mat.current) return;
        const { skyLight, sunDir, moonDir, sunColor, warmth, sunGlow, moonVisible } = getCelestial();
        const aspect = state.size.width / state.size.height;
        // Keep the sun & moon inside the visible sky on every screen
        const viewDir = (d) => fitToView(d, aspect);
        mat.current.uniforms.uDayLight.value = skyLight;
        mat.current.uniforms.uDusk.value = warmth;
        mat.current.uniforms.uSunGlow.value = sunGlow;
        mat.current.uniforms.uMoonVisible.value = moonVisible;
        mat.current.uniforms.uSunDir.value.copy(viewDir(sunDir));
        mat.current.uniforms.uMoonDir.value.copy(viewDir(moonDir));
        mat.current.uniforms.uSunColor.value.copy(sunColor);
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
                    uDusk: { value: 0 },
                    uSunGlow: { value: 1 },
                    uMoonVisible: { value: 0 },
                    uSunDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                    uMoonDir: { value: new THREE.Vector3(0, 1.15, -1).normalize() },
                    uSunColor: { value: new THREE.Color('#fff2cf') },
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
                    uniform float uDusk;
                    uniform float uSunGlow;
                    uniform float uMoonVisible;
                    uniform vec3 uSunDir;
                    uniform vec3 uMoonDir;
                    uniform vec3 uSunColor;
                    varying vec3 vDir;

                    vec3 dayTop   = vec3(0.11, 0.37, 0.63);
                    vec3 dayHor   = vec3(0.98, 0.80, 0.56);
                    vec3 nightTop = vec3(0.008, 0.016, 0.05);
                    vec3 nightHor = vec3(0.05, 0.09, 0.18);

                    void main() {
                        vec3 d = normalize(vDir);
                        float h = clamp(d.y, -1.0, 1.0);

                        vec3 top = mix(nightTop, dayTop, uDayLight);
                        vec3 hor = mix(nightHor, dayHor, uDayLight);
                        // gentle sun tint on the horizon at dawn/dusk
                        hor = mix(hor, uSunColor * 1.05, uDusk * uSunGlow * 0.4);

                        vec3 col = mix(hor, top, smoothstep(0.0, 0.6, h));

                        // clean time-coloured sun: soft warm glow + bright disc
                        float s = max(dot(d, uSunDir), 0.0);
                        col += uSunColor * pow(s, 4.0) * (0.15 + 0.8 * uDusk) * uSunGlow;
                        col += uSunColor * smoothstep(0.9960, 0.9990, s) * 2.4 * uSunGlow;
                        col += uSunColor * pow(s, 20.0) * 1.0 * uSunGlow;

                        // faint cool iris halo around the 3D moon in the night sky
                        float m = max(dot(d, uMoonDir), 0.0);
                        col += vec3(0.78, 0.85, 1.0) * pow(m, 5.0) * 0.3 * uMoonVisible;
                        col += vec3(0.82, 0.88, 1.0) * pow(m, 18.0) * 0.45 * uMoonVisible;

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
        const { skyLight, sunDir, moonDir } = getCelestial();
        const aspect = state.size.width / state.size.height;
        // Keep the sun/moon glint matching the visible sun/moon
        const viewDir = (d) => fitToView(d, aspect);
        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
        mat.current.uniforms.uDayLight.value = skyLight;
        mat.current.uniforms.uSunDir.value.copy(viewDir(sunDir));
        mat.current.uniforms.uMoonDir.value.copy(viewDir(moonDir));
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

                        // Clear water, not a fog bank: the pale sky sheen is
                        // kept subtle, especially at night.
                        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
                        col += vec3(0.9, 0.95, 1.0) * fres * (0.08 + 0.16 * uDayLight);

                        vec3 refl = reflect(-uSunDir, n);
                        float spec = pow(max(dot(refl, viewDir), 0.0), 120.0);
                        col += vec3(1.0, 0.9, 0.62) * spec * (0.5 + 0.5 * uDayLight);

                        vec3 reflM = reflect(-uMoonDir, n);
                        float specM = pow(max(dot(reflM, viewDir), 0.0), 160.0);
                        col += vec3(0.72, 0.82, 1.0) * specM * (1.0 - uDayLight) * 0.8;

                        // Foam on the wave crests (barely visible at night so
                        // the sea reads as clear water, not a fog bank)
                        float crest = smoothstep(0.10, 0.21, abs(vH));
                        col = mix(col, vec3(0.92, 0.96, 1.0), crest * 0.2 * (0.12 + 0.88 * uDayLight));

                        gl_FragColor = vec4(col, 1.0);
                    }
                `}
            />
        </mesh>
    );
};

/* The sun and moon are drawn directly inside the SkyDome shader so there is
   exactly one crisp disc in the sky — no billboards, no square glow edges. */



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
        const { sunDir, skyLight } = getCelestial();
        if (!lightRef.current) return;
        lightRef.current.position.copy(sunDir).multiplyScalar(6);
        // nearly off at night so the scene reads as a real night, not dawn
        lightRef.current.intensity = 0.05 + skyLight * 2.2;
    });

    return <directionalLight ref={lightRef} intensity={2.2} color="#ffd9a0" />;
};

/* ------------------------------------------------------------------ */
/* 3D starfield: crisp points fixed on the sky sphere, fading in as     */
/* night falls so they match the time-of-day atmosphere.               */
/* ------------------------------------------------------------------ */
/* Starfield: round, softly glowing stars rendered as true point sprites in
   the scene — perfectly round (no polygon facets), with natural colours,
   varied sizes, and a gentle twinkle. They fade in as night falls. */
const StarField = () => {
    const ref = useRef(null);
    const matRef = useRef(null);
    const geo = useMemo(() => {
        const count = 700;
        const pos = new Float32Array(count * 3);
        const size = new Float32Array(count);
        const bright = new Float32Array(count);
        const color = new Float32Array(count * 3);
        const R = 58;
        for (let i = 0; i < count; i++) {
            const y = 0.03 + Math.random() * 0.97; // upper sky only
            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.max(0, 1 - y * y));
            pos[i * 3] = Math.cos(a) * r * R;
            pos[i * 3 + 1] = y * R;
            pos[i * 3 + 2] = Math.sin(a) * r * R;
            size[i] = 2.5 + Math.pow(Math.random(), 2.0) * 9.0;
            bright[i] = 0.4 + Math.pow(Math.random(), 2.0) * 0.6;
            const k = Math.random();
            if (k < 0.15) { color[i * 3] = 0.75; color[i * 3 + 1] = 0.84; color[i * 3 + 2] = 1.0; }      // blue-white
            else if (k < 0.28) { color[i * 3] = 1.0; color[i * 3 + 1] = 0.92; color[i * 3 + 2] = 0.78; } // warm gold
            else { color[i * 3] = 0.94; color[i * 3 + 1] = 0.97; color[i * 3 + 2] = 1.0; }              // white
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
        g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
        g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
        return g;
    }, []);

    useFrame((state) => {
        if (matRef.current) {
            const { skyLight } = getCelestial();
            matRef.current.uniforms.uOpacity.value = Math.max(0, Math.min(1, (1 - skyLight) * 1.15));
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            matRef.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
        }
        if (ref.current) ref.current.rotation.y += 0.00025;
    });

    return (
        <points ref={ref} geometry={geo}>
            <shaderMaterial
                ref={matRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                uniforms={{
                    uOpacity: { value: 0 },
                    uTime: { value: 0 },
                    uPixelRatio: { value: 1 },
                }}
                vertexShader={`
                    attribute float aSize;
                    attribute float aBright;
                    attribute vec3 aColor;
                    uniform float uTime;
                    uniform float uPixelRatio;
                    varying float vBright;
                    varying vec3 vColor;
                    void main() {
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        gl_Position = projectionMatrix * mv;
                        float tw = 0.8 + 0.2 * sin(uTime * 1.6 + aBright * 40.0);
                        gl_PointSize = aSize * tw * uPixelRatio * (40.0 / -mv.z);
                        vBright = aBright * tw;
                        vColor = aColor;
                    }
                `}
                fragmentShader={`
                    uniform float uOpacity;
                    varying float vBright;
                    varying vec3 vColor;
                    void main() {
                        vec2 p = gl_PointCoord - 0.5;
                        float d = length(p) * 2.0;
                        // perfectly round star: smooth radial falloff
                        float glow = exp(-d * d * 4.5);
                        float core = smoothstep(0.5, 0.0, d);
                        vec3 col = vColor * (core * 1.7 + glow * 0.9);
                        gl_FragColor = vec4(col * vBright, uOpacity);
                    }
                `}
            />
        </points>
    );
};

/* ------------------------------------------------------------------ */
/* 3D moon: a smooth, clean sphere with a soft day/night terminator —   */
/* no noisy craters — drifting through the sky with the real clock.    */
/* ------------------------------------------------------------------ */
const Moon3D = () => {
    const groupRef = useRef(null);
    const matRef = useRef(null);

    useFrame((state) => {
        const { moonDir, moonVisible, sunDir } = getCelestial();
        const aspect = state.size.width / state.size.height;
        const d = fitToView(moonDir, aspect);
        if (groupRef.current) {
            groupRef.current.position.copy(d).multiplyScalar(40);
            groupRef.current.visible = moonVisible > 0.02;
        }
        if (matRef.current) {
            matRef.current.uniforms.uVisible.value = moonVisible;
            matRef.current.uniforms.uLightDir.value.copy(sunDir);
        }
    });

    return (
        <group ref={groupRef} position={[0, 40, 0]}>
            <mesh>
                <sphereGeometry args={[2.1, 64, 64]} />
                <shaderMaterial
                    ref={matRef}
                    transparent
                    depthWrite
                    uniforms={{
                        uVisible: { value: 0 },
                        uLightDir: { value: new THREE.Vector3(0, 0, -1) },
                    }}
                    vertexShader={`
                        varying vec3 vNormal;
                        varying vec3 vWorldPos;
                        varying vec3 vDir;
                        void main() {
                            vNormal = normalize(normalMatrix * normal);
                            vec4 wp = modelMatrix * vec4(position, 1.0);
                            vWorldPos = wp.xyz;
                            vDir = normalize(position);
                            gl_Position = projectionMatrix * viewMatrix * wp;
                        }
                    `}
                    fragmentShader={`
                        uniform float uVisible;
                        uniform vec3 uLightDir;
                        varying vec3 vNormal;
                        varying vec3 vWorldPos;
                        varying vec3 vDir;

                        float hash1(vec3 p) {
                            p = fract(p * 0.1031);
                            p += dot(p, p.zyx + 31.32);
                            return fract((p.x + p.y) * p.z);
                        }

                        // smooth 3D value noise — soft, large-scale features
                        float vnoise(vec3 p) {
                            vec3 i = floor(p);
                            vec3 f = fract(p);
                            f = f * f * (3.0 - 2.0 * f);
                            return mix(
                                mix(mix(hash1(i), hash1(i + vec3(1,0,0)), f.x),
                                    mix(hash1(i + vec3(0,1,0)), hash1(i + vec3(1,1,0)), f.x), f.y),
                                mix(mix(hash1(i + vec3(0,0,1)), hash1(i + vec3(1,0,1)), f.x),
                                    mix(hash1(i + vec3(0,1,1)), hash1(i + vec3(1,1,1)), f.x), f.y),
                                f.z);
                        }

                        // a soft dark crater patch of angular radius r
                        float craterAt(vec3 p, vec3 c, float r) {
                            float d = acos(clamp(dot(normalize(p), normalize(c)), -1.0, 1.0));
                            return smoothstep(r, r * 0.78, d);
                        }

                        void main() {
                            vec3 n = normalize(vNormal);
                            vec3 viewDir = normalize(cameraPosition - vWorldPos);
                            vec3 light = normalize(uLightDir);
                            vec3 p = normalize(vDir);

                            // soft day/night terminator (lit side faces the sun)
                            float diff = max(dot(n, light), 0.0);
                            float term = smoothstep(-0.12, 0.3, diff);

                            // lunar surface: smooth maria + a few distinct craters
                            float maria = vnoise(p * 2.2) * 0.5 + vnoise(p * 5.0) * 0.3;
                            float cr = 0.0;
                            cr += craterAt(p, vec3(0.55, 0.45, 0.35), 0.34);
                            cr += craterAt(p, vec3(-0.5, 0.55, 0.5), 0.26);
                            cr += craterAt(p, vec3(0.15, 0.7, -0.3), 0.2);
                            cr += craterAt(p, vec3(-0.35, -0.6, 0.5), 0.3);
                            cr += craterAt(p, vec3(0.7, -0.3, 0.4), 0.18);
                            cr += craterAt(p, vec3(-0.8, -0.1, 0.2), 0.16);

                            // realistic grey moon (not a white basketball):
                            // dark maria and darker crater floors on a grey body
                            vec3 base = mix(vec3(0.80, 0.82, 0.87), vec3(0.55, 0.59, 0.67),
                                clamp(maria * 0.8 + cr * 0.3, 0.0, 1.0));

                            // sunlit face with a gentle terminator, faint night side
                            vec3 col = base * (0.06 + term * 1.3);

                            // very subtle limb brightening
                            float limb = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);
                            col += vec3(0.72, 0.78, 0.95) * limb * 0.1;

                            col *= uVisible;
                            gl_FragColor = vec4(col, uVisible);
                        }
                    `}
                />
            </mesh>
        </group>
    );
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

            // The ship stays fully opaque: it sails across the screen border
            // like a vessel coming from the open sea, wraps around off-screen,
            // and sails back in — no fading in/out at the edges.
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
        <StarField />
        <Moon3D />
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
