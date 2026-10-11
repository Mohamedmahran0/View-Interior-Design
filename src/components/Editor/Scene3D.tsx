'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  PointerLockControls,
  TransformControls,
  ContactShadows,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore, PlacedItem } from '@/store/editorStore';
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

// Dynamic GLB Model Loader component (for uploaded user models)
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

// Realistic Parametric 3D Furniture Items
function FurnitureMesh({ item }: { item: PlacedItem }) {
  const color = item.material?.color || '#3b82f6';
  const roughness = item.material?.roughness ?? 0.5;
  const metalness = item.material?.metalness ?? 0.1;

  switch (item.type) {
    case 'sofa':
      return (
        <group>
          {/* Main Seat Cushion */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.42, 1.05]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 0.78, -0.38]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.58, 0.28]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Left Armrest */}
          <mesh position={[-1.25, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 0.48, 1.06]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Right Armrest */}
          <mesh position={[1.25, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.26, 0.48, 1.06]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Throw Accent Pillows */}
          <mesh position={[-0.8, 0.62, -0.22]} rotation={[0, 0.2, 0.1]} castShadow>
            <boxGeometry args={[0.42, 0.38, 0.12]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.7} />
          </mesh>
          <mesh position={[0.8, 0.62, -0.22]} rotation={[0, -0.2, -0.1]} castShadow>
            <boxGeometry args={[0.42, 0.38, 0.12]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.7} />
          </mesh>
          {/* Tapered Brass Legs */}
          {([[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]] as const).map(([x, z], idx) => (
            <mesh key={idx} position={[x, 0.07, z]} castShadow>
              <cylinderGeometry args={[0.02, 0.03, 0.14, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );

    case 'table':
      return (
        <group>
          {/* Polished Table Slab */}
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.05, 0.85]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Smoked Glass Lower Tier */}
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.02, 0.72]} />
            <meshPhysicalMaterial transparent opacity={0.5} roughness={0.1} color="#0f172a" />
          </mesh>
          {/* Architectural Steel Legs */}
          {([[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]] as const).map(([x, z], idx) => (
            <mesh key={idx} position={[x, 0.21, z]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.42, 16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      );

    case 'chair':
      return (
        <group>
          {/* Cushion */}
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.85, 0.16, 0.82]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Angled Backrest */}
          <mesh position={[0, 0.72, -0.34]} rotation={[0.1, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.85, 0.54, 0.14]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Low Armrests */}
          <mesh position={[-0.42, 0.5, 0]} castShadow>
            <boxGeometry args={[0.1, 0.22, 0.75]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[0.42, 0.5, 0]} castShadow>
            <boxGeometry args={[0.1, 0.22, 0.75]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Splayed Solid Wood Legs */}
          {([[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.3], [0.34, 0.3]] as const).map(([x, z], idx) => (
            <mesh key={idx} position={[x, 0.15, z]} rotation={[z > 0 ? 0.1 : -0.1, 0, x > 0 ? -0.1 : 0.1]} castShadow>
              <cylinderGeometry args={[0.02, 0.015, 0.32, 16]} />
              <meshStandardMaterial color="#5c3a21" roughness={0.6} />
            </mesh>
          ))}
        </group>
      );

    case 'lamp':
      return (
        <group>
          {/* Heavy Brass Base */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.24, 0.04, 32]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
          </mesh>
          {/* Slender Stem */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.96, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
          </mesh>
          {/* Luminous Lampshade */}
          <mesh position={[0, 1.95, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.34, 0.42, 32]} />
            <meshStandardMaterial
              color="#fffbeb"
              roughness={0.4}
              emissive="#fef08a"
              emissiveIntensity={0.35}
            />
          </mesh>
          {/* Warm Internal Glow */}
          <pointLight position={[0, 1.9, 0]} intensity={1.5} distance={5} color="#fed7aa" decay={2} castShadow />
        </group>
      );

    case 'plant':
      return (
        <group>
          {/* Architectural Ceramic Pot */}
          <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.18, 0.44, 32]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.35} metalness={0.1} />
          </mesh>
          {/* Soil */}
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 32]} />
            <meshStandardMaterial color="#2d1810" roughness={0.95} />
          </mesh>
          {/* Trunk & Tropical Leaves */}
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.6, 12]} />
            <meshStandardMaterial color="#14532d" roughness={0.6} />
          </mesh>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = THREE.MathUtils.degToRad(deg);
            return (
              <mesh
                key={i}
                position={[Math.sin(rad) * 0.25, 0.75 + (i % 3) * 0.15, Math.cos(rad) * 0.25]}
                rotation={[0.3, rad, 0.2]}
                castShadow
              >
                <boxGeometry args={[0.28, 0.015, 0.42]} />
                <meshStandardMaterial color={color || '#15803d'} roughness={0.45} />
              </mesh>
            );
          })}
        </group>
      );

    case 'rug':
      return (
        <group>
          <mesh position={[0, 0.008, 0]} receiveShadow>
            <boxGeometry args={[2.8, 0.016, 2.0]} />
            <meshStandardMaterial color={color} roughness={0.98} metalness={0.0} />
          </mesh>
          <mesh position={[0, 0.009, 0]} receiveShadow>
            <boxGeometry args={[2.86, 0.014, 2.06]} />
            <meshStandardMaterial color="#475569" roughness={0.95} />
          </mesh>
        </group>
      );

    case 'cabinet':
      return (
        <group>
          {/* Body */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.52, 0.46]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          {/* Door panels */}
          <mesh position={[-0.48, 0.45, 0.235]} castShadow>
            <boxGeometry args={[0.88, 0.46, 0.02]} />
            <meshStandardMaterial color="#1f2937" roughness={0.6} />
          </mesh>
          <mesh position={[0.48, 0.45, 0.235]} castShadow>
            <boxGeometry args={[0.88, 0.46, 0.02]} />
            <meshStandardMaterial color="#1f2937" roughness={0.6} />
          </mesh>
          {/* Tapered brass legs */}
          {([[-0.85, -0.18], [0.85, -0.18], [-0.85, 0.18], [0.85, 0.18]] as const).map(([x, z], idx) => (
            <mesh key={idx} position={[x, 0.1, z]} castShadow>
              <cylinderGeometry args={[0.018, 0.015, 0.2, 16]} />
              <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );

    case 'wall':
      return (
        <group>
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 2.8, 0.15]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={roughness ?? 0.85} metalness={metalness ?? 0.05} />
          </mesh>
          <mesh position={[0, 0.05, 0.08]} castShadow>
            <boxGeometry args={[2.5, 0.1, 0.02]} />
            <meshStandardMaterial color="#374151" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, -0.08]} castShadow>
            <boxGeometry args={[2.5, 0.1, 0.02]} />
            <meshStandardMaterial color="#374151" roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.76, 0]} castShadow>
            <boxGeometry args={[2.52, 0.08, 0.18]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.7} />
          </mesh>
        </group>
      );

    case 'door':
      return (
        <group>
          <mesh position={[-0.52, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 2.4, 0.12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0.52, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 2.4, 0.12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 2.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.12, 0.08, 0.12]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[-0.04, 1.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.96, 2.32, 0.05]} />
            <meshStandardMaterial color={color || '#5c3a21'} roughness={roughness ?? 0.6} metalness={metalness ?? 0.1} />
          </mesh>
          <mesh position={[0.36, 1.05, 0.04]} castShadow>
            <boxGeometry args={[0.12, 0.02, 0.03]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.36, 1.05, -0.04]} castShadow>
            <boxGeometry args={[0.12, 0.02, 0.03]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      );

    case 'window':
      return (
        <group>
          <mesh position={[-1.0, 1.3, 0]} castShadow>
            <boxGeometry args={[0.06, 2.6, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[1.0, 1.3, 0]} castShadow>
            <boxGeometry args={[0.06, 2.6, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 2.57, 0]} castShadow>
            <boxGeometry args={[2.06, 0.06, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[2.06, 0.06, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[0.04, 2.5, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[1.96, 2.48, 0.015]} />
            <meshPhysicalMaterial
              transparent
              opacity={0.3}
              roughness={0.05}
              transmission={0.9}
              thickness={0.5}
              color="#e0f2fe"
            />
          </mesh>
        </group>
      );

    case 'column':
      return (
        <group>
          <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.12, 0.55]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, 1.44, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 2.64, 32]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={roughness ?? 0.3} metalness={metalness ?? 0.1} />
          </mesh>
          <mesh position={[0, 2.76, 0]} castShadow>
            <boxGeometry args={[0.55, 0.12, 0.55]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={0.3} metalness={0.1} />
          </mesh>
        </group>
      );

    case 'stairs':
      return (
        <group>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((stepIdx) => {
            const y = 0.12 + stepIdx * 0.24;
            const z = -0.9 + stepIdx * 0.28;
            return (
              <group key={stepIdx} position={[0, y, z]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[1.3, 0.06, 0.34]} />
                  <meshStandardMaterial color={color || '#5c3a21'} roughness={roughness ?? 0.5} metalness={metalness ?? 0.1} />
                </mesh>
                <mesh position={[-0.66, 0.05, 0]} castShadow>
                  <cylinderGeometry args={[0.015, 0.015, 0.12, 16]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>
            );
          })}
          <mesh position={[-0.68, 1.15, 0.1]} rotation={[0.65, 0, 0]}>
            <boxGeometry args={[0.02, 2.5, 0.85]} />
            <meshPhysicalMaterial transparent opacity={0.35} transmission={0.8} roughness={0.1} color="#e2e8f0" />
          </mesh>
        </group>
      );

    case 'bed':
      return (
        <group>
          <mesh position={[0, 0.72, -1.05]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 1.35, 0.18]} />
            <meshStandardMaterial color={color || '#1e293b'} roughness={0.85} metalness={0.05} />
          </mesh>
          <mesh position={[0, 1.4, -1.05]} castShadow>
            <boxGeometry args={[2.24, 0.04, 0.2]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.16, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.28, 2.1]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.42, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.28, 2.0]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.58, 0.25]} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.08, 1.45]} />
            <meshStandardMaterial color={color || '#0f766e'} roughness={0.85} />
          </mesh>
          {[-0.5, 0.5].map((x, i) => (
            <group key={i} position={[x, 0.62, -0.68]} rotation={[0.2, 0, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.65, 0.14, 0.42]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.12, 0.06]} castShadow>
                <boxGeometry args={[0.5, 0.1, 0.32]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.8} />
              </mesh>
            </group>
          ))}
          {[-1.38, 1.38].map((x, idx) => (
            <group key={idx} position={[x, 0, -0.85]}>
              <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.48, 0.45]} />
                <meshStandardMaterial color="#1f2937" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.1, 0.12, 16]} />
                <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.68, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.18, 0.18, 16]} />
                <meshStandardMaterial color="#fff" emissive="#fef08a" emissiveIntensity={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'kitchen_island':
      return (
        <group>
          <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.06, 1.1]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={0.15} metalness={0.1} />
          </mesh>
          <mesh position={[-1.23, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.92, 1.1]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={0.15} metalness={0.1} />
          </mesh>
          <mesh position={[1.23, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.92, 1.1]} />
            <meshStandardMaterial color={color || '#f3f4f6'} roughness={0.15} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.44, -0.1]} castShadow receiveShadow>
            <boxGeometry args={[2.34, 0.88, 0.85]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>
          <mesh position={[0.4, 0.93, 0]} castShadow>
            <boxGeometry args={[0.55, 0.02, 0.42]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.4, 1.08, -0.22]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.28, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
          {[-0.45, 0.45].map((x, i) => (
            <group key={i} position={[x, 0, 0.8]}>
              <mesh position={[0, 0.65, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
                <meshStandardMaterial color="#5c3a21" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.32, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.64, 12]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      );

    case 'balcony_railing':
      return (
        <group>
          <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.8, 0.08, 0.08]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[2.74, 1.06, 0.018]} />
            <meshPhysicalMaterial transparent opacity={0.3} transmission={0.9} roughness={0.05} color="#e0f2fe" />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[2.8, 0.04, 0.08]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
          </mesh>
          {[-1.38, 0, 1.38].map((x, i) => (
            <mesh key={i} position={[x, 0.6, 0]} castShadow>
              <boxGeometry args={[0.04, 1.12, 0.05]} />
              <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.25} />
            </mesh>
          ))}
        </group>
      );

    case 'curtain':
      return (
        <group>
          <mesh position={[0, 2.78, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 2.6, 16]} />
            <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[-0.95, 1.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 2.74, 0.12]} />
            <meshStandardMaterial color={color || '#f1f5f9'} roughness={0.95} metalness={0.0} />
          </mesh>
          <mesh position={[0.95, 1.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 2.74, 0.12]} />
            <meshStandardMaterial color={color || '#f1f5f9'} roughness={0.95} metalness={0.0} />
          </mesh>
        </group>
      );

    case 'vase':
    default:
      return (
        <group>
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.24, 32]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.12, 0.16, 32]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.06, 0.03, 32]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
          <mesh position={[0, 0.52, 0]} rotation={[0.1, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.005, 0.008, 0.35, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>
      );
  }
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
    hdrPreset,
    environmentIntensity,
    environmentRotation,
    showBackground,
    pushHistory,
    undo,
    redo,
    saveToSupabase,
    loadFromSupabase,
    placedObjects,
  } = useEditorStore();

  const { scene } = useThree();
  const itemRefs = useRef<{ [id: string]: THREE.Group | null }>({});
  const uploadedModelRef = useRef<THREE.Object3D | null>(null);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);

  // Load saved metadata from Supabase on start
  useEffect(() => {
    if (projectId) {
      loadFromSupabase(projectId);
    }
  }, [projectId, loadFromSupabase]);

  // Keyboard Shortcuts: W, E, R, Ctrl+Z, Ctrl+Shift+Z, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        setTransformMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        setTransformMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        setTransformMode('scale');
      }

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

      if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTransformMode, undo, redo, setSelectedId]);

  // Auto-Save interval every 30 seconds
  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(() => {
      saveToSupabase(projectId, scene);
    }, 30000);
    return () => clearInterval(interval);
  }, [projectId, scene, saveToSupabase]);

  // Sync transform gizmo changes back to store
  const handleTransformChange = () => {
    if (!selectedId) return;
    const obj = itemRefs.current[selectedId] || (uploadedModelRef.current?.uuid === selectedId ? uploadedModelRef.current : null);
    if (obj) {
      const pos: [number, number, number] = [
        parseFloat(obj.position.x.toFixed(2)),
        parseFloat(obj.position.y.toFixed(2)),
        parseFloat(obj.position.z.toFixed(2)),
      ];
      const rot: [number, number, number] = [
        parseFloat(THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1)),
        parseFloat(THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1)),
        parseFloat(THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1)),
      ];
      const scl: [number, number, number] = [
        parseFloat(obj.scale.x.toFixed(2)),
        parseFloat(obj.scale.y.toFixed(2)),
        parseFloat(obj.scale.z.toFixed(2)),
      ];
      setSelectedTransform({ position: pos, rotation: rot, scale: scl });
    }
  };

  const handleTransformMouseUp = () => {
    setIsGizmoDragging(false);
    pushHistory('Transform Object');
  };

  const activeTarget = selectedId
    ? itemRefs.current[selectedId] || (uploadedModelRef.current?.uuid === selectedId ? uploadedModelRef.current : null)
    : null;

  return (
    <>
      <color attach="background" args={['#080c14']} />

      {/* Photorealistic Lighting & Shadows */}
      <ambientLight intensity={0.35} color="#f0f9ff" />
      <directionalLight
        position={[7, 12, 5]}
        intensity={2.4}
        castShadow
        shadow-bias={-0.0001}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-4, 3, -3]} intensity={0.9} color="#fef08a" />

      {/* Realistic HDR Environment */}
      <Suspense fallback={null}>
        <Environment
          preset={hdrPreset as any}
          background={showBackground}
          environmentIntensity={environmentIntensity}
          environmentRotation={[0, THREE.MathUtils.degToRad(environmentRotation), 0]}
        />
      </Suspense>

      {/* Architectural Room */}
      <Room width={7} depth={6} height={3.2} />

      {/* High-fidelity Contact Shadows on the floor */}
      <ContactShadows
        position={[0, 0.003, 0]}
        opacity={0.7}
        scale={14}
        blur={1.6}
        far={4}
        resolution={1024}
        color="#020617"
      />

      {/* Uploaded GLB Model if present */}
      {modelUrl && (
        <Suspense fallback={null}>
          <LoadedModel
            url={modelUrl}
            onSelect={(obj) => {
              uploadedModelRef.current = obj;
              setSelectedId(obj.uuid);
            }}
          />
        </Suspense>
      )}

      {/* Dynamic Placed Furniture Pieces */}
      <group>
        {placedObjects.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <group
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              position={item.position}
              rotation={[
                THREE.MathUtils.degToRad(item.rotation[0]),
                THREE.MathUtils.degToRad(item.rotation[1]),
                THREE.MathUtils.degToRad(item.rotation[2]),
              ]}
              scale={item.scale}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(item.id);
              }}
            >
              <FurnitureMesh item={item} />
              {isSelected && !isWalkthrough && (
                <mesh position={[0, 0.45, 0]}>
                  <boxGeometry args={[1.1, 0.95, 1.1]} />
                  <meshBasicMaterial wireframe color="#38bdf8" transparent opacity={0.3} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* TransformControls Gizmo */}
      {!isWalkthrough && activeTarget && (
        <TransformControls
          object={activeTarget}
          mode={transformMode}
          onObjectChange={handleTransformChange}
          onMouseDown={() => setIsGizmoDragging(true)}
          onMouseUp={handleTransformMouseUp}
        />
      )}

      {/* Floor Grid */}
      <Grid
        infiniteGrid
        fadeDistance={30}
        sectionColor="#334155"
        cellColor="#1e293b"
        position={[0, 0.001, 0]}
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
          makeDefault
          enabled={!isGizmoDragging}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.05}
          maxDistance={25}
          minDistance={1.2}
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
        camera={{ position: [0, 2.2, 5.2], fov: 55 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          alpha: true,
        }}
      >
        <SceneContent modelUrl={modelUrl} projectId={projectId} />
      </Canvas>
    </div>
  );
}
