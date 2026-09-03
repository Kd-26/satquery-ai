"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Mission Simulation Data
interface Mission {
  id: string;
  code: string;
  name: string;
  target: string;
  coordinates: string;
  sensor: string;
  resolution: string;
  dateRange: string;
  query: string;
  problem: string;
  executionSteps: string[];
  plainAnswer: string;
  technicalProof: {
    formula: string;
    measurement: string;
    confidence: number;
    postgisId: string;
    verificationStatus: 'VERIFIED' | 'STRICT_PASSED';
  };
  beforeLabel: string;
  afterLabel: string;
  accentColor: string;
}

const MISSIONS: Mission[] = [
  {
    id: "kerch",
    code: "MSN-S1A-7702",
    name: "Kerch Strait Maritime Vessel & Radar Wake Anomaly",
    target: "Chokepoint Corridor // Black Sea / Sea of Azov",
    coordinates: "45°18'55\"N 36°30'05\"E",
    sensor: "Sentinel-1A (C-Band SAR, 5.405 GHz)",
    resolution: "10m Pixel Spacing // IW Dual-Pol (VV + VH)",
    dateRange: "T1: 2024-02-14 // T2: 2024-02-18",
    query: "Detect anomalous maritime vessel cluster under complete cloud cover and calculate temporal radar backscatter variance.",
    problem: "100% thick stratus cloud obscuration blinds optical sensors (Sentinel-2/Landsat). Optical LLMs hallucinate clear-sky predictions.",
    executionSteps: [
      "Inbound Ingestion: Dual SAR SLC granules decompressed into complex float32 arrays.",
      "Scientific Tool [temporal_backscatter_diff]: Computed pixelwise ΔdB across VV & VH channels.",
      "Scientific Tool [vv_vh_ratio]: Identified non-sea specular reflectance (>8.4 dB shift).",
      "Spatial Tool [postgis_st_contains]: Bounded 4 distinct maritime vessels into vector geometries."
    ],
    plainAnswer: "Confirmed 4 maritime vessels anchored within the security exclusion zone. Target signatures exhibit high metallic corner-reflection properties (+9.2 dB variance) undetectable by optical cameras.",
    technicalProof: {
      formula: "Δσ° = 10 · log₁₀(I_T2 / I_T1) ; VV/VH > 4.2",
      measurement: "4 Discrete Contacts // +9.2 dB Radar Anomaly",
      confidence: 0.968,
      postgisId: "geom_s1a_kerch_8820f3",
      verificationStatus: "STRICT_PASSED"
    },
    beforeLabel: "T1: Baseline Sea Clutter (VV Channel)",
    afterLabel: "T2: Polarimetric Anomaly Detection (VV/VH Fused)",
    accentColor: "#3DDBD9"
  },
  {
    id: "mead",
    code: "MSN-L9-4419",
    name: "Lake Mead Water Basin Shoreline Desiccation",
    target: "Hoover Dam Reservoir // Nevada/Arizona, USA",
    coordinates: "36°08'40\"N 114°44'12\"W",
    sensor: "Landsat-9 (OLI-2 / TIRS-2)",
    resolution: "30m Multispectral // 15m Panchromatic Sharpened",
    dateRange: "T1: 2019-06-15 // T2: 2024-06-18",
    query: "Quantify exact surface water surface loss over a 5-year baseline using normalized difference water indices.",
    problem: "Generic VLMs guess 'significant water loss' without spatial boundaries, generating arbitrary percentages with zero geometric proof.",
    executionSteps: [
      "Radiometric Calibration: Converted Level-1 digital numbers to top-of-atmosphere reflectance.",
      "Scientific Tool [mndwi]: Evaluated (Green - SWIR-1) / (Green + SWIR-1) on float rasters.",
      "Binarization Threshold: Applied Otsu thresholding at MNDWI ≥ 0.18 for open water classification.",
      "Spatial Tool [st_area_delta]: Projected geometries into UTM Zone 11N (EPSG:32611) for metric polygon delta."
    ],
    plainAnswer: "Lake Mead surface area contracted by 48.36 km² over the 5-year observation window. The southern basin exhibits severe shoreline retreat with exposed bathturb-ring limestone deposits.",
    technicalProof: {
      formula: "MNDWI = (B03 - B06) / (B03 + B06) ; ST_Area(T1) - ST_Area(T2)",
      measurement: "-48.36 km² (±0.42 km² Error Margin)",
      confidence: 0.984,
      postgisId: "geom_l9_mead_water_retreat_v4",
      verificationStatus: "VERIFIED"
    },
    beforeLabel: "2019 Water Baseline (MNDWI > 0.18)",
    afterLabel: "2024 Desiccation Delta (Contraction Vector)",
    accentColor: "#4C8DFF"
  },
  {
    id: "atacama",
    code: "MSN-S2B-1092",
    name: "Atacama Lithium Evaporation Brine Concentration",
    target: "Salar de Atacama // Antofagasta, Chile",
    coordinates: "23°30'00\"S 68°15'00\"W",
    sensor: "Sentinel-2B (MSI 13-Band)",
    resolution: "10m (B2, B3, B4, B8) // 20m (B11, B12 SWIR)",
    dateRange: "T1: 2023-11-01 // T2: 2024-03-20",
    query: "Track mineral precipitation and crystallization gradients across solar evaporation ponds.",
    problem: "Subtle salinity and salt crust changes cannot be separated from shallow water in raw RGB images.",
    executionSteps: [
      "Cross-Band Alignment: Resampled 20m SWIR-1/SWIR-2 to 10m grid with bilinear interpolation.",
      "Domain Shift Verification: validator.py confirmed 10m-to-20m spectral consistency.",
      "Scientific Tool [salinity_index]: Fused B08 (NIR) and B11 (SWIR-1) absorption dips.",
      "Vectorization: Extracted active evaporation cell boundaries via PostGIS ST_Polygonize."
    ],
    plainAnswer: "Pond cluster Gamma-4 reached peak lithium brine saturation. Solar evaporation increased mineral crystallization surface area by +14.8% across 12,400 hectares.",
    technicalProof: {
      formula: "SI = √((B04)² + (B08)²) ; SWIR Ratio = B11 / B12",
      measurement: "+14.8% Brine Precipitation Index",
      confidence: 0.942,
      postgisId: "geom_s2_atacama_brine_c9",
      verificationStatus: "VERIFIED"
    },
    beforeLabel: "T1: Initial Filling Phase (Dilute Brine)",
    afterLabel: "T2: High-Salinity Crystallization Signature",
    accentColor: "#3FB950"
  },
  {
    id: "canopy",
    code: "MSN-S2A-9118",
    name: "Boreal Wildfire Scarring & Burn Severity Index",
    target: "Chornobyl Exclusion Zone // Northern Ukraine",
    coordinates: "51°16'18\"N 30°13'12\"E",
    sensor: "Sentinel-2A & 2B Multi-Temporal",
    resolution: "20m NIR & SWIR Bands",
    dateRange: "T1: Pre-Fire // T2: Post-Fire",
    query: "Calculate Normalized Burn Ratio delta (dNBR) and classify burn severity into formal USGS fire ecology tiers.",
    problem: "Smoke haze creates false positives in standard vegetation indexes like NDVI.",
    executionSteps: [
      "Scientific Tool [nbr_pre]: Evaluated pre-fire NBR = (B08 - B12) / (B08 + B12).",
      "Scientific Tool [nbr_post]: Evaluated post-fire NBR on cloud-masked scene.",
      "Burn Severity Index: Subtracted post from pre: dNBR = NBR_pre - NBR_post.",
      "Spatial Aggregation: Filtered out noise polygons with area < 10,000 m²."
    ],
    plainAnswer: "Total burn footprint covers 14,210 hectares, with 4,890 hectares meeting the threshold for Severe Crown Scorching. Canopy recovery time modeled at 8-12 years.",
    technicalProof: {
      formula: "dNBR = ((B08 - B12)/(B08 + B12))_pre - ((B08 - B12)/(B08 + B12))_post",
      measurement: "14,210 Hectares Burn Footprint",
      confidence: 0.971,
      postgisId: "geom_s2_canopy_burn_d12",
      verificationStatus: "STRICT_PASSED"
    },
    beforeLabel: "Pre-Fire Vegetative Biomass (NBR > 0.4)",
    afterLabel: "Post-Fire Burn Severity Scar (dNBR > 0.66)",
    accentColor: "#F0883E"
  }
];

// Spectral Bands Reference
const SPECTRAL_BANDS = [
  { code: "B02", name: "Blue", nm: "490 nm", gsd: "10m", role: "Soil / Vegetation discrimination & bathymetry", color: "#3B82F6" },
  { code: "B03", name: "Green", nm: "560 nm", gsd: "10m", role: "Peak vegetation reflectance & water turbidity", color: "#10B981" },
  { code: "B04", name: "Red", nm: "665 nm", gsd: "10m", role: "Chlorophyll absorption max (NDVI Red channel)", color: "#EF4444" },
  { code: "B08", name: "NIR", nm: "842 nm", gsd: "10m", role: "Leaf cellular structure & biomass vigor", color: "#8B5CF6" },
  { code: "B11", name: "SWIR-1", nm: "1610 nm", gsd: "20m", role: "Vegetation moisture content & snow/cloud split", color: "#F59E0B" },
  { code: "B12", name: "SWIR-2", nm: "2190 nm", gsd: "20m", role: "Geological mineral mapping & burn scars", color: "#D97706" },
  { code: "C-SAR", name: "SAR VV/VH", nm: "5.4 GHz", gsd: "10m", role: "All-weather surface roughness & radar backscatter", color: "#3DDBD9" }
];

export default function LandingHomePage() {
  const [activeMission, setActiveMission] = useState<Mission>(MISSIONS[0]);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [selectedBand, setSelectedBand] = useState(SPECTRAL_BANDS[3]);
  const [terminalTab, setTerminalTab] = useState<'cli' | 'python' | 'curl'>('cli');
  const [activeTelemetryCoord, setActiveTelemetryCoord] = useState("37°14'06\"N 115°48'40\"W");
  const [clock, setClock] = useState("23:42:18 UTC");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClock(now.toISOString().substring(11, 19) + " UTC");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-primary text-text-primary bg-tactical-grid flex flex-col font-sans selection:bg-accent selection:text-primary">
      {/* 1. TACTICAL ORBITAL HUD TELEMETRY BAR */}
      <div className="bg-panel border-b border-subtle py-2 px-4 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-text-secondary">
            <span className="flex items-center gap-1.5 text-text-primary">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
              <span className="text-accent font-bold">ORBITAL PASS:</span> SENTINEL-2B / ORBIT #38291
            </span>
            <span className="hidden md:inline text-subtle">|</span>
            <span className="hidden md:inline">
              ALT: <span className="text-text-primary">693.4 KM SSO</span>
            </span>
            <span className="hidden lg:inline text-subtle">|</span>
            <span className="hidden lg:inline">
              TARGET: <span className="text-accent">{activeTelemetryCoord}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-text-secondary">
            <span>
              SYSTEM CLOCK: <span className="text-text-primary font-bold">{clock}</span>
            </span>
            <span className="text-subtle">|</span>
            <span className="px-2 py-0.5 bg-accent/10 border border-accent/30 text-accent rounded text-[11px] font-semibold">
              POSTGIS STRICT VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            {/* Mission Callsign */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-panel border border-accent/40 rounded text-xs font-mono text-accent mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              <span>CLASSIFIED EO INTELLIGENCE PROTOCOL // NO CONFABULATION</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-text-primary">
              WHERE LARGE VISION MODELS MEET{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-cyan-300 to-blue-400">
                FORMAL MATHEMATICAL PROOFS.
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-8 max-w-3xl">
              Standard multimodal LLMs hallucinate pixel boundaries, invent vessel counts, and collapse when mixing 10m and 30m sensors. 
              <strong className="text-text-primary font-semibold"> SatQuery AI</strong> anchors neural vision into deterministic 
              PostGIS spatial geometries, float32 band algebra, and verifiable proof trees.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link
                href="/query"
                className="px-6 py-3.5 bg-accent text-primary font-mono text-sm font-bold rounded hover:opacity-90 transition-all shadow-[0_0_20px_rgba(61,219,217,0.3)] flex items-center gap-2"
              >
                <span>INITIALIZE QUICK QUERY INTERFACE</span>
                <span className="text-base">&rarr;</span>
              </Link>
              
              <a
                href="#simulator"
                className="px-6 py-3.5 bg-panel border border-subtle hover:border-accent text-text-primary font-mono text-sm font-medium rounded transition-colors"
              >
                INSPECT LIVE MISSION SIMULATOR
              </a>

              <Link
                href="/benchmark"
                className="px-5 py-3.5 text-text-secondary hover:text-text-primary font-mono text-sm flex items-center gap-1.5 transition-colors"
              >
                <span>BENCHMARK DATASETS</span>
                <span className="text-xs">&nearr;</span>
              </Link>
            </div>

            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-subtle font-mono">
              <div className="bg-panel p-3 border border-subtle rounded">
                <span className="text-[11px] text-text-secondary block">HALLUCINATION RATE</span>
                <span className="text-2xl font-bold text-accent">0.00%</span>
                <span className="text-[10px] text-text-secondary block mt-0.5">Strict Symbol Binding</span>
              </div>
              <div className="bg-panel p-3 border border-subtle rounded">
                <span className="text-[11px] text-text-secondary block">SPECTRAL BAND SUITE</span>
                <span className="text-2xl font-bold text-text-primary">13 BANDS</span>
                <span className="text-[10px] text-text-secondary block mt-0.5">MSI + Dual-Pol SAR</span>
              </div>
              <div className="bg-panel p-3 border border-subtle rounded">
                <span className="text-[11px] text-text-secondary block">DOMAIN SHIFT GUARD</span>
                <span className="text-2xl font-bold text-success">ENFORCED</span>
                <span className="text-[10px] text-text-secondary block mt-0.5">validator.py Guardrails</span>
              </div>
              <div className="bg-panel p-3 border border-subtle rounded">
                <span className="text-[11px] text-text-secondary block">RASTER TOOL SPEED</span>
                <span className="text-2xl font-bold text-text-primary">&lt;120ms</span>
                <span className="text-[10px] text-text-secondary block mt-0.5">C-Optimized NumPy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE MISSION SIMULATOR SECTION */}
      <section id="simulator" className="py-16 border-b border-subtle bg-panel/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-accent mb-2">
                <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/30 rounded">MISSION SIMULATOR</span>
                <span>{"// REAL-WORLD VERIFICATION CASE STUDIES"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Authentic Earth Observation Missions
              </h2>
              <p className="text-text-secondary text-sm mt-1 max-w-2xl">
                Inspect how SatQuery AI solves critical intelligence problems where standard LLMs fail. Click any mission to inspect the dual-register output.
              </p>
            </div>

            <Link 
              href="/query"
              className="font-mono text-xs text-accent hover:underline flex items-center gap-1 self-start md:self-auto"
            >
              RUN CUSTOM QUERY IN APP &rarr;
            </Link>
          </div>

          {/* Mission Selector Tabs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {MISSIONS.map((m) => {
              const isSelected = activeMission.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMission(m);
                    setActiveTelemetryCoord(m.coordinates);
                  }}
                  className={`p-3 text-left border rounded transition-all font-mono ${
                    isSelected
                      ? 'bg-panel-raised border-accent text-text-primary shadow-[0_0_15px_rgba(61,219,217,0.15)]'
                      : 'bg-panel border-subtle text-text-secondary hover:border-text-secondary/40 hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-accent font-semibold">{m.code}</span>
                    <span className="text-[10px] text-text-secondary">{m.sensor.split(' ')[0]}</span>
                  </div>
                  <div className="text-xs font-sans font-medium line-clamp-1">{m.name}</div>
                </button>
              );
            })}
          </div>

          {/* Mission Console Card */}
          <div className="bg-panel border border-subtle rounded-DEFAULT p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Mission Specs & Interactive Split View */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Mission Header */}
              <div className="border-b border-subtle pb-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-secondary mb-1">
                  <span>TARGET: <span className="text-text-primary">{activeMission.target}</span></span>
                  <span className="text-accent font-mono">{activeMission.coordinates}</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary">{activeMission.name}</h3>
                <div className="text-xs text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>PAYLOAD: <strong className="text-text-primary">{activeMission.sensor}</strong></span>
                  <span>GSD: <strong className="text-text-primary">{activeMission.resolution}</strong></span>
                  <span>TEMPORAL: <strong className="text-text-primary">{activeMission.dateRange}</strong></span>
                </div>
              </div>

              {/* Natural Language Query Prompt */}
              <div className="bg-primary p-3 border border-subtle rounded text-xs">
                <span className="text-[10px] font-mono text-accent uppercase tracking-wider block mb-1">
                  USER QUERY SUBMITTED:
                </span>
                <p className="font-mono text-text-primary italic">
                  &ldquo;{activeMission.query}&rdquo;
                </p>
              </div>

              {/* Interactive Before / After Simulated Satellite Canvas */}
              <div className="relative h-64 sm:h-72 bg-primary rounded border border-subtle overflow-hidden flex flex-col justify-end">
                {/* Simulated Imagery Layers */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Base Left (T1) */}
                  <div 
                    className="absolute inset-0 bg-[#0e1726] flex items-center justify-center overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <div className="w-full h-full p-4 flex flex-col justify-between text-left">
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-black/60 rounded text-cyan-300 w-fit">
                        {activeMission.beforeLabel}
                      </span>
                      <div className="border border-dashed border-cyan-400/40 p-2 rounded bg-cyan-950/20 max-w-[200px]">
                        <span className="text-[10px] font-mono text-cyan-200 block">BASE RASTER CLUSTER</span>
                        <span className="text-[9px] font-mono text-text-secondary">DN Mean: 0.142 float32</span>
                      </div>
                    </div>
                  </div>

                  {/* Over Right (T2) */}
                  <div 
                    className="absolute inset-0 bg-[#172033] flex items-center justify-center overflow-hidden"
                    style={{ left: `${sliderPos}%`, width: `${100 - sliderPos}%` }}
                  >
                    <div className="w-full h-full p-4 flex flex-col justify-between text-right items-end">
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-black/60 rounded text-accent w-fit">
                        {activeMission.afterLabel}
                      </span>
                      <div className="border border-accent p-2 rounded bg-accent/10 max-w-[200px] text-left">
                        <span className="text-[10px] font-mono text-accent font-bold block">
                          DETECTED POLYGON [{activeMission.technicalProof.postgisId}]
                        </span>
                        <span className="text-[9px] font-mono text-text-primary">
                          Conf: {(activeMission.technicalProof.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Draggable Divider */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-accent cursor-ew-resize z-20 flex items-center justify-center"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-accent text-primary flex items-center justify-center text-[10px] font-bold shadow-lg">
                      ⇄
                    </div>
                  </div>
                </div>

                {/* Slider Control Bar */}
                <div className="relative z-30 p-2.5 bg-panel/90 backdrop-blur border-t border-subtle flex items-center gap-3">
                  <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">SPLIT SLIDER:</span>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-accent">{sliderPos}%</span>
                </div>
              </div>

              {/* The "Why LLMs Fail Here" alert */}
              <div className="p-3 bg-panel-raised border-l-2 border-warning text-xs rounded">
                <span className="text-warning font-mono font-bold block mb-0.5">THE RAW VLM FAILURE MODE:</span>
                <p className="text-text-secondary">{activeMission.problem}</p>
              </div>
            </div>

            {/* Right Col: The Dual-Register Output & Formal Proof */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <h4 className="text-sm font-mono font-bold text-accent uppercase tracking-wider">
                  DUAL-REGISTER NEURO-SYMBOLIC PROOF
                </h4>
                <span className="px-2 py-0.5 bg-success/10 border border-success/30 text-success text-[10px] font-mono font-bold rounded">
                  {activeMission.technicalProof.verificationStatus}
                </span>
              </div>

              {/* Register 1: Plain Language Intelligence Brief */}
              <div className="bg-panel-raised p-4 border border-subtle rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase text-accent font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    REGISTER 1: PLAIN-LANGUAGE INTELLIGENCE BRIEF
                  </span>
                  <span className="text-[10px] font-mono text-text-secondary">DECISION-MAKER READY</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">
                  {activeMission.plainAnswer}
                </p>
              </div>

              {/* Register 2: Formal Mathematical & PostGIS Proof Matrix */}
              <div className="bg-panel-raised p-4 border border-subtle rounded font-mono text-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase text-accent font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                    REGISTER 2: FORMAL MATHEMATICAL PROOF TREE
                  </span>
                  <span className="text-[10px] text-text-secondary">DETERMINISTIC</span>
                </div>

                <div className="bg-primary p-2.5 rounded border border-subtle space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">ALGEBRAIC FORMULA:</span>
                    <span className="text-accent font-semibold text-right">{activeMission.technicalProof.formula}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">QUANTIFIED MEASUREMENT:</span>
                    <span className="text-success font-semibold text-right">{activeMission.technicalProof.measurement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">POSTGIS SPATIAL REF:</span>
                    <span className="text-text-primary text-right">{activeMission.technicalProof.postgisId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">STATISTICAL CONFIDENCE:</span>
                    <span className="text-accent font-semibold text-right">
                      {(activeMission.technicalProof.confidence * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Execution Trace Steps */}
                <div>
                  <span className="text-[10px] uppercase text-text-secondary block mb-1">
                    EXECUTION DAG STEPS (ZERO NEURAL GUESSWORK):
                  </span>
                  <ul className="space-y-1 text-[11px] text-text-secondary">
                    {activeMission.executionSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-accent font-bold">[{idx + 1}]</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Direct Action */}
              <div className="mt-auto pt-2 flex items-center justify-between">
                <span className="text-xs text-text-secondary font-mono">
                  Ready to test with your own satellite rasters?
                </span>
                <Link
                  href="/query"
                  className="px-4 py-2 bg-accent text-primary font-mono text-xs font-bold rounded hover:opacity-90 transition-opacity"
                >
                  OPEN IN QUICK QUERY &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE ANTI-HALLUCINATION ARCHITECTURE BREAKDOWN */}
      <section className="py-16 border-b border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="font-mono text-xs text-accent px-2 py-0.5 bg-accent/10 border border-accent/30 rounded uppercase">
              NEURO-SYMBOLIC ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-4">
              How SatQuery AI Eliminates Hallucinations
            </h2>
            <p className="text-text-secondary text-sm sm:text-base">
              Pure multimodal LLMs are statistical token predictors. SatQuery AI strictly confines the neural network to a 
              declarative planning role, delegating all spatial calculations to PostGIS and raw C-optimized raster math.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-panel border border-subtle rounded-DEFAULT p-6 relative">
              <div className="w-8 h-8 rounded bg-accent/10 border border-accent/40 text-accent font-mono font-bold flex items-center justify-center text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2 font-mono">
                VLM Directed Acyclic Graph (DAG)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                The planner decomposes natural language into a strict Pydantic execution graph. It selects models and scientific tools dynamically based on sensor availability, spatial resolution, and band configs.
              </p>
              <div className="bg-primary p-2.5 rounded border border-subtle text-[11px] font-mono text-accent">
                Schema: DAG[InputProfile, Tools]
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-panel border border-accent/40 rounded-DEFAULT p-6 relative shadow-[0_0_20px_rgba(61,219,217,0.08)]">
              <div className="w-8 h-8 rounded bg-accent text-primary font-mono font-bold flex items-center justify-center text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-accent mb-2 font-mono">
                Deterministic Scientific Tools
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                All measurements execute in strict mathematical code (NumPy, Rasterio). Formulas for NDVI, NDWI, and SAR cross-polarization never pass through neural approximation—guaranteeing 100% precision.
              </p>
              <div className="bg-primary p-2.5 rounded border border-subtle text-[11px] font-mono text-text-primary">
                float32 Array Algebra (Zero Drift)
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-panel border border-subtle rounded-DEFAULT p-6 relative">
              <div className="w-8 h-8 rounded bg-accent/10 border border-accent/40 text-accent font-mono font-bold flex items-center justify-center text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2 font-mono">
                PostGIS Spatial Verification
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-3">
                Extracted vector polygons are projected into verified spatial coordinate reference systems (EPSG:4326/UTM). Geometric overlaps, intersections, and area metrics are validated in PostGIS.
              </p>
              <div className="bg-primary p-2.5 rounded border border-subtle text-[11px] font-mono text-success">
                ST_Contains, ST_Area, EPSG-Safe
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE MULTI-SPECTRAL BAND ANALYZER */}
      <section className="py-16 border-b border-subtle bg-panel/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <span className="font-mono text-xs text-accent uppercase tracking-widest">
              SENSOR CAPABILITIES // SPECTRAL BAND MATRIX
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Multi-Spectral & Polarimetric Radar Indexing
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              SatQuery AI ingests raw electromagnetic reflectance across optical, infrared, and microwave spectrums. Click any band to see its role in automated reasoning.
            </p>
          </div>

          {/* Band Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SPECTRAL_BANDS.map((b) => (
              <button
                key={b.code}
                onClick={() => setSelectedBand(b)}
                className={`px-3 py-2 rounded text-xs font-mono transition-all flex items-center gap-2 border ${
                  selectedBand.code === b.code
                    ? 'bg-panel-raised border-accent text-text-primary shadow-sm'
                    : 'bg-panel border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }}></span>
                <span className="font-bold">{b.code}</span>
                <span className="text-[10px] text-text-secondary hidden sm:inline">({b.nm})</span>
              </button>
            ))}
          </div>

          {/* Selected Band Inspector Card */}
          <div className="bg-panel border border-subtle rounded-DEFAULT p-5 lg:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
                <span>SPECTRAL CHANNEL:</span>
                <span className="text-accent font-bold">{selectedBand.code}</span>
              </div>
              <h4 className="text-xl font-bold text-text-primary">{selectedBand.name} Wavelength</h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                {selectedBand.role}
              </p>
            </div>

            <div className="bg-primary p-4 rounded border border-subtle font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">CENTER WAVELENGTH:</span>
                <span className="text-text-primary">{selectedBand.nm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">GROUND RESOLUTION:</span>
                <span className="text-accent">{selectedBand.gsd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">DOMAIN SHIFT LIMIT:</span>
                <span className="text-success">&lt;5x Scale Factor</span>
              </div>
            </div>

            <div className="bg-panel-raised p-4 rounded border border-subtle flex flex-col justify-between h-full">
              <span className="text-[10px] font-mono uppercase text-accent">MATHEMATICAL FORMULAS LEVERAGING THIS BAND:</span>
              <p className="text-xs font-mono text-text-primary my-2">
                {selectedBand.code === 'B04' || selectedBand.code === 'B08' ? 'NDVI = (B08 - B04) / (B08 + B04)' : ''}
                {selectedBand.code === 'B03' || selectedBand.code === 'B11' ? 'MNDWI = (B03 - B11) / (B03 + B11)' : ''}
                {selectedBand.code === 'B12' ? 'NBR = (B08 - B12) / (B08 + B12)' : ''}
                {selectedBand.code === 'C-SAR' ? 'Ratio = σ°_VV / σ°_VH (Linear float)' : ''}
                {selectedBand.code === 'B02' ? 'Enhanced Water Index & Shadow Correction' : ''}
              </p>
              <Link
                href="/query"
                className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
              >
                Compute index on your image &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE DEVELOPER TERMINAL / API PREVIEW */}
      <section className="py-16 border-b border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-xs text-accent uppercase tracking-widest">
                INTELLIGENCE API // MULTI-MODAL PIPELINE
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Command-Line Precision or HTTP REST Integration
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Whether deploying in an automated processing chain or querying from desktop GIS software, SatQuery AI provides robust API interfaces with full trace execution logs.
              </p>

              <div className="pt-2 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-success font-bold">✓</span> Async polling with WebSocket support
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-success font-bold">✓</span> GeoJSON and GeoTIFF output formats
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="text-success font-bold">✓</span> Pydantic input/output contracts with zero runtime surprises
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/query"
                  className="px-5 py-2.5 bg-panel border border-accent text-accent hover:bg-accent hover:text-primary font-mono text-xs font-bold rounded transition-colors inline-block"
                >
                  EXPERIMENT WITH WEB GUI &rarr;
                </Link>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="lg:col-span-7 bg-[#07090D] border border-subtle rounded-DEFAULT overflow-hidden shadow-2xl font-mono text-xs">
              {/* Window Header */}
              <div className="bg-[#0e121a] px-4 py-2.5 border-b border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                  <span className="ml-2 text-[11px] text-text-secondary">satquery-ops-terminal</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTerminalTab('cli')}
                    className={`px-2 py-0.5 rounded text-[10px] ${terminalTab === 'cli' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'}`}
                  >
                    CLI
                  </button>
                  <button 
                    onClick={() => setTerminalTab('python')}
                    className={`px-2 py-0.5 rounded text-[10px] ${terminalTab === 'python' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'}`}
                  >
                    Python SDK
                  </button>
                  <button 
                    onClick={() => setTerminalTab('curl')}
                    className={`px-2 py-0.5 rounded text-[10px] ${terminalTab === 'curl' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'}`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 text-text-primary space-y-3 leading-relaxed overflow-x-auto">
                {terminalTab === 'cli' && (
                  <>
                    <div className="text-text-secondary">
                      {"# Ingest Sentinel-2 L2A raster and submit analytical query"}
                    </div>
                    <div>
                      <span className="text-accent">$</span>{" satquery query \\\n  --image-id \"S2B_MSIL2A_20240214_T36UXP\" \\\n  --prompt \"Calculate water loss in Lake Mead reservoir\" \\\n  --mode strict-neuro-symbolic"}
                    </div>
                    <div className="text-text-secondary pt-2">
                      {"[+] Plan generated: DAG [mndwi_calc, threshold_otsu, postgis_st_area]"}<br />
                      {"[+] Tool execution time: 142ms"}<br />
                      {"[+] Area Delta: -48.36 km² verified (EPSG:32611)"}<br />
                      <span className="text-success font-bold">{"[✓] Run completed. Report saved to report_run_4419.pdf"}</span>
                    </div>
                  </>
                )}

                {terminalTab === 'python' && (
                  <>
                    <div className="text-text-secondary">{"# Python SDK Automated Pipeline Integration"}</div>
                    <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap">
                      <span className="text-purple-400">from</span> satquery <span className="text-purple-400">import</span> Client, QueryConfig{"\n\n"}
                      client = Client(api_key=<span className="text-accent">&quot;sq_live_89f02c&quot;</span>){"\n"}
                      result = client.run({"\n"}
                      &nbsp;&nbsp;images=[<span className="text-accent">&quot;img_s2_t1.tif&quot;</span>, <span className="text-accent">&quot;img_s2_t2.tif&quot;</span>],{"\n"}
                      &nbsp;&nbsp;query=<span className="text-accent">&quot;Detect forest fire burn severity index&quot;</span>,{"\n"}
                      &nbsp;&nbsp;config=QueryConfig(verify_domain_shift=<span className="text-yellow-400">True</span>){"\n"}
                      ){"\n\n"}
                      <span className="text-text-secondary">{"# Returns Dual-Register structured payload"}</span>{"\n"}
                      <span className="text-purple-400">print</span>(result.plain_language){"\n"}
                      <span className="text-purple-400">print</span>(result.proof_matrix.postgis_geometries)
                    </pre>
                  </>
                )}

                {terminalTab === 'curl' && (
                  <>
                    <div className="text-text-secondary">{"# Direct HTTP API Request"}</div>
                    <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap">
                      <span className="text-accent">curl</span> -X POST https://api.satquery.ai/v1/query \{"\n"}
                      &nbsp;&nbsp;-H <span className="text-accent">&quot;Content-Type: application/json&quot;</span> \{"\n"}
                      &nbsp;&nbsp;-d &apos;&#123;&quot;query&quot;: &quot;Find all commercial vessels in target AOI&quot;, &quot;image_ids&quot;: [&quot;img_sar_01&quot;, &quot;img_sar_02&quot;]&#125;&apos;
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER CALL-TO-ACTION & CONSTELLATION HEALTH */}
      <footer className="bg-panel border-t border-subtle py-12 text-xs font-mono text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Main Footer Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-primary border border-subtle rounded-DEFAULT">
            <div>
              <h3 className="text-base font-bold text-text-primary font-sans mb-1">
                Launch Mission Operations
              </h3>
              <p className="text-text-secondary">
                Execute dual-register geospatial analysis with zero hallucination guarantee.
              </p>
            </div>
            <Link
              href="/query"
              className="px-6 py-3 bg-accent text-primary font-bold rounded hover:opacity-90 transition-opacity font-mono whitespace-nowrap"
            >
              LAUNCH QUICK QUERY &rarr;
            </Link>
          </div>

          {/* Satellite Feeds Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] pt-4 border-t border-subtle">
            <div>
              <span className="text-text-secondary block">COPERNICUS SENTINEL-1/2:</span>
              <span className="text-success font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> STAC API ACTIVE
              </span>
            </div>
            <div>
              <span className="text-text-secondary block">USGS LANDSAT-8/9:</span>
              <span className="text-success font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span> NOMINAL
              </span>
            </div>
            <div>
              <span className="text-text-secondary block">POSTGIS TOPOLOGY ENGINE:</span>
              <span className="text-accent font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> EPSG:4326 CLUSTER (4ms)
              </span>
            </div>
            <div>
              <span className="text-text-secondary block">NEURO-SYMBOLIC POLICY:</span>
              <span className="text-text-primary font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span> 0.5 PENALTY CAP ACTIVE
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-subtle gap-4 text-[11px]">
            <div>
              SATQUERY AI // EARTH OBSERVATION NEURO-SYMBOLIC COMPUTING
            </div>
            <div className="flex items-center gap-6">
              <Link href="/query" className="hover:text-text-primary transition-colors">Quick Query</Link>
              <Link href="/benchmark" className="hover:text-text-primary transition-colors">Benchmarks</Link>
              <Link href="/history" className="hover:text-text-primary transition-colors">Run History</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
