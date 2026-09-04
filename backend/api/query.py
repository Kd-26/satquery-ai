from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from typing import List, Dict, Any

router = APIRouter(tags=["query"])

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
    return {"status": "accepted", "run_id": run_id}


@router.get("/runs/{run_id}")
async def get_run_status(run_id: uuid.UUID):
    """
    Polls the status of a run.
    """
    # Mock behavior
    return {
        "run_id": str(run_id),
        "status": "completed",
        "progress": 100,
        "answer": "Found 14.2 hectares of water.",
        "claims": [
            {"id": "claim_1", "text": "Water area is 14.2 ha", "confidence": 0.88, "evidence_node_ids": ["reg_123"]}
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


@router.get("/runs/{run_id}/report")
async def download_run_report(run_id: uuid.UUID):
    """
    Alias endpoint for downloading the PDF audit report (used by ReportExport component).
    """
    # Redirects or returns mock PDF bytes
    # To keep it simple, we'll return a mock response that the frontend can handle
    return {"status": "mock", "message": f"Generated PDF Audit Report for {run_id}"}
