import { create } from 'zustand';

interface EditorState {
  selectedId: string | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  aiPrompt: string;
  isAiLoading: boolean;
  aiResultUrl: string | null;
  isWalkthrough: boolean;
  
  // Advanced Editor States
  editorMode: 'object' | 'edit';
  selectedMaterial: {
    color: string;
    roughness: number;
    metalness: number;
  };
  environmentIntensity: number;
  
  setSelectedId: (id: string | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setAiPrompt: (prompt: string) => void;
  setIsWalkthrough: (val: boolean) => void;
  setEditorMode: (mode: 'object' | 'edit') => void;
  updateMaterial: (key: string, val: any) => void;
  setEnvironmentIntensity: (val: number) => void;
  
  generateAiDesign: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedId: null,
  transformMode: 'translate',
  aiPrompt: '',
  isAiLoading: false,
  aiResultUrl: null,
  isWalkthrough: false,
  
  editorMode: 'object',
  selectedMaterial: { color: '#10b981', roughness: 0.2, metalness: 0.8 },
  environmentIntensity: 1.5,

  setSelectedId: (id) => set({ selectedId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  setIsWalkthrough: (val) => set({ isWalkthrough: val }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  updateMaterial: (key, val) => set((state) => ({ selectedMaterial: { ...state.selectedMaterial, [key]: val } })),
  setEnvironmentIntensity: (val) => set({ environmentIntensity: val }),
  
  generateAiDesign: async () => {
    const prompt = get().aiPrompt;
    if (!prompt) return;
    
    set({ isAiLoading: true });
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      if (data.success) {
        set({ aiResultUrl: data.imageUrl, isAiLoading: false });
      } else {
        set({ isAiLoading: false });
      }
    } catch (err) {
      console.error(err);
      set({ isAiLoading: false });
    }
  }
}));
