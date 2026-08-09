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

const getDayLight = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const t = mins / 1440;
    return (Math.cos((t - 0.5) * Math.PI * 2) + 1) / 2;
};

const SUN_DIR = new THREE.Vector3(1.2, 1.6, -5).normalize();
const MOON_DIR = new THREE.Vector3(-1.4, 1.3, -4).normalize();

/* ------------------------------------------------------------------ */
/* Sky dome: warm golden near horizon, Mediterranean blue overhead,     */
/* blends to deep night colors, with sun + moon glow.                  */
/* ------------------------------------------------------------------ */
const SkyDome = () => {
    const mat = useRef(null);

    useFrame((state) => {
        if (!mat.current) return;
        mat.current.uniforms.uDayLight.value = getDayLight();
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
                    uSunDir: { value: SUN_DIR },
                    uMoonDir: { value: MOON_DIR },
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
        mat.current.uniforms.uTime.value = state.clock.elapsedTime;
        mat.current.uniforms.uDayLight.value = getDayLight();
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
            <planeGeometry args={[70, 70, 160, 160]} />
            <shaderMaterial
                ref={mat}
                uniforms={{
                    uTime: { value: 0 },
                    uDayLight: { value: getDayLight() },
                    uSunDir: { value: SUN_DIR },
                    uMoonDir: { value: MOON_DIR },
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

    useFrame(() => {
        if (!mat.current) return;
        mat.current.uniforms.uDayLight.value = getDayLight();
    });

    return (
        <Billboard position={[SUN_DIR.x * 22, SUN_DIR.y * 22, SUN_DIR.z * 22]}>
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

    useFrame(() => {
        if (!mat.current) return;
        mat.current.uniforms.uNight.value = 1.0 - getDayLight();
    });

    return (
        <Billboard position={[MOON_DIR.x * 22, MOON_DIR.y * 22, MOON_DIR.z * 22]}>
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
/* The metallic "gateway" ring, half-submerged, gently swaying.        */
/* ------------------------------------------------------------------ */
const GatewayRing = () => {
    const groupRef = useRef(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.04;
        groupRef.current.rotation.x = Math.sin(t * 0.3 + 1.2) * 0.03;
    });

    return (
        <group ref={groupRef} position={[0, 0.15, -1.4]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.55, 0.16, 28, 110]} />
                <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.22} envMapIntensity={1.6} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.55, 0.1, 16, 110]} />
                <meshBasicMaterial color="#fff3cf" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
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
const SceneContents = () => (
    <>
        <ambientLight intensity={0.55} color="#ffe6c0" />
        <directionalLight position={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} intensity={2.2} color="#ffd9a0" />
        <pointLight position={[-3, 2.2, 3]} intensity={8} distance={16} color="#ffe9c9" />

        <SkyDome />
        <Sun />
        <Moon />
        <Water />
        <GatewayRing />

        <Environment resolution={256}>
            <Lightformer intensity={3} position={[5, 3, -6]} scale={[8, 8, 1]} color="#ffd9a0" />
            <Lightformer intensity={1.4} position={[-4, 2, 3]} scale={[6, 6, 1]} color="#8fd8e8" />
            <Lightformer intensity={1.8} position={[0, 5, 0]} scale={[10, 4, 1]} color="#fff3cf" />
        </Environment>
    </>
);

const PostFX = () => (
    <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.6} />
    </EffectComposer>
);

const ThreeScene = ({ className = '' }) => (
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
                <PostFX />
            </Suspense>
        </Canvas>
    </div>
);

export default ThreeScene;
