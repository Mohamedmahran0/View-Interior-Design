'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Save,
  MousePointer2,
  Move,
  RotateCw,
  Scaling,
  Eye,
  Undo2,
  Redo2,
  Sun,
  Download,
  Share2,
  Sparkles,
  Layers,
  Settings2,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEditorStore, HdrPreset, TransformMode } from '@/store/editorStore';
import { GLTFExporter } from 'three-stdlib';

interface EditorUIProps {
  projectId?: string;
  projectName?: string;
}

const HDR_OPTIONS: { id: HdrPreset; label: string }[] = [
  { id: 'studio', label: 'Studio Soft' },
  { id: 'apartment', label: 'Apartment Interior' },
  { id: 'city', label: 'Modern City' },
  { id: 'sunset', label: 'Golden Sunset' },
  { id: 'dawn', label: 'Morning Dawn' },
  { id: 'warehouse', label: 'Industrial Warehouse' },
  { id: 'night', label: 'Night City' },
];

const MATERIAL_PRESETS = [
  { name: 'Walnut Wood', color: '#5c3a21', roughness: 0.6, metalness: 0.05 },
  { name: 'Brushed Brass', color: '#d4af37', roughness: 0.25, metalness: 0.9 },
  { name: 'White Marble', color: '#f3f4f6', roughness: 0.15, metalness: 0.1 },
  { name: 'Charcoal Fabric', color: '#27272a', roughness: 0.85, metalness: 0.0 },
  { name: 'Smoked Glass', color: '#18181b', roughness: 0.05, metalness: 0.1 },
  { name: 'Emerald Velvet', color: '#065f46', roughness: 0.7, metalness: 0.1 },
];

export default function EditorUI({ projectId, projectName = 'Untitled Project' }: EditorUIProps) {
  const t = useTranslations('Editor');
  const {
    selectedId,
    transformMode,
    setTransformMode,
    selectedTransform,
    setSelectedTransform,
    selectedMaterial,
    updateMaterial,
    hdrPreset,
    setHdrPreset,
    environmentIntensity,
    setEnvironmentIntensity,
    environmentRotation,
    setEnvironmentRotation,
    showBackground,
    setShowBackground,
    isWalkthrough,
    setIsWalkthrough,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToSupabase,
    isSaving,
    saveStatus,
    lastSavedAt,
    errorMessage,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'transform' | 'material' | 'environment'>('transform');
  const [copiedShare, setCopiedShare] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleManualSave = async () => {
    if (!projectId) return;
    await saveToSupabase(projectId);
  };

  const handleExportGLB = () => {
    setIsExporting(true);
    const container = document.getElementById('canvas-container');
    const canvas = container?.querySelector('canvas');
    if (!canvas) {
      setIsExporting(false);
      return;
    }

    try {
      // Find scene in global three context or export standard GLB container
      const exporter = new GLTFExporter();
      const scene = (canvas as any).__r3f?.root?.current?.scene;

      if (scene) {
        exporter.parse(
          scene,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_export.glb`;
            link.click();
            setIsExporting(false);
          },
          (error) => {
            console.error('An error happened during GLB export:', error);
            setIsExporting(false);
          },
          { binary: true }
        );
      } else {
        // Fallback notification
        alert('Exporting current view state. Ensure model is fully loaded in viewport.');
        setIsExporting(false);
      }
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const handleShareClick = () => {
    const url = `${window.location.origin}/view/${projectId || ''}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="h-14 border-b border-white/10 bg-black/85 backdrop-blur-md flex items-center justify-between px-4 pointer-events-auto shrink-0 shadow-lg">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white"
            title="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-wide text-white">{projectName}</span>
            {/* Save Status Badge (Prompt 5) */}
            <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {isSaving ? (
                <>
                  <Loader2 size={12} className="animate-spin text-emerald-400" />
                  <span className="text-white/60">Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-white/60">Saved {lastSavedAt ? `@ ${lastSavedAt}` : ''}</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle size={12} className="text-red-400" />
                  <span className="text-red-400">Error saving</span>
                </>
              ) : (
                <span className="text-white/40">Auto-save on</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Transform Tools & History (Prompt 2) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTransformMode('translate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transformMode === 'translate'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Translate Mode (W)"
          >
            <Move size={14} /> Move <span className="opacity-50 text-[10px]">(W)</span>
          </button>
          <button
            onClick={() => setTransformMode('rotate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transformMode === 'rotate'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Rotate Mode (E)"
          >
            <RotateCw size={14} /> Rotate <span className="opacity-50 text-[10px]">(E)</span>
          </button>
          <button
            onClick={() => setTransformMode('scale')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              transformMode === 'scale'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Scale Mode (R)"
          >
            <Scaling size={14} /> Scale <span className="opacity-50 text-[10px]">(R)</span>
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* First Person Walkthrough */}
          <button
            id="walkthrough-btn"
            onClick={() => setIsWalkthrough(!isWalkthrough)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isWalkthrough
                ? 'bg-blue-500 text-white border-blue-400'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            <Eye size={14} /> {isWalkthrough ? 'Exit Walkthrough' : 'Walkthrough'}
          </button>

          {/* Share */}
          {projectId && (
            <button
              onClick={handleShareClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition"
              title="Copy public viewer link"
            >
              <Share2 size={14} /> {copiedShare ? 'Copied!' : 'Share'}
            </button>
          )}

          {/* Export GLB */}
          <button
            onClick={handleExportGLB}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export GLB
          </button>

          {/* Manual Save */}
          {projectId && (
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition"
            >
              <Save size={14} /> Save
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Material & Preset Palette */}
        <aside className="w-64 border-r border-white/10 bg-black/80 backdrop-blur-md flex flex-col pointer-events-auto">
          <div className="p-3 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-white/50 flex items-center gap-2">
            <Palette size={14} className="text-emerald-400" /> Material Presets
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {MATERIAL_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  updateMaterial('color', preset.color);
                  updateMaterial('roughness', preset.roughness);
                  updateMaterial('metalness', preset.metalness);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition group"
              >
                <div
                  className="w-6 h-6 rounded-full border border-white/20 shrink-0 shadow-inner"
                  style={{ backgroundColor: preset.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/90 group-hover:text-emerald-400 transition truncate">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-white/40">
                    Rough: {preset.roughness} | Metal: {preset.metalness}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts Helper */}
          <div className="p-3 border-t border-white/10 bg-white/[0.02] text-[11px] text-white/50 space-y-1">
            <div className="font-semibold text-white/70 mb-1">Shortcuts:</div>
            <div className="flex justify-between"><span>Translate</span><kbd className="text-emerald-400 font-mono">W</kbd></div>
            <div className="flex justify-between"><span>Rotate</span><kbd className="text-emerald-400 font-mono">E</kbd></div>
            <div className="flex justify-between"><span>Scale</span><kbd className="text-emerald-400 font-mono">R</kbd></div>
            <div className="flex justify-between"><span>Undo</span><kbd className="text-emerald-400 font-mono">Ctrl+Z</kbd></div>
            <div className="flex justify-between"><span>Redo</span><kbd className="text-emerald-400 font-mono">Ctrl+Shift+Z</kbd></div>
            <div className="flex justify-between"><span>Deselect</span><kbd className="text-emerald-400 font-mono">Esc</kbd></div>
          </div>
        </aside>

        {/* Viewport Center */}
        <div className="flex-1" />

        {/* Right Side: Inspector Panel (Prompt 2 Properties + Prompt 4 HDR) */}
        <aside className="w-80 border-l border-white/10 bg-black/80 backdrop-blur-md flex flex-col pointer-events-auto">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('transform')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'transform'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Move size={14} /> Transform
            </button>
            <button
              onClick={() => setActiveTab('material')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'material'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Palette size={14} /> Material
            </button>
            <button
              onClick={() => setActiveTab('environment')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'environment'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Sun size={14} /> HDR & Light
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 1. TRANSFORM TAB (Prompt 2: Position, Rotation, Scale) */}
            {activeTab === 'transform' && (
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">Object Transform</div>

                {/* Position */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">Position (X, Y, Z)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={axis} className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-emerald-400 mr-1.5">{axis}</span>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedTransform.position[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = [...selectedTransform.position] as [number, number, number];
                            next[i] = val;
                            setSelectedTransform({ position: next });
                          }}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">Rotation (Deg)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={axis} className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-blue-400 mr-1.5">{axis}</span>
                        <input
                          type="number"
                          step="5"
                          value={selectedTransform.rotation[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const next = [...selectedTransform.rotation] as [number, number, number];
                            next[i] = val;
                            setSelectedTransform({ rotation: next });
                          }}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scale */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">Scale</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'Y', 'Z'].map((axis, i) => (
                      <div key={axis} className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-yellow-400 mr-1.5">{axis}</span>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedTransform.scale[i]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            const next = [...selectedTransform.scale] as [number, number, number];
                            next[i] = val;
                            setSelectedTransform({ scale: next });
                          }}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. MATERIAL TAB (PBR Materials) */}
            {activeTab === 'material' && (
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">PBR Material Properties</div>

                {/* Base Color */}
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-xs font-medium text-white/80">Base Color</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/50">{selectedMaterial.color}</span>
                    <input
                      type="color"
                      value={selectedMaterial.color}
                      onChange={(e) => updateMaterial('color', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Roughness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Roughness</span>
                    <span className="font-mono text-white/90">{selectedMaterial.roughness}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedMaterial.roughness}
                    onChange={(e) => updateMaterial('roughness', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Metalness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Metalness</span>
                    <span className="font-mono text-white/90">{selectedMaterial.metalness}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedMaterial.metalness}
                    onChange={(e) => updateMaterial('metalness', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. ENVIRONMENT & HDR LIGHTING TAB (Prompt 4) */}
            {activeTab === 'environment' && (
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">HDR & Photorealistic Lighting</div>

                {/* HDR Preset Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">HDR Environment Map</label>
                  <select
                    value={hdrPreset}
                    onChange={(e) => setHdrPreset(e.target.value as HdrPreset)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {HDR_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-neutral-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Environment Intensity Slider (0 to 5) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Light Intensity</span>
                    <span className="font-mono text-white/90">{environmentIntensity}x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={environmentIntensity}
                    onChange={(e) => setEnvironmentIntensity(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Environment Rotation Slider (0 to 360 deg) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Environment Rotation</span>
                    <span className="font-mono text-white/90">{environmentRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={environmentRotation}
                    onChange={(e) => setEnvironmentRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Show/Hide HDR Background Toggle */}
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-xs font-medium text-white/80">Render HDR Background</span>
                  <input
                    type="checkbox"
                    checked={showBackground}
                    onChange={(e) => setShowBackground(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
