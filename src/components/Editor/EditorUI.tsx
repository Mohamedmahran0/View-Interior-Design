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
  X,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEditorStore, HdrPreset, TransformMode } from '@/store/editorStore';
import { GLTFExporter } from 'three-stdlib';
import { createClient } from '@/utils/supabase/client';

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
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent('/editor')}`,
      },
    });
    if (oauthError) {
      alert(oauthError.message);
      setIsGoogleLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!projectId) {
      setShowGuestModal(true);
      return;
    }
    await saveToSupabase(projectId);
  };

  const handleExportGLB = () => {
    if (!projectId) {
      setShowGuestModal(true);
      return;
    }
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
      {/* Guest Mode Demo Banner */}
      {!projectId && (
        <div className="bg-gradient-to-r from-emerald-950/95 via-neutral-900/95 to-blue-950/95 border-b border-emerald-500/30 px-4 py-2 flex flex-wrap items-center justify-between text-xs backdrop-blur-md pointer-events-auto shrink-0 shadow-md gap-2">
          <div className="flex items-center gap-2.5 text-white/90">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-xs sm:text-sm">
              🎯 <strong>{t('guestBanner')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuestModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-sm cursor-pointer"
            >
              <Sparkles size={13} />
              {t('guestAction')}
            </button>
            <Link
              href="/login?redirect=/editor"
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition font-medium"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      )}

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

          {/* Action button: Save or Guest Subscribe */}
          {!projectId ? (
            <button
              onClick={() => setShowGuestModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/25 transition cursor-pointer"
            >
              <Sparkles size={14} /> {t('guestAction')}
            </button>
          ) : (
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
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

      {/* Guest Mode Subscription Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-neutral-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white p-2 rounded-full transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              <Sparkles size={28} />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {t('guestModalTitle')}
            </h3>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              {t('guestModalDesc')}
            </p>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer mb-3"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isGoogleLoading ? 'جاري التحويل إلى Google...' : t('guestModalGoogle')}</span>
            </button>

            {/* Email Sign Up Option */}
            <Link
              href="/signup?redirect=/editor"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition border border-white/10 text-sm mb-4"
            >
              {t('guestModalEmail')}
            </Link>

            <button
              onClick={() => setShowGuestModal(false)}
              className="text-xs text-white/40 hover:text-white/70 transition cursor-pointer"
            >
              {t('guestModalContinue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
