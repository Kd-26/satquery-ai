import uuid
from typing import Dict, List
from sqlalchemy.orm import Session
from backend.schemas.evidence_package import EvidencePackage
from backend.db.models import EvidenceNode, NodeType, Region

def build_evidence_graph(session: Session, run_id: str, evidence: EvidencePackage) -> None:
    """
    Builds the full evidence graph for a given run and persists it to the database.
    Chain: claim -> measurement -> region -> mask -> model -> inputs
    """
    for claim in evidence.claims:
        # 1. Claim Node (root)
        claim_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.claim,
            content_json={"claim_text": claim.claim, "confidence": claim.confidence}
        )
        session.add(claim_node)
        session.flush() # flush to get id
        
        # 2. Measurement Node
        meas_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.measurement,
            content_json={"value": claim.measurement, "tool": claim.tool},
            parent_node_id=claim_node.id
        )
        session.add(meas_node)
        session.flush()
        
        # 3. Region Node
        region_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.region,
            content_json={"region_id": claim.region_id},
            parent_node_id=meas_node.id
        )
        session.add(region_node)
        session.flush()
        
        # Upsert Region PostGIS row (mocking geometry creation from mask ref)
        # Assuming we just create a placeholder polygon for now if we don't have the real geometry extraction
        poly_geom = 'SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'
        
        # check if region exists
        existing = session.query(Region).filter(Region.id == uuid.UUID(claim.region_id)).first()
        if not existing:
            region_db = Region(
                id=uuid.UUID(claim.region_id),
                run_id=run_id,
                geometry=poly_geom,
                class_label=claim.claim.split(" ")[0], # heuristic
                source_mask_ref=evidence.masks_ref.get(claim.claim, "") if evidence.masks_ref else ""
            )
            session.add(region_db)
        
        # 4. Mask Node
        mask_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.mask,
            content_json={"mask_ref": evidence.masks_ref.get(claim.claim, "") if evidence.masks_ref else ""},
            parent_node_id=region_node.id
        )
        session.add(mask_node)
        session.flush()
        
        # 5. Model Node(s)
        # Assuming one model for simplicity, could link multiple
        for model_id, model_version in evidence.model_versions.items():
            model_node = EvidenceNode(
                run_id=run_id,
                node_type=NodeType.model,
                content_json={"model_id": model_id, "version": model_version},
                parent_node_id=mask_node.id
            )
            session.add(model_node)
            session.flush()
            
            # 6. Input Node(s)
            for img in claim.source_images:
                input_node = EvidenceNode(
                    run_id=run_id,
                    node_type=NodeType.input,
                    content_json={"image_id": img},
                    parent_node_id=model_node.id
                )
                session.add(input_node)
                
    session.commit()

def get_evidence_graph(session: Session, run_id: str) -> Dict[str, Any]:
    """
    Returns a nested JSON traversal of the graph for the frontend's useEvidenceGraph hook.
    """
    nodes = session.query(EvidenceNode).filter(EvidenceNode.run_id == run_id).all()
    
    # Build an adjacency list: parent_id -> list of child nodes
    from collections import defaultdict
    children_map = defaultdict(list)
    roots = []
    
    node_dicts = {}
    for node in nodes:
        nd = {
            "id": str(node.id),
            "type": node.node_type.value,
            "content": node.content_json,
            "children": []
        }
        node_dicts[node.id] = nd
        
    for node in nodes:
        if node.parent_node_id:
            children_map[node.parent_node_id].append(node_dicts[node.id])
        else:
            roots.append(node_dicts[node.id])
            
    # Link children
    for node_id, nd in node_dicts.items():
        nd["children"] = children_map.get(node_id, [])
        
    return {"run_id": run_id, "evidence_graph": roots}
