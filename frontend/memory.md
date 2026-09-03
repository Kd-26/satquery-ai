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
