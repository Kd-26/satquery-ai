from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import uuid
from typing import Dict, Any

try:
    from backend.db.session import get_session
except ImportError:
    def get_session(): yield None

from backend.db.models import FeedbackTag, FeedbackTagEnum, EvidenceNode

router = APIRouter(tags=["feedback"])

@router.post("/evidence-nodes/{node_id}/feedback")
def api_submit_feedback(node_id: str, payload: Dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    """
    Writes to the feedback_tags table (Phase 15.1) tracking Accepted/Rejected/Needs Review state
    for a specific evidence node. This drives the active-learning loop.
    """
    try:
        tag_str = payload.get("tag")
        if not tag_str or tag_str not in [e.value for e in FeedbackTagEnum]:
            raise HTTPException(status_code=400, detail="Invalid tag")
            
        # Verify node exists
        node = session.query(EvidenceNode).filter(EvidenceNode.id == uuid.UUID(node_id)).first()
        if not node:
            raise HTTPException(status_code=404, detail="Evidence node not found")
            
        feedback = FeedbackTag(
            evidence_node_id=node.id,
            tag=FeedbackTagEnum(tag_str),
            reviewer_note=payload.get("note", "")
        )
        session.add(feedback)
        session.commit()
        
        return {"status": "success", "tag_id": str(feedback.id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
