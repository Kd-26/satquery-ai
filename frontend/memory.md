# SatQuery AI Frontend - Memory

## Work Completed (Up to Chunk 10.1)

### Phase 0 - Scaffolding
- Built the initial Next.js 14 frontend structure using the App Router.
- Configured Tailwind CSS and TypeScript.
- Created placeholder page routes (`/benchmark`, `/history`).
- Created empty component stubs for `UploadPanel.tsx`, `QueryBox.tsx`, `MapViewer.tsx`, etc.

### Phase 10 - GUI
- **Chunk 10.1 (Upload + Query Flow):**
  - Designed the primary `HomePage` (`src/app/page.tsx`) with a side-by-side layout (Controls on the left, Map on the right).
  - Implemented `UploadPanel.tsx` with support for 'single', 'cross-modal', and 'bi-temporal' image modes, handling the drag-and-drop file inputs.
  - Implemented `QueryBox.tsx` with a dropdown for quick-fill template queries alongside a text area.
  - Wired up the network logic: Uploads files to `/api/v1/images`, links pairs via `/api/v1/pairs`, submits runs to `/api/v1/query`, and implements a 2-second polling loop to `/api/v1/runs/{run_id}` to fetch the final answer. (Includes mock fallbacks so the UI can be tested without the backend running).

---

## Architectural Decisions
1. **React State & Mocking:** Managed state directly in the page components. Added seamless frontend mocking (intercepting failed API calls) so the UI remains interactive and testable while the ML backend is still under development.
2. **Layout Structure:** Adopted a two-column layout. The left column manages the user input and reasoning flow, while the right column is dedicated entirely to visualizing the geospatial data.

---

## Next Steps
- **Chunk 10.2 (Map Viewer):** Implemented MapViewer.tsx in the right column. It includes:
  - Base layer rendering with semantic mask overlays (mocked visually).
  - An **Overlay Opacity** slider to fade the AI's predictions in and out over the raw imagery.
  - A **Before/After slider** for temporal workflows (T1 vs T2 comparison).
  - A **Cross-Modal view toggle** allowing users to switch between Optical-only, SAR-only, and Fused views.
- **Chunk 10.3 (Evidence, Trace, Export):** Implemented EvidencePanel.tsx with a Plain/Technical language toggle, TracePanel.tsx to view the step-by-step machine execution trace, and ReportExport.tsx to trigger PDF downloads of the run results. Styled with strict monospace fonts for mathematical outputs.
- **Chunk 13.1 (Design Tokens):** Overhauled 	ailwind.config.ts with the dark 'Mission Control' theme colors, mask class colors, and consistent transition/border tokens. Configured 
ext/font/google to load 'Inter' (sans) and 'JetBrains Mono' (mono) globally in layout.tsx.
- **Chunk 13.2 (UI Primitives):** Built shared components (Button, Panel, Tabs, Slider, Badge, and DataReadout) utilizing the new dark-mode design tokens, enforcing a consistent, mission-control aesthetic across the app.
  - Refactored older Phase 10 components (\UploadPanel\, \QueryBox\, \EvidencePanel\, \TracePanel\, \ReportExport\) to adopt the new UI primitives instead of relying on raw Tailwind classes.
- **Chunk 14.1 (Two-Mode Flow):** Configured Next.js App Router for the /explorer/[runId] path. Added an 'Open in Evidence Explorer' link inside the Quick Query results. Both routes automatically share the root layout and Mission Control design tokens.
- **Chunk 14.2 (State & Data Layer):** Configured TanStack Query for caching server data (\useRun\, \useEvidenceGraph\) wrapped via \Providers.tsx\. Set up Zustand (\explorerStore.ts\) for robust global state management (e.g., \selectedRegionId\) enforcing selector-based subscriptions to prevent unnecessary re-renders in the Evidence Explorer.
