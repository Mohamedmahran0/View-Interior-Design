'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, MousePointer2, Move, RotateCw, Scaling, Image as ImageIcon, Eye, Box, Layers, Monitor, Hexagon } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEditorStore } from '@/store/editorStore';

export default function EditorUI() {
  const t = useTranslations('Editor');
  const { 
    setIsWalkthrough, setTransformMode, transformMode, 
    editorMode, setEditorMode, selectedMaterial, updateMaterial,
    environmentIntensity, setEnvironmentIntensity 
  } = useEditorStore();

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col font-sans">
      {/* Top Navbar */}
      <div className="h-14 border-b border-white/10 bg-black/80 backdrop-blur-md flex items-center justify-between px-4 pointer-events-auto shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-1.5 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div className="font-semibold text-sm tracking-wide">OMAR BARGOUTHI STUDIO</div>
        </div>
        
        {/* Center Toolbar (Modes) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
          <ToolbarBtn icon={<MousePointer2 size={16} />} active={transformMode === 'translate'} onClick={() => setTransformMode('translate')} label="Select" />
          <ToolbarBtn icon={<Move size={16} />} active={transformMode === 'translate'} onClick={() => setTransformMode('translate')} label="Move (G)" />
          <ToolbarBtn icon={<RotateCw size={16} />} active={transformMode === 'rotate'} onClick={() => setTransformMode('rotate')} label="Rotate (R)" />
          <ToolbarBtn icon={<Scaling size={16} />} active={transformMode === 'scale'} onClick={() => setTransformMode('scale')} label="Scale (S)" />
          <div className="w-px h-4 bg-white/10 mx-2" />
          <ToolbarBtn icon={<Hexagon size={16} />} active={editorMode === 'object'} onClick={() => setEditorMode('object')} label="Object Mode" />
          <ToolbarBtn icon={<Layers size={16} />} active={editorMode === 'edit'} onClick={() => setEditorMode('edit')} label="Edit Mode" />
        </div>

        <div className="flex items-center gap-3">
          <button 
            id="lock-button"
            onClick={() => setIsWalkthrough(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition text-xs font-bold border border-blue-500/30"
          >
            <Eye size={14} /> Walkthrough
          </button>
          
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-md text-white transition text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Save size={14} /> Export GLB
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Library */}
        <div className="w-64 border-r border-white/10 bg-black/80 backdrop-blur-md flex flex-col pointer-events-auto">
          <div className="p-3 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-white/50">Library</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <LibraryCategory title="Models" items={['Sofa Neo-Classical', 'Coffee Table', 'Luxury Lamp']} />
            <LibraryCategory title="Materials" items={['Marble Gold', 'Velvet Dark', 'Wood Matte']} />
            <LibraryCategory title="Environments" items={['Studio Lighting', 'Sunset HDR', 'Night City']} />
          </div>
        </div>

        {/* Center: Viewport */}
        <div className="flex-1" />

        {/* Right Column: Inspector */}
        <div className="w-80 border-l border-white/10 bg-black/80 backdrop-blur-md flex flex-col pointer-events-auto">
          <div className="p-3 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-white/50">Inspector</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* PBR Material Editor */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white/80">PBR Material</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">Base Color</span>
                  <input type="color" value={selectedMaterial.color} onChange={(e) => updateMaterial('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-white/50">Roughness</span><span>{selectedMaterial.roughness}</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={selectedMaterial.roughness} onChange={(e) => updateMaterial('roughness', parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-white/50">Metalness</span><span>{selectedMaterial.metalness}</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={selectedMaterial.metalness} onChange={(e) => updateMaterial('metalness', parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
              </div>
            </div>

            {/* Lighting Editor */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h4 className="text-sm font-bold text-white/80">Environment Lighting</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-white/50">Intensity</span><span>{environmentIntensity}x</span></div>
                <input type="range" min="0" max="5" step="0.1" value={environmentIntensity} onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))} className="w-full accent-blue-500" />
              </div>
            </div>

            {/* AI Generator Box */}
            <div className="pt-4 border-t border-white/10">
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <h4 className="text-xs font-bold text-indigo-400 mb-2">AI Design Concept</h4>
                <textarea className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-xs text-white resize-none h-16 outline-none focus:border-indigo-500" placeholder="e.g. Modern minimalist living room..." />
                <button className="w-full mt-2 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 rounded text-xs font-bold transition text-white">Generate</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-md transition ${active ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
    >
      {icon}
    </button>
  );
}

function LibraryCategory({ title, items }: { title: string, items: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-bold text-white/70 mb-2 flex items-center gap-2"><Box size={12} /> {title}</h5>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item} className="text-xs text-white/40 hover:text-white/90 hover:bg-white/5 px-2 py-1.5 rounded cursor-pointer transition">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
