import { create } from 'zustand';

interface ExplorerState {
    selectedRegionId: string | null;
    activeExperimentId: string | null;
    panelLayout: 'split' | 'map-only' | 'analysis-only';
    
    setSelectedRegionId: (id: string | null) => void;
    setActiveExperimentId: (id: string | null) => void;
    setPanelLayout: (layout: 'split' | 'map-only' | 'analysis-only') => void;
}

export const useExplorerStore = create<ExplorerState>((set: any) => ({
    selectedRegionId: null,
    activeExperimentId: null,
    panelLayout: 'split',
    
    setSelectedRegionId: (id: string | null) => set({ selectedRegionId: id }),
    setActiveExperimentId: (id: string | null) => set({ activeExperimentId: id }),
    setPanelLayout: (layout: 'split' | 'map-only' | 'analysis-only') => set({ panelLayout: layout }),
}));
