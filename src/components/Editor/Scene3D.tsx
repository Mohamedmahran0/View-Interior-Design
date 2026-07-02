'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PointerLockControls, TransformControls } from '@react-three/drei';
import { MeshEditor } from '@wendylabsinc/react-three-mesh-editor';
import * as THREE from 'three';
import { useEditorStore } from '@/store/editorStore';
import Room from './Room';

// Custom WASD keyboard controls for the PointerLock
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

  useFrame((state, delta) => {
    const speed = 5 * delta;
    const dir = new THREE.Vector3();
    // Forward/Backward (W/S)
    const frontVector = new THREE.Vector3(0, 0, (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0));
    // Left/Right (A/D)
    const sideVector = new THREE.Vector3((keys.current['KeyA'] ? 1 : 0) - (keys.current['KeyD'] ? 1 : 0), 0, 0);
    
    // Calculate movement relative to camera look direction
    dir.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    camera.position.add(dir);
    // Lock height to 1.7m (average human height)
    camera.position.y = 1.7;
  });

  return null;
}

function SceneContent() {
  const { isWalkthrough, setIsWalkthrough, transformMode, editorMode, selectedMaterial, environmentIntensity } = useEditorStore();
  const [selected, setSelected] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  const boxGeometry = React.useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // Apply material changes dynamically
  useEffect(() => {
    if (meshRef.current) {
      const material = (meshRef.current as any).material;
      if (material) {
        material.color.set(selectedMaterial.color);
        material.roughness = selectedMaterial.roughness;
        material.metalness = selectedMaterial.metalness;
      }
    }
  }, [selectedMaterial]);

  return (
    <>
      <color attach="background" args={['#080c14']} />
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={2} 
        castShadow 
        shadow-mapSize={2048}
      />
      
      <Room width={6} depth={5} height={3} />
      
      {/* Dynamic Editable Furniture Piece */}
      <group position={[0, 0, 0]}>
        {editorMode === 'edit' ? (
          <mesh ref={meshRef} geometry={boxGeometry} position={[0, 0.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={selectedMaterial.color} roughness={selectedMaterial.roughness} metalness={selectedMaterial.metalness} />
            <MeshEditor geometry={boxGeometry} />
          </mesh>
        ) : (
          <mesh 
            ref={meshRef} 
            geometry={boxGeometry}
            onClick={(e) => { e.stopPropagation(); setSelected(true); }}
            onPointerMissed={() => setSelected(false)}
            position={[0, 0.5, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={selectedMaterial.color} roughness={selectedMaterial.roughness} metalness={selectedMaterial.metalness} />
          </mesh>
        )}
        
        {!isWalkthrough && selected && editorMode === 'object' && meshRef.current && (
          <TransformControls object={meshRef.current} mode={transformMode} />
        )}
      </group>
      
      <Grid infiniteGrid fadeDistance={30} sectionColor="#1e293b" cellColor="#0f172a" visible={!isWalkthrough} />
      
      <Environment preset="studio" background={false} environmentIntensity={environmentIntensity} />

      {isWalkthrough ? (
        <>
          <PointerLockControls selector="#lock-button" onUnlock={() => setIsWalkthrough(false)} />
          <WalkthroughMovement />
        </>
      ) : (
        <OrbitControls makeDefault={!selected || editorMode === 'edit'} minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} />
      )}
    </>
  );
}

export default function Scene3D() {
  return (
    <div className="w-full h-full absolute inset-0 z-0" id="canvas-container">
      <Canvas 
        shadows 
        camera={{ position: [0, 1.7, 3], fov: 75 }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}

