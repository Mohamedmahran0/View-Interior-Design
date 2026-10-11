'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Save,
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
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Trash2,
  Copy,
  Armchair,
  Check,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEditorStore, HdrPreset, FurnitureType } from '@/store/editorStore';
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

const CATALOG_ITEMS: { type: FurnitureType; nameAr: string; nameEn: string; icon: string; category: string }[] = [
  { type: 'sofa', nameAr: 'كنبة مودرن 3 مقاعد', nameEn: 'Modern Modular Sofa', icon: '🛋️', category: 'جلوس' },
  { type: 'table', nameAr: 'طاولة قهوة رخام', nameEn: 'Marble Coffee Table', icon: '☕', category: 'طاولات' },
  { type: 'chair', nameAr: 'كرسي استرخاء مخملي', nameEn: 'Velvet Lounge Chair', icon: '🪑', category: 'جلوس' },
  { type: 'lamp', nameAr: 'مصباح أرضي نحاسي', nameEn: 'Brass Floor Lamp', icon: '💡', category: 'إضاءة' },
  { type: 'plant', nameAr: 'نبات زينة مونستيرا', nameEn: 'Monstera Palm Plant', icon: '🌿', category: 'ديكور' },
  { type: 'rug', nameAr: 'سجادة صوف هندسية', nameEn: 'Designer Wool Rug', icon: '🧶', category: 'أرضيات' },
  { type: 'cabinet', nameAr: 'طاولة تلفاز عصرية', nameEn: 'Media Credenza', icon: '🗄️', category: 'تخزين' },
  { type: 'vase', nameAr: 'فازة سيراميك فنية', nameEn: 'Ceramic Art Vase', icon: '🏺', category: 'إكسسوارات' },
];

export default function EditorUI({ projectId, projectName = 'Untitled Project' }: EditorUIProps) {
  const t = useTranslations('Editor');
  const {
    selectedId,
    setSelectedId,
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
    placedObjects,
    addPlacedObject,
    removePlacedObject,
    duplicatePlacedObject,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'catalog' | 'transform' | 'material' | 'environment'>('catalog');
  const [copiedShare, setCopiedShare] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<'free' | 'pro' | 'studio'>('pro');
  const supabase = createClient();

  const handleGoogleSignIn = async (plan: 'free' | 'pro' | 'studio' = 'free') => {
    setIsGoogleLoading(true);
    const origin = window.location.origin;
    const redirectUrl = plan === 'free' ? '/editor' : `/pricing?plan=${plan}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`,
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

  const selectedItem = placedObjects.find((item) => item.id === selectedId);

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
              ✨ <strong>{t('guestBanner')}</strong>
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

        {/* Center: Transform Tools & History */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setTransformMode('translate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
              isWalkthrough
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            title="First-Person Walkthrough (WASD to walk)"
          >
            <Eye size={14} />
            <span>Walkthrough</span>
          </button>

          {/* Export GLB */}
          <button
            onClick={handleExportGLB}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
            title="Export 3D GLB Model"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Export GLB</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
            title="Share Scene Link"
          >
            <Share2 size={14} />
            <span>{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Save */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{projectId ? 'Save' : 'حفظ واشتراك'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex justify-end overflow-hidden pointer-events-none p-4">
        {/* Right Sidebar Control Panel */}
        <aside className="w-80 md:w-96 rounded-2xl border border-white/10 bg-neutral-950/85 backdrop-blur-xl flex flex-col pointer-events-auto shadow-2xl overflow-hidden">
          {/* Tabs Navigation (4 tabs) */}
          <div className="flex border-b border-white/10 bg-black/40 text-xs">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Armchair size={14} /> الأثاث
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'transform'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Move size={14} /> تحريك
            </button>
            <button
              onClick={() => setActiveTab('material')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'material'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Palette size={14} /> الخامات
            </button>
            <button
              onClick={() => setActiveTab('environment')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'environment'
                  ? 'border-b-2 border-emerald-400 text-emerald-400 bg-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Sun size={14} /> الإضاءة
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 1. CATALOG TAB: ADD FURNITURE ITEMS */}
            {activeTab === 'catalog' && (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                    كتالوج الأثاث والديكور
                  </div>
                  <p className="text-[11px] text-white/60">
                    انقر على أي قطعة لإضافتها فوراً إلى الغرفة ثلاثية الأبعاد.
                  </p>
                </div>

                {/* Grid of Addable Items */}
                <div className="grid grid-cols-2 gap-2.5">
                  {CATALOG_ITEMS.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => addPlacedObject(item.type)}
                      className="group relative p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 flex flex-col items-center text-center transition cursor-pointer text-white shadow-sm hover:shadow-md"
                    >
                      <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </span>
                      <span className="text-xs font-semibold text-white/90 line-clamp-1">
                        {item.nameAr}
                      </span>
                      <span className="text-[10px] text-white/40 mt-0.5">
                        {item.category}
                      </span>
                      <div className="mt-2 w-full py-1 rounded bg-emerald-500/20 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-white text-[10px] font-bold flex items-center justify-center gap-1 transition">
                        <Plus size={11} /> {t('catalogAdd')}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Placed Objects In Scene List */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                      قطع المشهد ({placedObjects.length})
                    </span>
                    <span className="text-[10px] text-white/40">انقر للتحديد</span>
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {placedObjects.map((item) => {
                      const isSel = item.id === selectedId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer border ${
                            isSel
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-medium truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicatePlacedObject(item.id);
                              }}
                              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition"
                              title="تكرار القطعة"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePlacedObject(item.id);
                              }}
                              className="p-1 hover:bg-red-500/20 rounded text-white/60 hover:text-red-400 transition"
                              title="حذف القطعة"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. TRANSFORM TAB */}
            {activeTab === 'transform' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50">تحريك وتعديل القياسات</div>
                  {selectedItem && (
                    <span className="text-[11px] text-emerald-400 font-medium truncate max-w-[120px]">
                      {selectedItem.name}
                    </span>
                  )}
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">الموقع (Position X, Y, Z)</span>
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
                  <span className="text-xs font-semibold text-white/70">الدوران (Rotation بالدرجات)</span>
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
                  <span className="text-xs font-semibold text-white/70">المقياس (Scale)</span>
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

                {selectedId && (
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => duplicatePlacedObject(selectedId)}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy size={13} /> تكرار العنصر
                    </button>
                    <button
                      onClick={() => removePlacedObject(selectedId)}
                      className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 size={13} /> حذف العنصر
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. MATERIAL TAB */}
            {activeTab === 'material' && (
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">خصائص خامات PBR الواقعية</div>

                {/* Material Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">قوالب الخامات الجاهزة</span>
                  <div className="grid grid-cols-2 gap-2">
                    {MATERIAL_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          updateMaterial('color', preset.color);
                          updateMaterial('roughness', preset.roughness);
                          updateMaterial('metalness', preset.metalness);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-left cursor-pointer"
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="text-xs font-medium text-white/80">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Color Picker */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white/70">اللون الأساسي (Base Color)</span>
                  <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
                    <input
                      type="color"
                      value={selectedMaterial.color}
                      onChange={(e) => updateMaterial('color', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={selectedMaterial.color}
                      onChange={(e) => updateMaterial('color', e.target.value)}
                      className="bg-transparent font-mono text-xs text-white focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Roughness */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">الخشونة (Roughness)</span>
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
                    <span className="text-white/60">المعدنية (Metalness)</span>
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

            {/* 4. ENVIRONMENT & HDR LIGHTING TAB */}
            {activeTab === 'environment' && (
              <div className="space-y-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">إضاءة HDR والبيئة الواقعية</div>

                {/* HDR Preset Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">بيئة الإضاءة (HDR Environment)</label>
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

                {/* Environment Intensity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">شدة الإضاءة (Light Intensity)</span>
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

                {/* Environment Rotation Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">دوران زاوية الإضاءة (Rotation)</span>
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
                  <span className="text-xs font-medium text-white/80">عرض خلفية HDR</span>
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

      {/* Guest Mode High-Converting Plan Selection Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-3xl bg-neutral-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute -top-24 -left-24 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white p-2 rounded-full transition cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles size={14} /> خطط المشتركين ومزامنة السحابة
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {t('guestModalTitle')}
            </h3>
            <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto mb-6">
              {t('guestModalDesc')}
            </p>

            {/* 3 Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-left">
              {/* Plan 1: Free Starter */}
              <div
                onClick={() => setSelectedPlanTier('free')}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanTier === 'free'
                    ? 'bg-neutral-900 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-neutral-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-white mb-1">الخطة المجانية</div>
                  <div className="text-2xl font-black text-white mb-2">$0 <span className="text-xs font-normal text-white/50">/ للأبد</span></div>
                  <p className="text-[11px] text-white/60 mb-3">ابدأ بتجربة المنصة مع الميزات الأساسية.</p>
                  <ul className="text-xs text-white/70 space-y-2 mb-4">
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> 3 مشاريع تصميم</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> محرر 3D كامل</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> تصدير GLB قياسي</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGoogleSignIn('free')}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  تفعيل مجاناً عبر Google
                </button>
              </div>

              {/* Plan 2: Pro (Featured) */}
              <div
                onClick={() => setSelectedPlanTier('pro')}
                className={`relative p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanTier === 'pro'
                    ? 'bg-gradient-to-b from-neutral-900 to-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-neutral-900/60 border-white/10 hover:border-emerald-500/30'
                }`}
              >
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Crown size={11} /> الأكثر طلباً
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-1">خطة Pro الاحترافية</div>
                  <div className="text-2xl font-black text-white mb-2">$49 <span className="text-xs font-normal text-white/50">/ شهرياً</span></div>
                  <p className="text-[11px] text-white/60 mb-3">للمهندسين والمصممين الداخليين المستقلين.</p>
                  <ul className="text-xs text-white/80 space-y-2 mb-4">
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> مشاريع غير محدودة</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> تصدير 4K GLB واقعي</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> إضافة 3ds Max للتصدير</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400 shrink-0" /> إضاءة سينمائية HDR كاملة</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGoogleSignIn('pro')}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  اشتراك Pro عبر Google
                </button>
              </div>

              {/* Plan 3: Studio */}
              <div
                onClick={() => setSelectedPlanTier('studio')}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedPlanTier === 'studio'
                    ? 'bg-neutral-900 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-neutral-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-white mb-1">خطة Studio للشركات</div>
                  <div className="text-2xl font-black text-white mb-2">$99 <span className="text-xs font-normal text-white/50">/ شهرياً</span></div>
                  <p className="text-[11px] text-white/60 mb-3">للشركات والمكاتب الهندسية الكبرى.</p>
                  <ul className="text-xs text-white/70 space-y-2 mb-4">
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-blue-400 shrink-0" /> جميع مزايا Pro</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-blue-400 shrink-0" /> تعاون فوري لفرق العمل</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-blue-400 shrink-0" /> ريندر سحابي بالذكاء الاصطناعي</li>
                    <li className="flex items-center gap-1.5"><Check size={13} className="text-blue-400 shrink-0" /> دعم ذو أولوية 24/7</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGoogleSignIn('studio')}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  اشتراك Studio عبر Google
                </button>
              </div>
            </div>

            {/* Direct One-Click Google Authentication Bar */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-white/80 text-xs text-right">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>تسجيل آمن وسريع عبر حسابك في Google بدون كلمات مرور</span>
              </div>
              <button
                onClick={() => handleGoogleSignIn(selectedPlanTier)}
                disabled={isGoogleLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-xs flex items-center justify-center gap-2.5 transition shadow cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isGoogleLoading ? 'جاري التحويل...' : 'المتابعة بحساب Google'}</span>
              </button>
            </div>

            {/* Footer options */}
            <div className="flex items-center justify-center gap-4 text-xs text-white/50">
              <Link href="/signup?redirect=/editor" className="hover:text-white transition">
                {t('guestModalEmail')}
              </Link>
              <span>•</span>
              <button
                onClick={() => setShowGuestModal(false)}
                className="hover:text-white transition cursor-pointer"
              >
                {t('guestModalContinue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
