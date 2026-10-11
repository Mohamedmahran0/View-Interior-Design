import { create } from 'zustand';

export type CameraMode = 'perspective' | 'orthographic';
export type LevelMode = 'stacked' | 'exploded' | 'solo';
export type WallMode = 'cutaway' | 'full';
export type QualityPreset = 'low' | 'balanced' | 'ultra';
export type ViewPerspective = 'walkthrough' | 'orbit' | 'floorplan';
export type LightingPreset = 'day' | 'golden' | 'night';

export interface ViewerState {
  cameraMode: CameraMode;
  levelMode: LevelMode;
  wallMode: WallMode;
  hdrIntensity: number;
  environmentRotation: number;
  qualityPreset: QualityPreset;
  useBakedMaterials: boolean;
  selectedMeshName: string | null;
  isSoftwareRenderer: boolean;
  viewPerspective: ViewPerspective;
  lightingPreset: LightingPreset;
  activeRoom: string;

  setCameraMode: (mode: CameraMode) => void;
  setLevelMode: (mode: LevelMode) => void;
  setWallMode: (mode: WallMode) => void;
  setHdrIntensity: (intensity: number) => void;
  setEnvironmentRotation: (deg: number) => void;
  setQualityPreset: (preset: QualityPreset) => void;
  setUseBakedMaterials: (use: boolean) => void;
  setSelectedMeshName: (name: string | null) => void;
  setIsSoftwareRenderer: (isSoftware: boolean) => void;
  setViewPerspective: (mode: ViewPerspective) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  setActiveRoom: (room: string) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  cameraMode: 'perspective',
  levelMode: 'stacked',
  wallMode: 'full',
  hdrIntensity: 1.0,
  environmentRotation: 0,
  qualityPreset: 'balanced',
  useBakedMaterials: true,
  selectedMeshName: null,
  isSoftwareRenderer: false,
  viewPerspective: 'walkthrough',
  lightingPreset: 'day',
  activeRoom: 'living',

  setCameraMode: (cameraMode) => set({ cameraMode }),
  setLevelMode: (levelMode) => set({ levelMode }),
  setWallMode: (wallMode) => set({ wallMode }),
  setHdrIntensity: (hdrIntensity) => set({ hdrIntensity }),
  setEnvironmentRotation: (environmentRotation) => set({ environmentRotation }),
  setQualityPreset: (qualityPreset) => set({ qualityPreset }),
  setUseBakedMaterials: (useBakedMaterials) => set({ useBakedMaterials }),
  setSelectedMeshName: (selectedMeshName) => set({ selectedMeshName }),
  setIsSoftwareRenderer: (isSoftwareRenderer) => set({ isSoftwareRenderer }),
  setViewPerspective: (viewPerspective) => {
    if (viewPerspective === 'floorplan') {
      set({ viewPerspective, cameraMode: 'orthographic' });
    } else {
      set({ viewPerspective, cameraMode: 'perspective' });
    }
  },
  setLightingPreset: (lightingPreset) => {
    const hdrIntensity = lightingPreset === 'night' ? 0.3 : lightingPreset === 'golden' ? 1.4 : 1.0;
    set({ lightingPreset, hdrIntensity });
  },
  setActiveRoom: (activeRoom) => set({ activeRoom }),
}));
