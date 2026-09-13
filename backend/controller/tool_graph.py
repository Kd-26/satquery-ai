import re

from backend.schemas.routing_decision import RoutingDecision
from backend.schemas.tool_execution import ToolGraph, ToolNode


def build_tool_graph(route: RoutingDecision) -> ToolGraph:
    """Convert a routed capability list into a validated dependency DAG."""
    nodes = []
    previous: str | None = None
    counts: dict[str, int] = {}
    for tool in route.required_tools:
        base = re.sub(r"[^a-z0-9]+", "_", tool.lower()).strip("_")
        counts[base] = counts.get(base, 0) + 1
        node_id = f"{base}_{counts[base]}"
        nodes.append(ToolNode(
            id=node_id,
            tool=tool,
            depends_on=[previous] if previous else [],
            required=tool not in {"generate_preview", "summarize_raster", "generate_overlay"},
        ))
        previous = node_id
    return ToolGraph(nodes=nodes)
