import { create } from 'zustand';

export interface ExplorerState {
    selectedRegionId: string | null;
    activeExperimentId: string | null;
    panelLayout: 'split' | 'map-only' | 'analysis-only';

    setSelectedRegionId: (id: string | null) => void;
    setActiveExperimentId: (id: string | null) => void;
    setPanelLayout: (layout: 'split' | 'map-only' | 'analysis-only') => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
    selectedRegionId: null,
    activeExperimentId: null,
    panelLayout: 'split',

    setSelectedRegionId: (id) => set({ selectedRegionId: id }),
    setActiveExperimentId: (id) => set({ activeExperimentId: id }),
    setPanelLayout: (layout) => set({ panelLayout: layout }),
}));
