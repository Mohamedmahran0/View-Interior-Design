'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PointerLockControls, TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/store/editorStore';
import Room from './Room';

// WASD Keyboard Movement for First-Person Walkthrough
function WalkthroughMovement() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 4.5 * delta;
    const dir = new THREE.Vector3();
    const frontVector = new THREE.Vector3(
      0,
      0,
      (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0)
    );
    const sideVector = new THREE.Vector3(
      (keys.current['KeyA'] ? 1 : 0) - (keys.current['KeyD'] ? 1 : 0),
      0,
      0
    );

    dir
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    
    camera.position.add(dir);
    // Lock camera height to 1.7m (realistic human eye line)
    camera.position.y = 1.7;
  });

  return null;
}

// Dynamic GLB Model Loader component
function LoadedModel({ url, onSelect }: { url: string; onSelect: (obj: THREE.Object3D) => void }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene}
      onClick={(e: any) => {
        e.stopPropagation();
        onSelect(e.object);
      }}
    />
  );
}

interface SceneContentProps {
  modelUrl?: string;
  projectId?: string;
}

function SceneContent({ modelUrl, projectId }: SceneContentProps) {
  const {
    isWalkthrough,
    setIsWalkthrough,
    transformMode,
    setTransformMode,
    selectedId,
    setSelectedId,
    setSelectedTransform,
    selectedMaterial,
    hdrPreset,
    environmentIntensity,
    environmentRotation,
    showBackground,
    pushHistory,
    undo,
    redo,
    saveToSupabase,
    loadFromSupabase,
  } = useEditorStore();

  const { scene } = useThree();
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);
  const transformRef = useRef<any>(null);
  const defaultMeshRef = useRef<THREE.Mesh>(null);

  // Load saved metadata from Supabase on start
  useEffect(() => {
    if (projectId) {
      loadFromSupabase(projectId);
    }
  }, [projectId, loadFromSupabase]);

  // Keyboard Shortcuts: W, E, R, Ctrl+Z, Ctrl+Shift+Z, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Transform Modes
      if (e.key === 'w' || e.key === 'W') {
        setTransformMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        setTransformMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        setTransformMode('scale');
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }

      // Deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        selectedObjectRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTransformMode, undo, redo, setSelectedId]);

  // Auto-Save interval (Prompt 5: Every 30 seconds debounce)
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      saveToSupabase(projectId, scene);
    }, 30000);
    return () => clearInterval(interval);
  }, [projectId, scene, saveToSupabase]);

  // Synchronize material changes to selected mesh
  useEffect(() => {
    const target = selectedObjectRef.current || defaultMeshRef.current;
    if (target && (target as THREE.Mesh).material) {
      const mat = (target as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat.color) {
        mat.color.set(selectedMaterial.color);
        mat.roughness = selectedMaterial.roughness;
        mat.metalness = selectedMaterial.metalness;
        mat.needsUpdate = true;
      }
    }
  }, [selectedMaterial]);

  // Handle object selection
  const handleObjectSelect = (obj: THREE.Object3D) => {
    selectedObjectRef.current = obj;
    setSelectedId(obj.uuid);
    setSelectedTransform({
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [
        THREE.MathUtils.radToDeg(obj.rotation.x),
        THREE.MathUtils.radToDeg(obj.rotation.y),
        THREE.MathUtils.radToDeg(obj.rotation.z),
      ],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    });
  };

  // Sync transform gizmo changes
  const handleTransformChange = () => {
    const obj = selectedObjectRef.current || defaultMeshRef.current;
    if (obj) {
      setSelectedTransform({
        position: [
          parseFloat(obj.position.x.toFixed(2)),
          parseFloat(obj.position.y.toFixed(2)),
          parseFloat(obj.position.z.toFixed(2)),
        ],
        rotation: [
          parseFloat(THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1)),
          parseFloat(THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1)),
          parseFloat(THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1)),
        ],
        scale: [
          parseFloat(obj.scale.x.toFixed(2)),
          parseFloat(obj.scale.y.toFixed(2)),
          parseFloat(obj.scale.z.toFixed(2)),
        ],
      });
    }
  };

  const handleTransformMouseUp = () => {
    pushHistory('Transform Object');
  };

  const activeTarget = selectedId
    ? (selectedObjectRef.current || defaultMeshRef.current)
    : null;

  return (
    <>
      {/* Background & Tone Mapping Environment */}
      <color attach="background" args={['#080c14']} />

      {/* Photorealistic Lighting & Shadows (Prompt 4) */}
      <ambientLight intensity={0.25} color="#e0f2fe" />
      <directionalLight
        position={[8, 12, 6]}
        intensity={2.2}
        castShadow
        shadow-bias={-0.0001}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-4, 3, -4]} intensity={0.8} color="#fef08a" />

      {/* Realistic HDR Environment with Rotation & Intensity */}
      <Suspense fallback={null}>
        <Environment
          preset={hdrPreset as any}
          background={showBackground}
          environmentIntensity={environmentIntensity}
          environmentRotation={[0, THREE.MathUtils.degToRad(environmentRotation), 0]}
        />
      </Suspense>

      {/* Room boundary */}
      <Room width={7} depth={6} height={3.2} />

      {/* Loaded GLB Model or Default Interactive Furniture Piece */}
      {modelUrl ? (
        <Suspense fallback={null}>
          <LoadedModel url={modelUrl} onSelect={handleObjectSelect} />
        </Suspense>
      ) : (
        <group position={[0, 0, 0]}>
          {/* Piece 1: Modern Designer Coffee Table (Default Target) */}
          <mesh
            ref={defaultMeshRef}
            position={[0, 0.25, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              handleObjectSelect(e.object);
            }}
          >
            <boxGeometry args={[1.6, 0.45, 0.9]} />
            <meshStandardMaterial
              color={selectedMaterial.color}
              roughness={selectedMaterial.roughness}
              metalness={selectedMaterial.metalness}
            />
          </mesh>

          {/* Piece 2: Sleek Low-Profile Modern Sofa */}
          <group position={[0, 0, -1.6]}>
            {/* Sofa Base */}
            <mesh
              position={[0, 0.35, 0]}
              castShadow
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                handleObjectSelect(e.object);
              }}
            >
              <boxGeometry args={[2.8, 0.5, 1.1]} />
              <meshStandardMaterial color="#27272a" roughness={0.8} metalness={0.05} />
            </mesh>
            {/* Sofa Backrest */}
            <mesh position={[0, 0.8, -0.4]} castShadow receiveShadow>
              <boxGeometry args={[2.8, 0.6, 0.3]} />
              <meshStandardMaterial color="#27272a" roughness={0.85} metalness={0.05} />
            </mesh>
            {/* Left Armrest */}
            <mesh position={[-1.3, 0.55, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.25, 0.45, 1.1]} />
              <meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0.05} />
            </mesh>
            {/* Right Armrest */}
            <mesh position={[1.3, 0.55, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.25, 0.45, 1.1]} />
              <meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0.05} />
            </mesh>
          </group>

          {/* Piece 3: Accent Lounge Armchair */}
          <mesh
            position={[-2.2, 0.4, 0.1]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              handleObjectSelect(e.object);
            }}
          >
            <boxGeometry args={[0.9, 0.7, 0.9]} />
            <meshStandardMaterial color="#065f46" roughness={0.7} metalness={0.1} />
          </mesh>

          {/* Piece 4: Minimalist Floor Lamp */}
          <group position={[2.2, 0, -1.8]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 2.2, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh
              position={[0, 2.1, 0]}
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                handleObjectSelect(e.object);
              }}
            >
              <cylinderGeometry args={[0.25, 0.35, 0.4, 32]} />
              <meshStandardMaterial color="#fef08a" roughness={0.3} emissive="#fef08a" emissiveIntensity={0.2} />
            </mesh>
          </group>

          {/* Piece 5: Decorative Vase / Art Piece on Table */}
          <mesh
            position={[0.35, 0.58, 0]}
            castShadow
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              handleObjectSelect(e.object);
            }}
          >
            <sphereGeometry args={[0.13, 32, 32]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* TransformControls Gizmo */}
      {!isWalkthrough && activeTarget && (
        <TransformControls
          ref={transformRef}
          object={activeTarget}
          mode={transformMode}
          onObjectChange={handleTransformChange}
          onMouseUp={handleTransformMouseUp}
        />
      )}

      {/* Ground Grid */}
      <Grid
        infiniteGrid
        fadeDistance={35}
        sectionColor="#1e293b"
        cellColor="#0f172a"
        visible={!isWalkthrough}
      />

      {/* Controls: Walkthrough vs Orbit */}
      {isWalkthrough ? (
        <>
          <PointerLockControls
            selector="#walkthrough-btn"
            onUnlock={() => setIsWalkthrough(false)}
          />
          <WalkthroughMovement />
        </>
      ) : (
        <OrbitControls
          makeDefault={!activeTarget}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.05}
          maxDistance={30}
          minDistance={1}
        />
      )}
    </>
  );
}

export default function Scene3D({
  modelUrl,
  projectId,
}: {
  modelUrl?: string;
  projectId?: string;
}) {
  return (
    <div className="w-full h-full absolute inset-0 z-0" id="canvas-container">
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [0, 2, 5], fov: 60 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          alpha: true,
        }}
      >
        <SceneContent modelUrl={modelUrl} projectId={projectId} />
      </Canvas>
    </div>
  );
}
