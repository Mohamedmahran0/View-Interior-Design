declare module '@mkkellogg/gaussian-splats-3d' {
  export class Viewer {
    constructor(options: {
      cameraUp?: [number, number, number];
      initialCameraPosition?: [number, number, number];
      initialCameraLookAt?: [number, number, number];
      rootElement?: HTMLElement;
      sharedMemoryForWorkers?: boolean;
    });
    addSplatScene(url: string, options?: {
      showLoadingUI?: boolean;
      position?: [number, number, number];
      rotation?: [number, number, number, number];
      scale?: [number, number, number];
    }): Promise<void>;
    start(): void;
    dispose(): void;
  }
}
