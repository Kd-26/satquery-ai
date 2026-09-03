# SatQuery AI Frontend - Memory

## Work Completed (Up to Phase 14 & Homepage Overhaul)

### Phase 0 - Scaffolding
- Built the initial Next.js 14 frontend structure using the App Router.
- Configured Tailwind CSS and TypeScript.
- Created placeholder page routes (`/benchmark`, `/history`).
- Created empty component stubs for `UploadPanel.tsx`, `QueryBox.tsx`, `MapViewer.tsx`, etc.

### Phase 10 - GUI
- **Chunk 10.1 (Upload + Query Flow):**
  - Designed the primary two-column layout (Controls on the left, Map on the right).
  - Implemented `UploadPanel.tsx` with support for 'single', 'cross-modal', and 'bi-temporal' image modes, handling the drag-and-drop file inputs.
  - Implemented `QueryBox.tsx` with a dropdown for quick-fill template queries alongside a text area.
  - Wired up the network logic: Uploads files to `/api/v1/images`, links pairs via `/api/v1/pairs`, submits runs to `/api/v1/query`, and implements a 2-second polling loop to `/api/v1/runs/{run_id}` to fetch the final answer. (Includes mock fallbacks so the UI can be tested without the backend running).
- **Chunk 10.2 (Map Viewer):** Implemented `MapViewer.tsx` in the right column. It includes:
  - Base layer rendering with semantic mask overlays.
  - An **Overlay Opacity** slider to fade the AI's predictions in and out over raw imagery.
  - A **Before/After slider** for temporal workflows (T1 vs T2 comparison).
  - A **Cross-Modal view toggle** allowing users to switch between Optical-only, SAR-only, and Fused views.
- **Chunk 10.3 (Evidence, Trace, Export):** Implemented `EvidencePanel.tsx` with a Plain/Technical language toggle, `TracePanel.tsx` to view the step-by-step machine execution trace, and `ReportExport.tsx` to trigger PDF downloads of the run results. Styled with strict monospace fonts for mathematical outputs.

### Phase 13 - Design System Foundation
- **Chunk 13.1 (Design Tokens):** Overhauled `tailwind.config.ts` with the dark 'Mission Control' theme colors, mask class colors, and consistent transition/border tokens. Configured `next/font/google` to load 'Inter' (sans) and 'JetBrains Mono' (mono) globally in `layout.tsx`.
- **Chunk 13.2 (UI Primitives):** Built shared components (`Button`, `Panel`, `Tabs`, `Slider`, `Badge`, and `DataReadout`) utilizing the new dark-mode design tokens, enforcing a consistent, mission-control aesthetic across the app.
  - Refactored older Phase 10 components (`UploadPanel`, `QueryBox`, `EvidencePanel`, `TracePanel`, `ReportExport`) to adopt the new UI primitives instead of relying on raw Tailwind classes.

### Phase 14 - Two-Mode Frontend Flow
- **Chunk 14.1 (Two-Mode Flow):** Configured Next.js App Router for the `/explorer/[runId]` path. Added an 'Open in Evidence Explorer' link inside the Quick Query results. Both routes automatically share the root layout and Mission Control design tokens.
- **Chunk 14.2 (State & Data Layer):** Configured TanStack Query for caching server data (`useRun`, `useEvidenceGraph`) wrapped via `Providers.tsx`. Set up Zustand (`explorerStore.ts`) for robust global state management (e.g., `selectedRegionId`) enforcing selector-based subscriptions to prevent unnecessary re-renders in the Evidence Explorer.

### Custom Milestone - Elite Mission Control Homepage & Route Migration
- **Relocated Quick Query (`/query`):** Moved the interactive analysis workspace to `/query` and fully mounted the `MapViewer` component with live overlay controls.
- **Master Creative Landing Page (`/`):** Crafted a high-impact, aerospace-grade Earth Observation intelligence homepage avoiding generic AI clichés:
  - **Live Orbital Telemetry HUD:** Real-time ticking UTC clock, orbital altitude (693.4 km SSO), Sentinel-2B pass telemetry, and active target coordinates.
  - **Interactive Mission Simulator:** Four real-world intelligence case studies (Kerch Strait Maritime SAR Anomaly, Lake Mead Desiccation, Atacama Lithium Evaporation, Chernobyl Burn Severity) with interactive Before/After sliders and live Dual-Register outputs (Plain Language Brief + Formal PostGIS Proof Tree).
  - **Neuro-Symbolic Anti-Hallucination Showcase:** Explains why pure VLMs fail at earth observation and how SatQuery AI binds neural vision to deterministic PostGIS geometry and float32 raster algebra.
  - **Multi-Spectral Band Matrix:** Interactive explorer across 13 Sentinel-2 bands + C-Band SAR radar with ground resolutions, wavelengths, and scientific formulas.
  - **Tactical Terminal & API Console:** Copyable multi-language integration snippets (CLI, Python SDK, cURL).
- **Navigation Bar Overhaul (`layout.tsx`):** Tactical radar insignia, route indicators (`[00] Overview`, `[01] Quick Query`, `[02] Benchmarks`, `[03] History`), DEFCON/System Ready status pills, and direct query launch button.

### Phase 16 - Geospatial Viewer Panel (Panel A)
- **Chunk 16.1 (COG tile viewer with overlays):**
  - Set up `backend/api/titiler_service.py` exposing TiTiler tile-serving endpoints `/tiles/{z}/{x}/{y}`.
  - Built `frontend/src/components/explorer/GeospatialViewer.tsx` as a MapLibre GL JS wrapper that fetches Cloud-Optimized GeoTIFFs (COGs) natively via tiles (enforcing O(1) memory overhead in the browser instead of downloading gigabyte raw rasters).
  - Wired in toggleable mask layers bound to the class-color design tokens and individual Opacity sliders.
- **Chunk 16.2 (Swipe, side-by-side, AOI draw, click-to-inspect):**
  - Extended the `GeospatialViewer` with interactive view modes (`standard`, `swipe`, `split`).
  - Implemented the Before/After bi-temporal `swipe` divider and Cross-Modal `split` panes for side-by-side Optical/SAR evaluation.
  - Sketched the AOI maplibre-gl-draw integration and wired up the core 'Click to inspect region' handler, preparing it to fire `regions_touching_point` spatial queries to the backend and globally synchronize the `selectedRegionId` into the Zustand store for Panel B to react to.

---

## Architectural Decisions
1. **React State & Mocking:** Managed state directly in the page components. Added seamless frontend mocking (intercepting failed API calls) so the UI remains interactive and testable while the ML backend is still under development.
2. **Layout Structure:** Adopted a two-column layout for `/query`. The left column manages user input and reasoning flow, while the right column is dedicated entirely to visualizing geospatial data.
3. **Route Separation:** `/` is dedicated to presentation, mission context, educational exploration, and case study inspection. `/query` is the operational workspace for uploading and querying satellite images.
