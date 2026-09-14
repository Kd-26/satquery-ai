"use client";

/**
 * Lightweight global store that remembers the most recently uploaded image IDs
 * so the Scientific Lab page can auto-populate its input without manual copy-paste.
 *
 * Written to whenever DropZone completes an upload; read by the Lab page.
 */
import { create } from "zustand";

interface ImageStoreState {
  /** Up to 2 image IDs from the most recent upload session. */
  lastImageIds: string[];
  /** Save image IDs after a successful upload session. */
  setLastImageIds: (ids: string[]) => void;
  /** Clear stored IDs (e.g. when the user explicitly starts a new session). */
  clearLastImageIds: () => void;
}

export const useImageStore = create<ImageStoreState>((set) => ({
  lastImageIds: [],
  setLastImageIds: (ids) => set({ lastImageIds: ids }),
  clearLastImageIds: () => set({ lastImageIds: [] }),
}));
