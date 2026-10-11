'use client';

import { DoubleSide } from 'three';

interface RoomProps {
  width: number;
  depth: number;
  height: number;
}

export default function Room({ width, depth, height }: RoomProps) {
  const halfH = height / 2;
  const halfW = width / 2;
  const halfD = depth / 2;

  return (
    <group position={[0, halfH, 0]}>
      {/* Floor: Realistic Natural European Oak Hardwood Parquet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -halfH, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#8c6a4e"
          roughness={0.28}
          metalness={0.08}
          side={DoubleSide}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, halfH, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>

      {/* Wall 1 (Back Wall - Architectural Plaster) */}
      <mesh position={[0, 0, -halfD]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#ebe7df" roughness={0.88} />
      </mesh>

      {/* Wall 2 (Left Wall) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, 0, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#f1ede5" roughness={0.85} />
      </mesh>

      {/* Baseboards (Skirting Boards) - Perimeter architectural molding */}
      {/* Back Baseboard */}
      <mesh position={[0, -halfH + 0.08, -halfD + 0.015]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.16, 0.03]} />
        <meshStandardMaterial color="#ded9d0" roughness={0.7} />
      </mesh>
      {/* Left Baseboard */}
      <mesh position={[-halfW + 0.015, -halfH + 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.03, 0.16, depth]} />
        <meshStandardMaterial color="#ded9d0" roughness={0.7} />
      </mesh>

      {/* Wall 3 (Right: Modern Floor-to-Ceiling Panoramic Glass Window & Frame) */}
      <group position={[halfW, 0, 0]}>
        {/* Window Glass Pane */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[depth * 0.85, height * 0.9]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.35}
            roughness={0.05}
            metalness={0.1}
            transmission={0.9}
            ior={1.5}
            color="#e2f1ff"
          />
        </mesh>
        {/* Window Outer Frame (Black Anodized Aluminum) */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.08, height * 0.92, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, -depth * 0.42]} castShadow>
          <boxGeometry args={[0.08, height * 0.92, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, depth * 0.42]} castShadow>
          <boxGeometry args={[0.08, height * 0.92, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
