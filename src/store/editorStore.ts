import { create } from 'zustand';
import * as THREE from 'three';
import { createClient } from '@/utils/supabase/client';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type HdrPreset = 'studio' | 'apartment' | 'city' | 'sunset' | 'dawn' | 'warehouse' | 'night';

export interface ObjectTransform {
  position: [number, number, number];
  rotation: [number, number, number]; // in degrees for UI
  scale: [number, number, number];
}

export interface MaterialState {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  transmission?: number;
}

export interface SceneSnapshot {
  timestamp: number;
  description: string;
  objects: Record<string, {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    material?: MaterialState;
  }>;
  environment: {
    preset: HdrPreset;
    intensity: number;
    rotation: number;
    showBackground: boolean;
  };
}

export interface EditorState {
  // Selection & Transform
  selectedId: string | null;
  transformMode: TransformMode;
  selectedTransform: ObjectTransform;
  
  // Material Editor
  selectedMaterial: MaterialState;
  
  // Realistic HDR & Lighting (Prompt 4)
  hdrPreset: HdrPreset;
  hdrCustomUrl: string | null;
  environmentIntensity: number;
  environmentRotation: number;
  showBackground: boolean;
  exposure: number;
  
  // Navigation & Modes
  editorMode: 'object' | 'edit';
  isWalkthrough: boolean;
  
  // AI Assistant Prompt
  aiPrompt: string;
  isAiLoading: boolean;
  aiResultUrl: string | null;
  
  // Undo / Redo History (Prompt 2: 50 steps minimum)
  history: SceneSnapshot[];
  historyIndex: number;
  
  // Persistence & Auto-save (Prompt 5)
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: string | null;
  errorMessage: string | null;

  // Actions
  setSelectedId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setSelectedTransform: (transform: Partial<ObjectTransform>) => void;
  updateMaterial: (key: keyof MaterialState, val: any) => void;
  
  setHdrPreset: (preset: HdrPreset) => void;
  setHdrCustomUrl: (url: string | null) => void;
  setEnvironmentIntensity: (intensity: number) => void;
  setEnvironmentRotation: (deg: number) => void;
  setShowBackground: (show: boolean) => void;
  setExposure: (val: number) => void;
  
  setEditorMode: (mode: 'object' | 'edit') => void;
  setIsWalkthrough: (val: boolean) => void;
  setAiPrompt: (prompt: string) => void;
  
  // History Actions
  pushHistory: (description: string, objectsData?: Record<string, any>) => void;
  undo: () => SceneSnapshot | null;
  redo: () => SceneSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence Actions (Supabase)
  serializeScene: (scene?: THREE.Scene) => Record<string, any>;
  saveToSupabase: (projectId: string, scene?: THREE.Scene) => Promise<boolean>;
  loadFromSupabase: (projectId: string) => Promise<Record<string, any> | null>;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error', error?: string) => void;
}

const MAX_HISTORY_STEPS = 50;

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedId: null,
  transformMode: 'translate',
  selectedTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  
  selectedMaterial: {
    color: '#38bdf8',
    roughness: 0.3,
    metalness: 0.2,
    clearcoat: 0.1,
    transmission: 0.0,
  },
  
  hdrPreset: 'studio',
  hdrCustomUrl: null,
  environmentIntensity: 1.2,
  environmentRotation: 0,
  showBackground: false,
  exposure: 1.0,
  
  editorMode: 'object',
  isWalkthrough: false,
  
  aiPrompt: '',
  isAiLoading: false,
  aiResultUrl: null,
  
  history: [],
  historyIndex: -1,
  
  isSaving: false,
  saveStatus: 'idle',
  lastSavedAt: null,
  errorMessage: null,

  setSelectedId: (id) => set({ selectedId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  
  setSelectedTransform: (partial) => {
    set((state) => ({
      selectedTransform: {
        ...state.selectedTransform,
        ...partial,
      },
    }));
  },
  
  updateMaterial: (key, val) => {
    set((state) => ({
      selectedMaterial: { ...state.selectedMaterial, [key]: val },
    }));
  },
  
  setHdrPreset: (preset) => set({ hdrPreset: preset }),
  setHdrCustomUrl: (url) => set({ hdrCustomUrl: url }),
  setEnvironmentIntensity: (intensity) => set({ environmentIntensity: intensity }),
  setEnvironmentRotation: (deg) => set({ environmentRotation: deg }),
  setShowBackground: (show) => set({ showBackground: show }),
  setExposure: (val) => set({ exposure: val }),
  
  setEditorMode: (mode) => set({ editorMode: mode }),
  setIsWalkthrough: (val) => set({ isWalkthrough: val }),
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  
  // History: Record snapshot with max 50 steps
  pushHistory: (description, objectsData = {}) => {
    const { history, historyIndex, hdrPreset, environmentIntensity, environmentRotation, showBackground, selectedTransform, selectedMaterial, selectedId } = get();
    
    const snapshot: SceneSnapshot = {
      timestamp: Date.now(),
      description,
      objects: {
        ...objectsData,
        ...(selectedId ? {
          [selectedId]: {
            position: [...selectedTransform.position],
            rotation: [...selectedTransform.rotation],
            scale: [...selectedTransform.scale],
            material: { ...selectedMaterial },
          }
        } : {})
      },
      environment: {
        preset: hdrPreset,
        intensity: environmentIntensity,
        rotation: environmentRotation,
        showBackground,
      },
    };

    // Trim redo tail
    const nextHistory = history.slice(0, historyIndex + 1);
    if (nextHistory.length >= MAX_HISTORY_STEPS) {
      nextHistory.shift();
    }
    nextHistory.push(snapshot);

    set({
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    
    set({
      historyIndex: newIndex,
      hdrPreset: snapshot.environment.preset,
      environmentIntensity: snapshot.environment.intensity,
      environmentRotation: snapshot.environment.rotation,
      showBackground: snapshot.environment.showBackground,
    });
    return snapshot;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    
    set({
      historyIndex: newIndex,
      hdrPreset: snapshot.environment.preset,
      environmentIntensity: snapshot.environment.intensity,
      environmentRotation: snapshot.environment.rotation,
      showBackground: snapshot.environment.showBackground,
    });
    return snapshot;
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Serialization (Prompt 5)
  serializeScene: (scene?: THREE.Scene) => {
    const state = get();
    const serialized: Record<string, any> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      lighting: {
        preset: state.hdrPreset,
        customUrl: state.hdrCustomUrl,
        intensity: state.environmentIntensity,
        rotation: state.environmentRotation,
        showBackground: state.showBackground,
        exposure: state.exposure,
      },
      selectedTransform: state.selectedTransform,
      selectedMaterial: state.selectedMaterial,
      objects: {},
    };

    if (scene) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData?.editable) {
          serialized.objects[child.uuid] = {
            name: child.name,
            position: child.position.toArray(),
            rotation: [
              THREE.MathUtils.radToDeg(child.rotation.x),
              THREE.MathUtils.radToDeg(child.rotation.y),
              THREE.MathUtils.radToDeg(child.rotation.z),
            ],
            scale: child.scale.toArray(),
          };
        }
      });
    }

    return serialized;
  },

  setSaveStatus: (status, error) => {
    set({
      saveStatus: status,
      isSaving: status === 'saving',
      errorMessage: error || null,
      lastSavedAt: status === 'saved' ? new Date().toLocaleTimeString() : get().lastSavedAt,
    });
  },

  // Save to Supabase projects.scene_metadata
  saveToSupabase: async (projectId: string, scene?: THREE.Scene) => {
    const state = get();
    if (!projectId) return false;

    state.setSaveStatus('saving');
    try {
      const supabase = createClient();
      const metadata = state.serializeScene(scene);

      const { error } = await supabase
        .from('projects')
        .update({
          scene_metadata: metadata,
          scene_data: metadata,
          last_modified: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      state.setSaveStatus('saved');
      return true;
    } catch (err: any) {
      console.error('Failed to save scene state to Supabase:', err);
      state.setSaveStatus('error', err?.message || 'Save failed');
      return false;
    }
  },

  // Load from Supabase projects.scene_metadata
  loadFromSupabase: async (projectId: string) => {
    if (!projectId) return null;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('scene_metadata, scene_data')
        .eq('id', projectId)
        .single();

      if (error || !data) return null;

      const meta = data.scene_metadata || data.scene_data;
      if (meta?.lighting) {
        set({
          hdrPreset: meta.lighting.preset || 'studio',
          environmentIntensity: meta.lighting.intensity ?? 1.2,
          environmentRotation: meta.lighting.rotation ?? 0,
          showBackground: !!meta.lighting.showBackground,
          exposure: meta.lighting.exposure ?? 1.0,
        });
      }
      if (meta?.selectedMaterial) {
        set({ selectedMaterial: meta.selectedMaterial });
      }
      if (meta?.selectedTransform) {
        set({ selectedTransform: meta.selectedTransform });
      }

      return meta;
    } catch (err) {
      console.error('Failed to load scene state:', err);
      return null;
    }
  },
}));
