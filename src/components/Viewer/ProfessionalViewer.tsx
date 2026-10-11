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
import { useViewerStore } from '@/store/viewerStore';
import {
  Layers,
  Camera,
  Sun,
  Maximize2,
  Sparkles,
  Sliders,
  Eye,
  Minimize2,
} from 'lucide-react';

interface ProfessionalViewerProps {
  url: string;
  hdrUrl?: string;
  projectName?: string;
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
        const isWall = name.includes('wall') || name.includes('ceiling') || name.includes('roof');

        // Cutaway wall handling
        if (wallMode === 'cutaway' && (name.includes('ceiling') || name.includes('roof'))) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
        }

        if (isGlass) {
          // Selective physical shader: glass with realistic transmission & IOR
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
          // Polished metal with environmental reflection
          mesh.material = new THREE.MeshStandardMaterial({
            metalness: 0.9,
            roughness: 0.15,
            color: '#d4af37',
          });
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else if (useBakedMaterials) {
          // Baked Lightmaps: unlit MeshBasicMaterial for 60FPS realism without compute cost
          const original = originalMaterials.current.get(mesh) as any;
          if (original?.map) {
            mesh.material = new THREE.MeshBasicMaterial({
              map: original.map,
            });
          }
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        } else {
          // Fallback standard material
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

// 3. Renderer Guard & Tone Mapping Controller
function RendererSetup() {
  const { gl } = useThree();
  const { setIsSoftwareRenderer, qualityPreset } = useViewerStore();

  useEffect(() => {
    // Detect software rasterizers (SwiftShader / LLVMpipe)
    const context = gl.getContext();
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const gpu = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      if (/swiftshader|llvmpipe/i.test(gpu)) {
        setIsSoftwareRenderer(true);
        gl.setPixelRatio(1);
      }
    }

    // Configure ACES Filmic Tone Mapping and sRGB output
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
    setHdrIntensity,
    isSoftwareRenderer,
  } = useViewerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] bg-neutral-950 overflow-hidden font-sans select-none rounded-2xl border border-white/10 shadow-2xl"
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 3, 6], fov: 45 }}
        dpr={isSoftwareRenderer || qualityPreset === 'low' ? 1 : [1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        <RendererSetup />

        {/* Camera Setup */}
        {cameraMode === 'orthographic' ? (
          <OrthographicCamera makeDefault position={[0, 10, 10]} zoom={60} />
        ) : (
          <PerspectiveCamera makeDefault position={[0, 2.5, 5.5]} fov={50} />
        )}

        <ambientLight intensity={0.4} />
        {qualityPreset !== 'low' && (
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
          />
        )}

        {/* HDR Environment for Reflections */}
        <Suspense fallback={null}>
          <Environment
            preset="apartment"
            environmentIntensity={hdrIntensity}
          />
        </Suspense>

        {/* Loaded GLB Model */}
        <Suspense
          fallback={
            <Html center>
              <div className="flex flex-col items-center gap-3 bg-neutral-900/90 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-md text-white shadow-xl">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">جاري تحميل المشهد المعماري...</span>
              </div>
            </Html>
          }
        >
          <ArchitecturalModel url={url} />
        </Suspense>

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

        <OrbitControls
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2 - 0.02}
          maxDistance={25}
          minDistance={1.2}
        />
      </Canvas>

      {/* Floating Modern HUD Control Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        {/* Project Badge */}
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-lg text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold">{projectName}</span>
          {useBakedMaterials && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Baked 3ds Max Lightmaps
            </span>
          )}
        </div>

        {/* Quality & Fullscreen Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-lg">
          {/* Baked Materials Toggle */}
          <button
            onClick={() => setUseBakedMaterials(!useBakedMaterials)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              useBakedMaterials
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Pre-Computed Baked Lightmaps"
          >
            <Sparkles size={13} />
            <span>Baked Light</span>
          </button>

          {/* Quality Presets */}
          {(['low', 'balanced', 'ultra'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQualityPreset(q)}
              className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
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
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl text-xs text-white">
        {/* Camera Mode: Perspective vs Ortho */}
        <button
          onClick={() => setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            cameraMode === 'orthographic' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-white/80'
          }`}
          title="Toggle 2D Floorplan (Orthographic) vs 3D Perspective"
        >
          <Camera size={14} />
          <span>{cameraMode === 'orthographic' ? '2D Floorplan' : '3D Perspective'}</span>
        </button>

        {/* Level Mode: Exploded / Stacked */}
        <button
          onClick={() => setLevelMode(levelMode === 'stacked' ? 'exploded' : 'stacked')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            levelMode === 'exploded' ? 'bg-emerald-600 text-white' : 'hover:bg-white/10 text-white/80'
          }`}
          title="Toggle Exploded View"
        >
          <Layers size={14} />
          <span>{levelMode === 'exploded' ? 'Stacked View' : 'Exploded View'}</span>
        </button>

        {/* Wall Mode: Cutaway / Full */}
        <button
          onClick={() => setWallMode(wallMode === 'full' ? 'cutaway' : 'full')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            wallMode === 'cutaway' ? 'bg-amber-600 text-white' : 'hover:bg-white/10 text-white/80'
          }`}
          title="Cutaway Ceiling & Roof"
        >
          <Eye size={14} />
          <span>{wallMode === 'cutaway' ? 'Full Model' : 'Cutaway'}</span>
        </button>

        {/* HDR Sun Intensity Slider */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
          <Sun size={13} className="text-yellow-400" />
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={hdrIntensity}
            onChange={(e) => setHdrIntensity(parseFloat(e.target.value))}
            className="w-20 accent-yellow-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
