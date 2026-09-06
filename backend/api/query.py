from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from typing import List, Dict, Any

router = APIRouter(tags=["query"])

# In-memory run -> image_id linkage, so the results workspace (MapCanvas/TiTiler)
# knows which rasters to render for a given run. Not persisted across restarts —
# a real run-state store belongs to the executor/DB work tracked separately.
_RUN_IMAGES: Dict[str, List[str]] = {}

class QueryRequest(BaseModel):
    query: str
    image_ids: List[str]

@router.post("/query")
async def submit_query(request: QueryRequest):
    """
    Submits a natural language query for processing.
    """
    # Mock behavior until execution pipeline is fully wired
    run_id = str(uuid.uuid4())
    _RUN_IMAGES[run_id] = request.image_ids
    return {"status": "accepted", "run_id": run_id}


@router.get("/runs/{run_id}")
async def get_run_status(run_id: uuid.UUID):
    """
    Polls the status of a run.
    """
    # Mock behavior to supply the frontend with rich UI data
    return {
        "run_id": str(run_id),
        "status": "done",
        "progress": 100,
        "image_ids": _RUN_IMAGES.get(str(run_id), []),
        "answer": "Detected 45,000 m² of built-up urban expansion with 92% confidence. Sentinel-2 NDVI spectral index reveals a 31% drop in canopy cover in quadrant NW-4.",
        "answer_obj": {
            "plain_language": "Detected 45,000 m² of built-up urban expansion with 92% confidence. Sentinel-2 NDVI spectral index reveals a 31% drop in canopy cover in quadrant NW-4.",
            "technical": "Execution DAG completed: Tool [ndvi_difference] computed delta on B04/B08 floats. Tool [st_area] calculated geometric polygon projection EPSG:4326 -> EPSG:3857. Confidence penalized by 0.08 due to 20m pixel resolution shift."
        },
        "claims": [
            { "claim": "Built-up surface increase", "measurement": 45000, "region_id": "reg_urban_01", "confidence": 0.92 },
            { "claim": "Vegetation index attenuation", "measurement": -0.31, "region_id": "reg_veg_04", "confidence": 0.94 }
        ],
        "limitations": [
            "Minor resolution domain shift between Sentinel-2 (10m) and verification mask (20m)."
        ],
        "traces": [
            { "step_name": "vlm_dag_planning", "model_or_tool": "VLM Planner (Gemini-Flash)", "parameters": { "prompt_tokens": 1420 }, "execution_time_ms": 840 },
            { "step_name": "spectral_ndvi_calc", "model_or_tool": "scientific_tools.ndvi", "parameters": { "red_band": "B04", "nir_band": "B08" }, "execution_time_ms": 120 },
            { "step_name": "postgis_topology_verify", "model_or_tool": "spatial_tools.st_area", "parameters": { "crs": "EPSG:3857" }, "execution_time_ms": 45 }
        ]
    }


@router.get("/runs/{run_id}/graph")
async def get_run_graph(run_id: uuid.UUID):
    """
    Returns the evidence graph nodes and edges for the run.
    """
    # Mock behavior
    return {
        "nodes": [
            {"id": "reg_123", "type": "region", "label": "Region 1"}
        ],
        "edges": []
    }



