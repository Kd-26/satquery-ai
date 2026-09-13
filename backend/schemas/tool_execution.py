from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ToolNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    tool: str
    version: str = "1.0.0"
    depends_on: list[str] = Field(default_factory=list)
    required: bool = True
    parameters: dict[str, Any] = Field(default_factory=dict)


class ToolGraph(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nodes: list[ToolNode]

    @model_validator(mode="after")
    def validate_dag(self):
        node_ids = [node.id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Tool node IDs must be unique")
        known = set(node_ids)
        visiting: set[str] = set()
        visited: set[str] = set()
        graph = {node.id: node.depends_on for node in self.nodes}
        for node in self.nodes:
            if any(dep not in known for dep in node.depends_on):
                raise ValueError(f"Tool node {node.id} references an unknown dependency")

        def visit(node_id: str):
            if node_id in visiting:
                raise ValueError("Tool graph contains a dependency cycle")
            if node_id in visited:
                return
            visiting.add(node_id)
            for dep in graph[node_id]:
                visit(dep)
            visiting.remove(node_id)
            visited.add(node_id)

        for node_id in node_ids:
            visit(node_id)
        return self


class ToolResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    node_id: str
    tool: str
    status: Literal["success", "failed", "skipped"]
    required: bool
    value: Any = None
    unit: str | None = None
    uncertainty: float | None = None
    crs: str | None = None
    source_images: list[str] = Field(default_factory=list)
    source_bands: list[str] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)
    artifact_ref: str | None = None
    derivation: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    duration_s: float = 0.0
