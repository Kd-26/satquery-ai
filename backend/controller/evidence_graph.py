import uuid
from typing import Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import defaultdict
from backend.schemas.evidence_package import EvidencePackage
from backend.db.models import EvidenceNode, NodeType, Region

async def build_evidence_graph(session: AsyncSession, run_id: str, evidence: EvidencePackage) -> None:
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
        await session.flush()  # flush to get id

        # 2. Measurement Node
        meas_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.measurement,
            content_json={"value": claim.measurement, "tool": claim.tool},
            parent_node_id=claim_node.id
        )
        session.add(meas_node)
        await session.flush()

        # 3. Region Node
        region_node = EvidenceNode(
            run_id=run_id,
            node_type=NodeType.region,
            content_json={"region_id": claim.region_id},
            parent_node_id=meas_node.id
        )
        session.add(region_node)
        await session.flush()

        # Upsert Region PostGIS row (placeholder polygon until real geometry extraction is wired)
        poly_geom = 'SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'

        result = await session.execute(
            select(Region).where(Region.id == uuid.UUID(claim.region_id))
        )
        existing = result.scalar_one_or_none()
        if not existing:
            region_db = Region(
                id=uuid.UUID(claim.region_id),
                run_id=run_id,
                geometry=poly_geom,
                class_label=claim.claim.split(" ")[0],
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
        await session.flush()

        # 5. Model Node(s)
        for model_id, model_version in evidence.model_versions.items():
            model_node = EvidenceNode(
                run_id=run_id,
                node_type=NodeType.model,
                content_json={"model_id": model_id, "version": model_version},
                parent_node_id=mask_node.id
            )
            session.add(model_node)
            await session.flush()

            # 6. Input Node(s)
            for img in claim.source_images:
                input_node = EvidenceNode(
                    run_id=run_id,
                    node_type=NodeType.input,
                    content_json={"image_id": img},
                    parent_node_id=model_node.id
                )
                session.add(input_node)

    await session.commit()


async def get_evidence_graph(session: AsyncSession, run_id: str) -> Dict[str, Any]:
    """
    Returns a nested JSON traversal of the graph for the frontend's useEvidenceGraph hook.
    """
    result = await session.execute(
        select(EvidenceNode).where(EvidenceNode.run_id == run_id)
    )
    nodes = result.scalars().all()

    children_map: Dict[Any, list] = defaultdict(list)
    roots: list = []
    node_dicts: Dict[Any, dict] = {}

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

    for node_id, nd in node_dicts.items():
        nd["children"] = children_map.get(node_id, [])

    return {"run_id": run_id, "evidence_graph": roots}


async def get_node_lineage(session: AsyncSession, node_id: str) -> List[Dict[str, Any]]:
    """
    Walks parent_node_id up to the root, for a single claim's full evidence chain.
    """
    lineage = []
    result = await session.execute(
        select(EvidenceNode).where(EvidenceNode.id == uuid.UUID(node_id))
    )
    current_node = result.scalar_one_or_none()

    while current_node:
        lineage.append({
            "id": str(current_node.id),
            "type": current_node.node_type.value,
            "content": current_node.content_json
        })
        if current_node.parent_node_id:
            result = await session.execute(
                select(EvidenceNode).where(EvidenceNode.id == current_node.parent_node_id)
            )
            current_node = result.scalar_one_or_none()
        else:
            current_node = None

    lineage.reverse()  # return root -> leaf order
    return lineage
