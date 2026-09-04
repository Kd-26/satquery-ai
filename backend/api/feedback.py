from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from typing import Dict, Any

from backend.db.session import get_session
from backend.db.models import FeedbackTag, FeedbackTagEnum, EvidenceNode

router = APIRouter(tags=["feedback"])

@router.post("/evidence-nodes/{node_id}/feedback")
async def api_submit_feedback(
    node_id: str,
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
):
    """
    Writes to the feedback_tags table tracking Accepted/Rejected/Needs Review state
    for a specific evidence node. This drives the active-learning loop.
    """
    try:
        tag_str = payload.get("tag")
        if not tag_str or tag_str not in [e.value for e in FeedbackTagEnum]:
            raise HTTPException(status_code=400, detail="Invalid tag")

        # Verify node exists
        result = await session.execute(
            select(EvidenceNode).where(EvidenceNode.id == uuid.UUID(node_id))
        )
        node = result.scalar_one_or_none()
        if not node:
            raise HTTPException(status_code=404, detail="Evidence node not found")

        feedback = FeedbackTag(
            evidence_node_id=node.id,
            tag=FeedbackTagEnum(tag_str),
            reviewer_note=payload.get("note", ""),
        )
        session.add(feedback)
        await session.commit()

        return {"status": "success", "tag_id": str(feedback.id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
