'use client';

import { DoubleSide } from 'three';

interface RoomProps {
  width: number;
  depth: number;
  height: number;
}

export default function Room({ width, depth, height }: RoomProps) {
  return (
    <group position={[0, height / 2, 0]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#cbd5e1" side={DoubleSide} />
      </mesh>

      {/* Wall 1 (Back) */}
      <mesh position={[0, 0, -depth / 2]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>

      {/* Wall 2 (Left) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-width / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </group>
  );
}
