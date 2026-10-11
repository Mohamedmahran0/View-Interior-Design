'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  Environment,
  ContactShadows,
  useGLTF,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore, ViewPerspective, LightingPreset } from '@/store/viewerStore';
import {
  Layers,
  Camera,
  Sun,
  Maximize2,
  Sparkles,
  Eye,
  Minimize2,
  Compass,
  Sunset,
  Moon,
  Move,
  Home,
  Bed,
  Utensils,
  Maximize,
  DoorOpen,
} from 'lucide-react';
import Room from '@/components/Editor/Room';
import { FurnitureMesh } from '@/components/Editor/Scene3D';
import { DEFAULT_INITIAL_OBJECTS, PlacedItem } from '@/store/editorStore';

interface ProfessionalViewerProps {
  url?: string;
  hdrUrl?: string;
  projectName?: string;
  sceneMetadata?: Record<string, any>;
}

// 1. Texture Optimizer Guard
function optimizeTexture(texture: THREE.Texture, maxSize = 2048) {
  if (!texture || !texture.image) return;
  const img = texture.image as any;
  if ((img.width && img.width > maxSize) || (img.height && img.height > maxSize)) {
    try {
      const canvas = document.createElement('canvas');
      const aspect = (img.width || 1) / (img.height || 1);
      let w = maxSize;
      let h = maxSize;
      if (aspect > 1) {
        h = Math.round(maxSize / aspect);
      } else {
        w = Math.round(maxSize * aspect);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        texture.image = canvas;
        texture.needsUpdate = true;
      }
    } catch (e) {
      console.warn('Texture downscale skipped:', e);
    }
  }
}

// 2. Architectural Model Component with Baked Lightmaps & Selective Physical Shaders
function ArchitecturalModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const {
    levelMode,
    wallMode,
    useBakedMaterials,
    setSelectedMeshName,
  } = useViewerStore();

  const originalMaterials = useRef<Map<THREE.Mesh, any>>(new Map());

  // Store original materials on first load
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!originalMaterials.current.has(mesh)) {
          originalMaterials.current.set(mesh, mesh.material);
        }
      }
    });
  }, [scene]);

  // Apply Baked vs Selective Realtime Physical Materials
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        // Downscale oversized textures
        if ((mesh.material as any)?.map) {
          optimizeTexture((mesh.material as any).map, 2048);
        }

        const isGlass = name.includes('glass') || name.includes('window') || (mesh.material as any)?.transmission > 0;
        const isMetal = name.includes('metal') || name.includes('chrome') || name.includes('brass');

        // Cutaway wall handling
        if (wallMode === 'cutaway' && (name.includes('ceiling') || name.includes('roof'))) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
        }

        if (isGlass) {
          mesh.material = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.35,
            transmission: 0.9,
            ior: 1.5,
            roughness: 0.05,
            metalness: 0.1,
            color: '#e2f1ff',
          });
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else if (isMetal) {
          mesh.material = new THREE.MeshStandardMaterial({
            metalness: 0.9,
            roughness: 0.15,
            color: '#d4af37',
          });
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else if (useBakedMaterials) {
          const original = originalMaterials.current.get(mesh) as any;
          if (original?.map) {
            mesh.material = new THREE.MeshBasicMaterial({
              map: original.map,
            });
          }
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else {
          const orig = originalMaterials.current.get(mesh);
          if (orig) mesh.material = orig;
        }
      }
    });
  }, [scene, useBakedMaterials, wallMode]);

  // Exploded / Stacked Level Animation
  useFrame((_, delta) => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        const targetY = (levelMode === 'exploded' && (name.includes('ceiling') || name.includes('roof') || name.includes('upper'))) ? 2.5 : 0;
        mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 4, delta);
      }
    });
  });

  return (
    <primitive
      object={scene}
      onClick={(e: any) => {
        e.stopPropagation();
        setSelectedMeshName(e.object.name || 'Object');
      }}
    />
  );
}

// 3. Fallback High-End Villa Scene (rendered when no external GLB is uploaded, or when scene_metadata exists)
function FallbackInteriorScene({ sceneMetadata }: { sceneMetadata?: Record<string, any> }) {
  const objects: PlacedItem[] = (sceneMetadata?.objects && sceneMetadata.objects.length > 0)
    ? sceneMetadata.objects
    : DEFAULT_INITIAL_OBJECTS;

  return (
    <group>
      <Room width={14} depth={14} height={3.4} />
      {objects.map((item) => (
        <group
          key={item.id}
          position={item.position}
          rotation={item.rotation ? [
            THREE.MathUtils.degToRad(item.rotation[0] || 0),
            THREE.MathUtils.degToRad(item.rotation[1] || 0),
            THREE.MathUtils.degToRad(item.rotation[2] || 0),
          ] : [0, 0, 0]}
          scale={item.scale || [1, 1, 1]}
        >
          <FurnitureMesh item={item} />
        </group>
      ))}
    </group>
  );
}

// 4. First-Person Walkthrough Camera Controller with Smooth WASD + Joystick + Room Teleportation
function WalkthroughController({
  activeRoom,
  viewPerspective,
  virtualJoystick,
}: {
  activeRoom: string;
  viewPerspective: ViewPerspective;
  virtualJoystick: { x: number; y: number };
}) {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const targetPos = useRef<THREE.Vector3 | null>(null);

  // Room coordinates inside the villa
  const roomPositions: Record<string, [number, number, number]> = {
    living: [0, 1.65, 1.8],
    bedroom: [-3.2, 1.65, -2.2],
    kitchen: [3.2, 1.65, -1.2],
    terrace: [0, 1.65, -4.5],
    foyer: [0, 1.65, 4.0],
  };

  useEffect(() => {
    if (viewPerspective === 'walkthrough') {
      const pos = roomPositions[activeRoom] || [0, 1.65, 2.2];
      camera.position.set(pos[0], pos[1], pos[2]);
    }
  }, [viewPerspective, camera]);

  useEffect(() => {
    if (viewPerspective === 'walkthrough' && roomPositions[activeRoom]) {
      targetPos.current = new THREE.Vector3(...roomPositions[activeRoom]);
    }
  }, [activeRoom, viewPerspective]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (viewPerspective !== 'walkthrough') return;

    // Smooth room teleport interpolation
    if (targetPos.current) {
      camera.position.lerp(targetPos.current, Math.min(1, 4 * delta));
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        targetPos.current = null;
      }
    }

    const speed = 4.2 * delta;
    const forward = (keys.current['KeyW'] || keys.current['ArrowUp'] ? 1 : 0) -
                    (keys.current['KeyS'] || keys.current['ArrowDown'] ? 1 : 0) +
                    virtualJoystick.y;
    const side = (keys.current['KeyD'] || keys.current['ArrowRight'] ? 1 : 0) -
                 (keys.current['KeyA'] || keys.current['ArrowLeft'] ? 1 : 0) +
                 virtualJoystick.x;

    if (Math.abs(forward) > 0.01 || Math.abs(side) > 0.01) {
      const frontVector = new THREE.Vector3(0, 0, -forward);
      const sideVector = new THREE.Vector3(side, 0, 0);
      const dir = new THREE.Vector3();
      dir.subVectors(sideVector, frontVector).normalize().multiplyScalar(speed);
      dir.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
      camera.position.add(dir);
    }

    // Keep human eye level
    camera.position.y = 1.65;
  });

  return null;
}

// 5. Renderer Setup & Tone Mapping
function RendererSetup() {
  const { gl } = useThree();
  const { setIsSoftwareRenderer, qualityPreset } = useViewerStore();

  useEffect(() => {
    const context = gl.getContext();
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const gpu = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      if (/swiftshader|llvmpipe/i.test(gpu)) {
        setIsSoftwareRenderer(true);
        gl.setPixelRatio(1);
      }
    }

    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = qualityPreset === 'ultra' ? 1.2 : 1.1;
    gl.shadowMap.enabled = qualityPreset !== 'low';
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, qualityPreset, setIsSoftwareRenderer]);

  return null;
}

export default function ProfessionalViewer({
  url,
  hdrUrl,
  projectName = 'Architectural Scene',
  sceneMetadata,
}: ProfessionalViewerProps) {
  const {
    cameraMode,
    setCameraMode,
    levelMode,
    setLevelMode,
    wallMode,
    setWallMode,
    qualityPreset,
    setQualityPreset,
    useBakedMaterials,
    setUseBakedMaterials,
    hdrIntensity,
    isSoftwareRenderer,
    viewPerspective,
    setViewPerspective,
    lightingPreset,
    setLightingPreset,
    activeRoom,
    setActiveRoom,
  } = useViewerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [virtualJoystick, setVirtualJoystick] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const roomButtons = [
    { id: 'living', name: 'صالة المعيشة', enName: 'Living', icon: Home },
    { id: 'bedroom', name: 'غرفة النوم', enName: 'Master Bed', icon: Bed },
    { id: 'kitchen', name: 'المطبخ المودرن', enName: 'Kitchen', icon: Utensils },
    { id: 'terrace', name: 'التراس والإطلالة', enName: 'Terrace', icon: Maximize },
    { id: 'foyer', name: 'المدخل الرئيسي', enName: 'Foyer', icon: DoorOpen },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[560px] bg-neutral-950 overflow-hidden font-sans select-none rounded-[2rem] border border-white/10 shadow-2xl"
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.65, 2.5], fov: 50 }}
        dpr={isSoftwareRenderer || qualityPreset === 'low' ? 1 : [1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        <RendererSetup />

        {/* Dynamic Cameras */}
        {cameraMode === 'orthographic' ? (
          <OrthographicCamera makeDefault position={[0, 14, 0]} zoom={45} />
        ) : (
          <PerspectiveCamera makeDefault position={[0, 1.65, 2.5]} fov={50} />
        )}

        {/* Dynamic Lighting Presets */}
        {lightingPreset === 'day' && (
          <>
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[8, 14, 6]}
              intensity={2.0}
              color="#ffffff"
              castShadow={qualityPreset !== 'low'}
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
          </>
        )}

        {lightingPreset === 'golden' && (
          <>
            <ambientLight intensity={0.4} color="#ffe8d6" />
            <directionalLight
              position={[12, 4, 8]}
              intensity={1.8}
              color="#ffb366"
              castShadow={qualityPreset !== 'low'}
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0001}
            />
          </>
        )}

        {lightingPreset === 'night' && (
          <>
            <ambientLight intensity={0.15} color="#1e293b" />
            <pointLight position={[0, 2.8, 0]} intensity={1.8} color="#ffbe76" distance={10} castShadow />
            <pointLight position={[-3, 2.5, -2]} intensity={1.2} color="#f6e58d" distance={8} />
            <pointLight position={[3, 2.5, -2]} intensity={1.2} color="#f6e58d" distance={8} />
          </>
        )}

        {/* HDR Environment */}
        <Suspense fallback={null}>
          <Environment
            preset={lightingPreset === 'golden' ? 'sunset' : lightingPreset === 'night' ? 'night' : 'apartment'}
            environmentIntensity={hdrIntensity}
          />
        </Suspense>

        {/* Model or Parametric Architectural Interior Scene */}
        <Suspense
          fallback={
            <Html center>
              <div className="flex flex-col items-center gap-3 bg-neutral-900/90 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-md text-white shadow-xl">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">جاري تحضير المشهد ثلاثي الأبعاد...</span>
              </div>
            </Html>
          }
        >
          {url ? (
            <ArchitecturalModel url={url} />
          ) : (
            <FallbackInteriorScene sceneMetadata={sceneMetadata} />
          )}
        </Suspense>

        {/* Walkthrough or Orbit Controls */}
        {viewPerspective === 'walkthrough' ? (
          <WalkthroughController
            activeRoom={activeRoom}
            viewPerspective={viewPerspective}
            virtualJoystick={virtualJoystick}
          />
        ) : (
          <OrbitControls
            makeDefault
            minPolarAngle={cameraMode === 'orthographic' ? 0 : 0.1}
            maxPolarAngle={cameraMode === 'orthographic' ? 0.01 : Math.PI / 2 - 0.02}
            maxDistance={25}
            minDistance={1.2}
          />
        )}

        {/* Soft Contact Shadows */}
        {qualityPreset !== 'low' && (
          <ContactShadows
            position={[0, 0.002, 0]}
            opacity={0.65}
            scale={16}
            blur={1.8}
            far={4}
            resolution={1024}
            color="#050505"
          />
        )}
      </Canvas>

      {/* Floating Modern Header HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        {/* Project & Walkthrough Badge */}
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-2xl shadow-lg text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold">{projectName}</span>
          {viewPerspective === 'walkthrough' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              🚶‍♂️ تجوال حر 1.65m
            </span>
          )}
        </div>

        {/* Quality & Fullscreen Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-lg">
          {/* Baked Materials Toggle */}
          <button
            onClick={() => setUseBakedMaterials(!useBakedMaterials)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              useBakedMaterials
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Pre-Computed Baked Lightmaps"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">إضاءة 3ds Max</span>
          </button>

          {/* Quality Presets */}
          {(['low', 'balanced', 'ultra'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQualityPreset(q)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition cursor-pointer ${
                qualityPreset === q
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {q}
            </button>
          ))}

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Subtle Walkthrough Navigation Hint Overlay */}
      {viewPerspective === 'walkthrough' && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/80">
          <Move size={12} className="text-emerald-400" />
          <span>استخدم مفاتيح <b>W, A, S, D</b> أو الأسهم للتجوال بحرية في أرجاء الفيلا</span>
        </div>
      )}

      {/* Floating Room Teleport Quick Bar */}
      <div className="absolute top-18 right-4 pointer-events-auto z-20 flex flex-col gap-1.5 bg-neutral-900/85 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-xl">
        <span className="text-[10px] font-bold text-white/40 px-2 py-0.5 text-right">الانتقال السريع</span>
        {roomButtons.map((room) => {
          const Icon = room.icon;
          const isActive = activeRoom === room.id;
          return (
            <button
              key={room.id}
              onClick={() => {
                setActiveRoom(room.id);
                if (viewPerspective !== 'walkthrough') {
                  setViewPerspective('walkthrough');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={13} />
              <span>{room.name}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-20 flex flex-wrap items-center justify-between gap-3">
        {/* Perspective Mode Switcher */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl text-xs text-white">
          <button
            onClick={() => setViewPerspective('walkthrough')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              viewPerspective === 'walkthrough'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass size={14} />
            <span>تجوال افتراضي 🚶‍♂️</span>
          </button>

          <button
            onClick={() => setViewPerspective('orbit')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              viewPerspective === 'orbit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera size={14} />
            <span>منظور 3D 🏢</span>
          </button>

          <button
            onClick={() => setViewPerspective('floorplan')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              viewPerspective === 'floorplan'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={14} />
            <span>مخطط أفقي 📐</span>
          </button>
        </div>

        {/* Lighting Atmosphere Presets */}
        <div className="pointer-events-auto flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl text-xs text-white">
          <button
            onClick={() => setLightingPreset('day')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              lightingPreset === 'day' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun size={13} className="text-amber-400" />
            <span>نهار ☀️</span>
          </button>

          <button
            onClick={() => setLightingPreset('golden')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              lightingPreset === 'golden' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sunset size={13} className="text-orange-400" />
            <span>غروب 🌇</span>
          </button>

          <button
            onClick={() => setLightingPreset('night')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              lightingPreset === 'night' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Moon size={13} className="text-indigo-400" />
            <span>ليلي فاخر 🌙</span>
          </button>
        </div>
      </div>
    </div>
  );
}
