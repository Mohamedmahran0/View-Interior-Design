'use client';

import { useEffect, useRef, useState } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

interface SplatViewerProps {
  url: string; // URL to .splat or .ksplat file
}

export default function SplatViewer({ url }: SplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, -1, 0],
      initialCameraPosition: [0, 1, -5],
      initialCameraLookAt: [0, 0, 0],
      rootElement: containerRef.current,
      sharedMemoryForWorkers: false, // Compatibility for older browsers
    });

    viewer.addSplatScene(url, {
      showLoadingUI: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    })
    .then(() => {
      setLoading(false);
      viewer.start();
    })
    .catch((err: any) => {
      console.error('Error loading splat scene', err);
      setLoading(false);
    });

    return () => {
      viewer.dispose();
    };
  }, [url]);

  return (
    <div className="relative w-full h-full bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
            <p className="font-mono text-sm uppercase tracking-widest text-emerald-400">Loading Scene</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
