"use client";
import React, { useState } from 'react';
import Link from 'next/link';

// Spectral Sensor States for the Signature Optical Chamber
type SpectralMode = 'rgb' | 'cir' | 'sar' | 'topology';

interface ModeDetails {
  id: SpectralMode;
  label: string;
  sensor: string;
  bands: string;
  wavelength: string;
  metric: string;
  value: string;
  description: string;
  indicatorColor: string;
}

const SPECTRAL_MODES: Record<SpectralMode, ModeDetails> = {
  rgb: {
    id: 'rgb',
    label: 'TRUE COLOR // OPTICAL',
    sensor: 'Sentinel-2B MSI',
    bands: 'B04 (Red) + B03 (Green) + B02 (Blue)',
    wavelength: '490 nm – 665 nm',
    metric: 'Visual Reflectance',
    value: '0.182 ρ',
    description: 'Human visible spectrum. Cloud cover, atmospheric haze, and shadow occlude surface features.',
    indicatorColor: '#E4E9F2'
  },
  cir: {
    id: 'cir',
    label: 'COLOR INFRARED // VEGETATION',
    sensor: 'Sentinel-2B MSI',
    bands: 'B08 (NIR) + B04 (Red) + B03 (Green)',
    wavelength: '842 nm (Near-Infrared)',
    metric: 'NDVI Canopy Index',
    value: '+0.741 (Dense Biomass)',
    description: 'Healthy mesophyll cell structures reflect 50%+ of NIR radiation, rendering living canopy in vivid crimson.',
    indicatorColor: '#FF4438'
  },
  sar: {
    id: 'sar',
    label: 'SYNTHETIC APERTURE RADAR',
    sensor: 'Sentinel-1A C-SAR',
    bands: 'C-Band (5.405 GHz) // Dual Pol (VV + VH)',
    wavelength: '5.54 cm Microwave',
    metric: 'Radar Cross-Section',
    value: '-8.42 dB (Specular Sea)',
    description: 'Microwave pulses penetrate 100% cloud cover and precipitation, measuring physical surface dielectric roughness.',
    indicatorColor: '#2DE2E6'
  },
  topology: {
    id: 'topology',
    label: 'POSTGIS VECTOR TOPOLOGY',
    sensor: 'Deterministic Prover',
    bands: 'EPSG:4326 -> EPSG:3857 Reprojected Polygons',
    wavelength: 'Zero Optical Dispersion',
    metric: 'ST_Area Metric Delta',
    value: '45,210 m² (±0.05%)',
    description: 'Vector polygon boundaries derived via deterministic thresholding and validated in PostGIS. Zero neural hallucination.',
    indicatorColor: '#3FB950'
  }
};

// 3 Concrete Physical Verification Case Studies
const CASE_STUDIES = [
  {
    target: "LAKE MEAD RESERVOIR",
    location: "Nevada / Arizona Border, USA",
    coordinates: "36°08'N 114°44'W",
    instrument: "Landsat-9 OLI-2 (B3 Green + B6 SWIR-1)",
    question: "How much surface water area did the reservoir lose between 2019 and 2024?",
    vlmTrap: "Generic vision models guess 'substantial drought reduction' and invent arbitrary percentage figures without spatial coordinates.",
    proofSolution: "SatQuery AI executes deterministic Modified NDWI algebra across calibrated float rasters, thresholding open water at MNDWI ≥ 0.18. PostGIS calculates the polygon difference in metric UTM projection.",
    measurement: "-48.36 km²",
    uncertainty: "±0.42 km² (15m Panchromatic Guard)",
    proofCode: "SELECT ST_Area(t1.geom) - ST_Area(t2.geom) FROM water_masks WHERE run_id = 'run_mead_24';"
  },
  {
    target: "KERCH STRAIT CHOKEPOINT",
    location: "Black Sea / Sea of Azov",
    coordinates: "45°18'N 36°30'E",
    instrument: "Sentinel-1A C-SAR (VV + VH Channels)",
    question: "Identify anchored military and cargo vessels under complete 10k ft overcast stratus clouds.",
    vlmTrap: "Optical LLMs produce empty predictions or hallucinations because cloud cover completely obscures visible satellite images.",
    proofSolution: "SatQuery AI routes to radar: computes linear cross-polarization ratio (VV/VH) and temporal backscatter variance. Metallic corner reflectors stand out at +9.2 dB over calm water.",
    measurement: "4 Discrete Contacts",
    uncertainty: "100% Cloud Penetration Verified",
    proofCode: "diff_dB = 10 * np.log10(I_t2 / I_t1); anomalous_targets = np.where(diff_dB > 8.0)"
  },
  {
    target: "SALAR DE ATACAMA",
    location: "Antofagasta Region, Chile",
    coordinates: "23°30'S 68°15'W",
    instrument: "Sentinel-2B MSI (B08 NIR + B11/B12 SWIR)",
    question: "Measure lithium brine crystallization advance across solar evaporation pond clusters.",
    vlmTrap: "RGB models confuse shallow water reflections with high-salinity salt precipitation crusts.",
    proofSolution: "SatQuery AI pairs Shortwave Infrared absorption dips with NIR surface reflectance, separating brine concentration stages via domain-shift validated band ratios.",
    measurement: "+14.8% Surface Crystallization",
    uncertainty: "Bilinear 20m-to-10m Grid Alignment",
    proofCode: "salinity_idx = np.sqrt(b04**2 + b08**2); active_brine = salinity_idx > threshold"
  }
];

export default function HomePage() {
  const [activeMode, setActiveMode] = useState<SpectralMode>('cir');
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null);
  const currentDetails = SPECTRAL_MODES[activeMode];

  return (
    <main className="min-h-screen bg-[#080B10] text-[#E4E9F2] font-sans selection:bg-[#2DE2E6] selection:text-[#080B10]">
      {/* Precision Instrument Top Status Line */}
      <div className="border-b border-[#1C2433] bg-[#0A0E15] px-4 sm:px-8 py-2 text-[11px] font-mono tracking-wider text-[#7C889E] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-[#E4E9F2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2DE2E6] animate-pulse"></span>
            ORBITAL CALIBRATION: NOMINAL
          </span>
          <span className="hidden sm:inline text-[#1C2433]">/</span>
          <span className="hidden sm:inline">PASS ID: <strong className="text-[#E4E9F2]">S2B-MSIL2A-20240902</strong></span>
          <span className="hidden md:inline text-[#1C2433]">/</span>
          <span className="hidden md:inline">DATUM: <strong className="text-[#E4E9F2]">WGS 84 / UTM ZONE 11N</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>POSTGIS VERIFIER: <strong className="text-[#3FB950]">STRICT PROOFS</strong></span>
          <span className="text-[#1C2433]">/</span>
          <span>DOMAIN SHIFT: <strong className="text-[#2DE2E6]">GUARDED</strong></span>
        </div>
      </div>

      {/* SECTION 1: HERO & THE OPTICAL SPECTRAL BENCH */}
      <section className="border-b border-[#1C2433] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Thesis & Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#101520] border border-[#1C2433] rounded text-[11px] font-mono text-[#2DE2E6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DE2E6]"></span>
              NEURO-SYMBOLIC SATELLITE ENGINE
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-[-0.03em] leading-[1.08] text-[#E4E9F2]">
              The Earth is not a prompt.<br />
              <span className="text-[#7C889E] font-normal">
                It is a measurable physical surface.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#8A93A6] leading-relaxed max-w-xl">
              Vision-language models hallucinate pixel counts, confabulate boundaries, and collapse when mixing 10m and 30m sensors. 
              <strong className="text-[#E4E9F2] font-semibold"> SatQuery AI</strong> anchors neural language models to deterministic raster algebra and PostGIS spatial proofs.
            </p>

            {/* Direct Action Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/query"
                className="px-6 py-3.5 bg-[#2DE2E6] text-[#080B10] font-mono text-xs font-bold tracking-wider rounded hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_24px_rgba(45,226,230,0.25)]"
              >
                <span>OPEN INSTRUMENT CONSOLE</span>
                <span>&rarr;</span>
              </Link>
              
              <Link
                href="/benchmark"
                className="px-5 py-3.5 bg-[#101520] border border-[#1C2433] hover:border-[#2DE2E6] text-[#E4E9F2] font-mono text-xs tracking-wider rounded transition-colors"
              >
                INSPECT BENCHMARKS
              </Link>
            </div>

            {/* The 3 Core Non-Negotiables */}
            <div className="pt-6 border-t border-[#1C2433] grid grid-cols-3 gap-4 font-mono text-[11px]">
              <div>
                <span className="text-[#7C889E] block mb-0.5">SPATIAL RIGOR</span>
                <span className="text-[#E4E9F2] font-semibold">PostGIS EPSG:4326</span>
              </div>
              <div>
                <span className="text-[#7C889E] block mb-0.5">RASTER MATH</span>
                <span className="text-[#2DE2E6] font-semibold">float32 NumPy Only</span>
              </div>
              <div>
                <span className="text-[#7C889E] block mb-0.5">PROVABLE CLAIMS</span>
                <span className="text-[#3FB950] font-semibold">Dual-Register Brief</span>
              </div>
            </div>
          </div>

          {/* Right: The Interactive Spectral Sensor Viewfinder (The Signature Element) */}
          <div className="lg:col-span-6 bg-[#0E131C] border border-[#1C2433] rounded-lg p-5 sm:p-6 relative shadow-2xl">
            {/* Viewfinder Header */}
            <div className="flex items-center justify-between border-b border-[#1C2433] pb-3 mb-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDetails.indicatorColor }}></span>
                <span className="font-bold text-[#E4E9F2]">{currentDetails.label}</span>
              </div>
              <span className="text-[#7C889E]">{currentDetails.sensor}</span>
            </div>

            {/* Interactive Sensor Canvas */}
            <div 
              className="relative h-64 sm:h-72 bg-[#06080C] rounded border border-[#1C2433] overflow-hidden cursor-crosshair select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverPixel({
                  x: Math.round(e.clientX - rect.left),
                  y: Math.round(e.clientY - rect.top)
                });
              }}
              onMouseLeave={() => setHoverPixel(null)}
            >
              {/* Simulated Spectral Render Layer */}
              <div className="absolute inset-0 transition-opacity duration-300">
                {activeMode === 'rgb' && (
                  <div className="w-full h-full bg-gradient-to-br from-[#1c2e3d] via-[#1f372d] to-[#12191b] p-6 flex flex-col justify-between">
                    <div className="font-mono text-[10px] text-[#7C889E] bg-black/60 px-2 py-1 rounded w-fit">
                      CHANNEL COMPOSITION: RED (B04) + GREEN (B03) + BLUE (B02)
                    </div>
                    <div className="border border-white/20 p-3 rounded max-w-[220px] bg-black/40 backdrop-blur-sm text-xs font-mono">
                      <span className="text-[#7C889E] block">SURFACE FEATURE:</span>
                      <span className="text-white">Water & Canopy Obscured by Cirrus Cloud Haze</span>
                    </div>
                  </div>
                )}

                {activeMode === 'cir' && (
                  <div className="w-full h-full bg-gradient-to-br from-[#591414] via-[#7d1b1b] to-[#1a1424] p-6 flex flex-col justify-between">
                    <div className="font-mono text-[10px] text-[#FF4438] bg-black/70 border border-[#FF4438]/30 px-2 py-1 rounded w-fit font-bold">
                      COLOR INFRARED (CIR) // NIR (B08) ABSORPTION GRADIENT
                    </div>
                    <div className="border border-[#FF4438]/40 p-3 rounded max-w-[240px] bg-black/60 backdrop-blur-sm text-xs font-mono">
                      <span className="text-[#FF4438] font-semibold block">CHLOROPHYLL REFLECTANCE:</span>
                      <span className="text-[#E4E9F2]">Cellular canopy vigor highlighted in vivid infrared crimson</span>
                    </div>
                  </div>
                )}

                {activeMode === 'sar' && (
                  <div className="w-full h-full bg-gradient-to-br from-[#0c242b] via-[#081820] to-[#040d12] p-6 flex flex-col justify-between">
                    <div className="font-mono text-[10px] text-[#2DE2E6] bg-black/70 border border-[#2DE2E6]/30 px-2 py-1 rounded w-fit font-bold">
                      POLARIMETRIC C-SAR // 5.405 GHz MICROWAVE BACKSCATTER
                    </div>
                    <div className="border border-[#2DE2E6]/40 p-3 rounded max-w-[240px] bg-black/60 backdrop-blur-sm text-xs font-mono">
                      <span className="text-[#2DE2E6] font-semibold block">DIELECTRIC SCATTERING:</span>
                      <span className="text-[#E4E9F2]">Cloud layer bypassed. Metallic structures scatter high-energy returns</span>
                    </div>
                  </div>
                )}

                {activeMode === 'topology' && (
                  <div className="w-full h-full bg-[#080B10] p-6 flex flex-col justify-between relative">
                    <div className="font-mono text-[10px] text-[#3FB950] bg-black/70 border border-[#3FB950]/30 px-2 py-1 rounded w-fit font-bold">
                      POSTGIS EPSG:4326 GEOMETRIC PROOF MATRIX
                    </div>

                    {/* Vector Polygon Wireframe */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="w-3/4 h-3/4 text-[#3FB950] opacity-80" viewBox="0 0 200 120" fill="none">
                        <polygon points="30,20 170,30 150,95 40,85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" fill="rgba(63, 185, 80, 0.12)" />
                        <circle cx="30" cy="20" r="3" fill="#3FB950" />
                        <circle cx="170" cy="30" r="3" fill="#3FB950" />
                        <circle cx="150" cy="95" r="3" fill="#3FB950" />
                        <circle cx="40" cy="85" r="3" fill="#3FB950" />
                        <text x="50" y="60" fill="#3FB950" fontSize="8" fontFamily="monospace">ST_Area: 45,210 m² (EPSG:3857)</text>
                      </svg>
                    </div>

                    <div className="border border-[#3FB950]/40 p-3 rounded max-w-[240px] bg-black/60 backdrop-blur-sm text-xs font-mono relative z-10">
                      <span className="text-[#3FB950] font-semibold block">VERIFIED BOUNDARY:</span>
                      <span className="text-[#E4E9F2]">Zero Hallucination. PostGIS ST_Contains verified</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Reticle & Crosshairs */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner Marks */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#7C889E]/60"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#7C889E]/60"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#7C889E]/60"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#7C889E]/60"></div>

                {/* Center Reticle */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-12 h-12 border border-[#E4E9F2] rounded-full"></div>
                  <div className="w-1 h-1 bg-[#E4E9F2] rounded-full absolute"></div>
                </div>

                {/* Dynamic Pixel Hover HUD */}
                {hoverPixel && (
                  <div 
                    className="absolute bg-black/80 border border-[#2DE2E6] px-2 py-1 rounded text-[10px] font-mono text-[#2DE2E6] pointer-events-none"
                    style={{ 
                      left: Math.min(hoverPixel.x + 12, 220), 
                      top: Math.min(hoverPixel.y + 12, 200) 
                    }}
                  >
                    PX [{hoverPixel.x}, {hoverPixel.y}] &bull; {currentDetails.metric}: {currentDetails.value}
                  </div>
                )}
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 font-mono text-[11px]">
              {(['rgb', 'cir', 'sar', 'topology'] as SpectralMode[]).map((modeKey) => {
                const isSelected = activeMode === modeKey;
                const m = SPECTRAL_MODES[modeKey];
                return (
                  <button
                    key={modeKey}
                    onClick={() => setActiveMode(modeKey)}
                    className={`p-2 rounded border text-left transition-all ${
                      isSelected
                        ? 'bg-[#181F2C] border-[#2DE2E6] text-[#E4E9F2] font-semibold'
                        : 'bg-[#101520] border-[#1C2433] text-[#7C889E] hover:text-[#E4E9F2]'
                    }`}
                  >
                    <span className="block text-[10px] text-[#7C889E] uppercase">{modeKey.toUpperCase()}</span>
                    <span className="truncate block">{m.label.split(' // ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Channel Physical Metric Bar */}
            <div className="mt-4 pt-3 border-t border-[#1C2433] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-[#7C889E] text-[10px] block">WAVELENGTH (λ):</span>
                <span className="text-[#E4E9F2] font-medium">{currentDetails.wavelength}</span>
              </div>
              <div>
                <span className="text-[#7C889E] text-[10px] block">BANDS FUSED:</span>
                <span className="text-[#2DE2E6] font-medium truncate block">{currentDetails.bands}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#7C889E] text-[10px] block">MEASUREMENT:</span>
                <span className="text-[#3FB950] font-medium">{currentDetails.value}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 2: THE 3 AUTHENTIC PHYSICAL PROOFS */}
      <section className="border-b border-[#1C2433] py-16 sm:py-20 bg-[#0A0E15]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs text-[#2DE2E6] tracking-wider uppercase block mb-1">
              FIELD VERIFICATIONS // BENCHMARK WORKFLOWS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#E4E9F2]">
              Three Earth problems. Zero neural guesswork.
            </h2>
            <p className="text-sm text-[#8A93A6] mt-2">
              See the exact operational differences between relying on an ungrounded vision LLM versus SatQuery AI’s neuro-symbolic prover.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CASE_STUDIES.map((c, idx) => (
              <div key={idx} className="bg-[#101520] border border-[#1C2433] rounded-lg p-6 flex flex-col justify-between">
                <div>
                  {/* Target & Instrument */}
                  <div className="flex items-center justify-between font-mono text-xs text-[#7C889E] border-b border-[#1C2433] pb-3 mb-4">
                    <span className="text-[#2DE2E6] font-semibold">{c.target}</span>
                    <span>{c.coordinates}</span>
                  </div>

                  <h3 className="text-base font-bold text-[#E4E9F2] mb-2">
                    &ldquo;{c.question}&rdquo;
                  </h3>

                  <div className="text-xs text-[#7C889E] font-mono mb-4">
                    INSTRUMENT: <span className="text-[#E4E9F2]">{c.instrument}</span>
                  </div>

                  {/* Failure Mode of Raw LLM */}
                  <div className="p-3 bg-[#181D29] border-l-2 border-[#F85149] rounded-r text-xs mb-4">
                    <span className="font-mono font-bold text-[#F85149] block mb-1 text-[11px]">
                      RAW VLM FAILURE MODE:
                    </span>
                    <p className="text-[#8A93A6]">{c.vlmTrap}</p>
                  </div>

                  {/* SatQuery Prover Mechanism */}
                  <div className="p-3 bg-[#0C141D] border-l-2 border-[#2DE2E6] rounded-r text-xs mb-4">
                    <span className="font-mono font-bold text-[#2DE2E6] block mb-1 text-[11px]">
                      SATQUERY DETERMINISTIC PROOF:
                    </span>
                    <p className="text-[#8A93A6]">{c.proofSolution}</p>
                  </div>
                </div>

                {/* Quantitative Measurement & Code */}
                <div className="pt-4 border-t border-[#1C2433]">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-[#7C889E]">PROVEN DELTA:</span>
                    <span className="text-[#3FB950] font-bold text-sm">{c.measurement}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#7C889E] truncate bg-[#06080C] p-2 rounded border border-[#1C2433]">
                    {c.proofCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: THE APPARATUS (HOW THE ENGINE WORKS) */}
      <section className="border-b border-[#1C2433] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-xs text-[#2DE2E6] tracking-wider uppercase block mb-1">
              SYSTEM ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#E4E9F2]">
              The Neuro-Symbolic Pipeline
            </h2>
            <p className="text-sm text-[#8A93A6] mt-2">
              Neural models propose plans. Deterministic tools execute them. PostGIS validates the physics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
            {/* Stage 1 */}
            <div className="bg-[#101520] border border-[#1C2433] p-5 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[#2DE2E6] font-bold text-sm block mb-2">01 // INGESTION</span>
                <h4 className="text-sm font-sans font-bold text-[#E4E9F2] mb-2">Ingest & Profile</h4>
                <p className="text-[#8A93A6] text-xs font-sans leading-relaxed">
                  Raw GeoTIFF or SAR granules are inspected. Pixel spacing, sensor profile, CRS projection, and representation (dB vs linear) are indexed without neural guesswork.
                </p>
              </div>
              <div className="mt-4 text-[10px] text-[#7C889E] pt-3 border-t border-[#1C2433]">
                Output: InputProfile schema
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-[#101520] border border-[#1C2433] p-5 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[#2DE2E6] font-bold text-sm block mb-2">02 // PLANNING</span>
                <h4 className="text-sm font-sans font-bold text-[#E4E9F2] mb-2">VLM Directed Graph</h4>
                <p className="text-[#8A93A6] text-xs font-sans leading-relaxed">
                  The planner converts natural language queries into a strict Pydantic Directed Acyclic Graph (DAG) specifying which scientific tools and models to invoke.
                </p>
              </div>
              <div className="mt-4 text-[10px] text-[#7C889E] pt-3 border-t border-[#1C2433]">
                Output: ExecutionPlan DAG
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-[#101520] border border-[#2DE2E6]/40 p-5 rounded-lg flex flex-col justify-between shadow-[0_0_20px_rgba(45,226,230,0.06)]">
              <div>
                <span className="text-[#2DE2E6] font-bold text-sm block mb-2">03 // VALIDATION</span>
                <h4 className="text-sm font-sans font-bold text-[#2DE2E6] mb-2">Domain Shift Guard</h4>
                <p className="text-[#8A93A6] text-xs font-sans leading-relaxed">
                  validator.py checks model resolution bounds against image pixel size. 5x mismatches trigger hard errors; minor mismatches cap confidence at 0.5.
                </p>
              </div>
              <div className="mt-4 text-[10px] text-[#2DE2E6] pt-3 border-t border-[#1C2433]">
                Enforced: Zero False Claims
              </div>
            </div>

            {/* Stage 4 */}
            <div className="bg-[#101520] border border-[#1C2433] p-5 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[#3FB950] font-bold text-sm block mb-2">04 // SYNTHESIS</span>
                <h4 className="text-sm font-sans font-bold text-[#E4E9F2] mb-2">Dual-Register Proof</h4>
                <p className="text-[#8A93A6] text-xs font-sans leading-relaxed">
                  Delivers two simultaneous responses: a concise, plain English brief for commanders, and a mathematical PostGIS proof matrix with coordinate bounds.
                </p>
              </div>
              <div className="mt-4 text-[10px] text-[#3FB950] pt-3 border-t border-[#1C2433]">
                Output: Decision-Ready Truth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CALL TO ACTION FOOTER */}
      <footer className="py-16 bg-[#06080C] text-xs font-mono text-[#7C889E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#1C2433] pb-12">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold font-sans text-[#E4E9F2]">
              Ready to verify real satellite rasters?
            </h3>
            <p className="text-[#8A93A6]">
              Upload single, bi-temporal, or SAR cross-modal GeoTIFF payloads directly in the browser console.
            </p>
          </div>

          <Link
            href="/query"
            className="px-6 py-3.5 bg-[#2DE2E6] text-[#080B10] font-mono text-xs font-bold tracking-wider rounded hover:opacity-90 transition-opacity whitespace-nowrap shadow-[0_0_20px_rgba(45,226,230,0.2)]"
          >
            LAUNCH QUICK QUERY &rarr;
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            SATQUERY AI // EARTH OBSERVATION NEURO-SYMBOLIC PROVER
          </div>
          <div className="flex items-center gap-6 text-[#8A93A6]">
            <Link href="/query" className="hover:text-[#E4E9F2] transition-colors">Quick Query</Link>
            <Link href="/benchmark" className="hover:text-[#E4E9F2] transition-colors">Benchmarks</Link>
            <Link href="/history" className="hover:text-[#E4E9F2] transition-colors">History</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
