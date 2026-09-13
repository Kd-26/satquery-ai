from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from backend.db.session import get_session
from backend.controller.evidence_graph import get_node_lineage

router = APIRouter(prefix="/regions", tags=["regions"])

@router.get("/{region_id}/metrics")
async def get_region_metrics(
    region_id: str,
    session: AsyncSession = Depends(get_session),
) -> Dict[str, Any]:
    """
    Fetches the region's metrics by querying the node lineage and pulling measurement/model nodes.
    """
    try:
        lineage = await get_node_lineage(session, region_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Evidence database is unavailable") from exc
    if not lineage:
        raise HTTPException(status_code=404, detail="Region evidence was not found")

    metrics: Dict[str, Any] = {
        "area_hectares": 0.0,
        "confidence": 0.0,
        "cloud_coverage_pct": 0.0,
        "fusion_weight": 1.0,
        "ndvi_mean": None,
        "vh_backscatter": None,
    }

    # Process lineage to extract real metrics if available
    for node in lineage:
        content = node.get("content", {})
        if node.get("type") == "measurement":
            metrics["area_hectares"] = content.get("area_hectares", content.get("value", metrics["area_hectares"]))
            if "confidence" in content:
                metrics["confidence"] = content["confidence"]
        elif node.get("type") == "model":
            if "cloud_coverage_pct" in content:
                metrics["cloud_coverage_pct"] = content["cloud_coverage_pct"]
            if "fusion_weight" in content:
                metrics["fusion_weight"] = content["fusion_weight"]
        elif node.get("type") == "tool":
            if "ndvi_mean" in content:
                metrics["ndvi_mean"] = content["ndvi_mean"]
            if "vh_backscatter" in content:
                metrics["vh_backscatter"] = content["vh_backscatter"]

    return metrics
