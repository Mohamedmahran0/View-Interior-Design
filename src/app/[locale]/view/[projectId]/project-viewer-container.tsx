'use client';

import React, { useState } from 'react';
import ProfessionalViewer from '@/components/Viewer/ProfessionalViewer';
import PixelStreamPlayer from '@/components/Streaming/PixelStreamPlayer';
import SplatViewer from '@/components/Viewer/SplatViewer';
import { Sparkles, Globe, Monitor } from 'lucide-react';

interface ProjectViewerContainerProps {
  projectId: string;
  projectName: string;
  fileUrl: string;
  isGLB: boolean;
  streamingEnabled?: boolean;
}

export default function ProjectViewerContainer({
  projectId,
  projectName,
  fileUrl,
  isGLB,
  streamingEnabled = true,
}: ProjectViewerContainerProps) {
  const [viewMode, setViewMode] = useState<'stream' | 'web'>(streamingEnabled ? 'stream' : 'web');

  return (
    <div className="flex flex-col w-full h-full">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between pb-3 px-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <button
            onClick={() => setViewMode('stream')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
              viewMode === 'stream'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} />
            <span>UE5 Cloud Stream (Lumen + Nanite)</span>
          </button>

          <button
            onClick={() => setViewMode('web')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
              viewMode === 'web'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe size={14} />
            <span>Web 3D Viewer (Baked Lightmaps)</span>
          </button>
        </div>

        <span className="text-[11px] text-white/40 hidden sm:inline-block">
          {viewMode === 'stream' ? '⚡ 60 FPS RTX Cloud Stream' : '🌐 Instant Browser Rendering'}
        </span>
      </div>

      {/* Active Viewer */}
      <div className="w-full h-full min-h-[560px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative">
        {viewMode === 'stream' ? (
          <PixelStreamPlayer projectId={projectId} projectName={projectName} />
        ) : fileUrl ? (
          isGLB ? (
            <ProfessionalViewer url={fileUrl} projectName={projectName} />
          ) : (
            <SplatViewer url={fileUrl} />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 text-white/40">
            <Monitor size={48} className="mb-2 opacity-30" />
            <p className="text-xs">No 3D asset attached to this project.</p>
          </div>
        )}
      </div>
    </div>
  );
}
