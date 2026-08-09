import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, MeshReflectorMaterial, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * ThreeScene — cinematic golden-hour seascape for the PortNova hero.
 *
 * A shader-lit reflective sea, a metallic "gateway" ring half-submerged,
 * a warm sunset sky with a low sun, and a gentle mouse parallax on the
 * camera. Everything is procedural (no external assets) and tuned for
 * a fluid 60fps on modest hardware.
 */

const WATER_PALETTE = '#0e4a6b';
const GOLD = '#d4af37';
const FOAM = '#f4efe0';

/* Subtle animated ripple overlay drawn on top of the reflector water. */
const RipplePlane = () => {
    const materialRef = useRef(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={[70, 70, 1, 1]} />
            <shaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                uniforms={{
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(FOAM) },
                }}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform float uTime;
                    uniform vec3 uColor;
                    varying vec2 vUv;
                    void main() {
                        vec2 p = vUv * vec2(5.0, 2.5);
                        float r1 = sin(p.x * 3.0 + uTime * 1.1) * cos(p.y * 4.0 - uTime * 0.8);
                        float r2 = sin(p.x * 7.0 - uTime * 1.7) * cos(p.y * 5.0 + uTime * 1.2);
                        float f = (r1 + r2) * 0.5;
                        float a = smoothstep(0.42, 1.0, abs(f)) * 0.16;
                        gl_FragColor = vec4(uColor, a);
                    }
                `}
            />
        </mesh>
    );
};

/* The metallic "gateway" ring, half-submerged, gently swaying. */
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
                <meshStandardMaterial
                    color={GOLD}
                    metalness={1}
                    roughness={0.22}
                    envMapIntensity={1.6}
                />
            </mesh>
            {/* Soft emissive core inside the ring for a hopeful glow */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.55, 0.1, 16, 110]} />
                <meshBasicMaterial color="#fff3cf" transparent opacity={0.35} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
};

/* Mouse parallax rig: the camera drifts gently with the pointer. */
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

/* Golden-hour scene contents. */
const SceneContents = () => {
    return (
        <>
            {/* Warm ambient + low golden sun + a cool sparkle light */}
            <ambientLight intensity={0.45} color="#ffedcc" />
            <directionalLight
                position={[1.2, 1.6, -5]}
                intensity={2.4}
                color="#ffcf8e"
            />
            <pointLight position={[-3, 2.2, 3]} intensity={10} distance={16} color="#ffe9c9" />

            {/* Warm golden-hour sky: low sun toward the viewer, soft haze */}
            <Sky
                distance={450000}
                sunPosition={[1.2, 0.9, -6]}
                turbidity={10}
                rayleigh={1.4}
                mieCoefficient={0.02}
                mieDirectionalG={0.85}
            />
            <mesh position={[1.2, 0.9, -6]}>
                <sphereGeometry args={[1.4, 24, 24]} />
                <meshBasicMaterial color="#ffdfa0" toneMapped={false} />
            </mesh>
            {/* Warm atmosphere haze to unify the scene */}
            <fog attach="fog" args={['#f3b26b', 14, 42]} />

            {/* Reflective sea */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[70, 70, 1, 1]} />
                <MeshReflectorMaterial
                    blur={[280, 90]}
                    resolution={512}
                    mixBlur={1}
                    mixStrength={70}
                    roughness={1}
                    depthScale={1.1}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.3}
                    color={WATER_PALETTE}
                    metalness={0.55}
                    mirror={0.55}
                />
            </mesh>
            <RipplePlane />

            {/* The gateway ring */}
            <GatewayRing />

            {/* Procedural environment so the metal picks up warm highlights */}
            <Environment resolution={256}>
                <Lightformer intensity={3} position={[5, 3, -6]} scale={[8, 8, 1]} color="#ffd9a0" />
                <Lightformer intensity={1.4} position={[-4, 2, 3]} scale={[6, 6, 1]} color="#8fd8e8" />
                <Lightformer intensity={1.8} position={[0, 5, 0]} scale={[10, 4, 1]} color="#fff3cf" />
            </Environment>
        </>
    );
};

/* Cinematic post-processing: gentle bloom + vignette for dreamlike haze. */
const PostFX = () => (
    <EffectComposer>
        <Bloom intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.4} mipmapBlur radius={0.75} />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
    </EffectComposer>
);

const ThreeScene = ({ className = '' }) => (
    <div className={`three-scene ${className}`.trim()}>
        <Canvas
            dpr={[1, 1.6]}
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
