import uuid
from datetime import datetime
from typing import Dict, Any
from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field

class Image(SQLModel, table=True):
    __tablename__ = "images"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    filename: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class InputProfileModel(SQLModel, table=True):
    __tablename__ = "input_profiles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    image_id: uuid.UUID = Field(foreign_key="images.id")
    profile_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExecutionPlanModel(SQLModel, table=True):
    __tablename__ = "execution_plans"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    plan_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExecutionTrace(SQLModel, table=True):
    __tablename__ = "execution_traces"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    plan_id: uuid.UUID = Field(foreign_key="execution_plans.id")
    trace_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EvidencePackageModel(SQLModel, table=True):
    __tablename__ = "evidence_packages"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: str = Field(index=True)
    package_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Answer(SQLModel, table=True):
    __tablename__ = "answers"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: str = Field(index=True)
    answer_text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Ensure the Postgres connection setup enables the PostGIS extension:
# `CREATE EXTENSION IF NOT EXISTS postgis;`
# (Run this manually when provisioning the database)

from geoalchemy2 import Geometry

class Region(SQLModel, table=True):
    __tablename__ = "regions"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: str = Field(index=True)
    geometry: Any = Field(sa_column=Column(Geometry('POLYGON', srid=4326)))
    class_label: str
    source_mask_ref: str

from enum import Enum
from typing import Optional

class NodeType(str, Enum):
    claim = "claim"
    measurement = "measurement"
    region = "region"
    mask = "mask"
    model = "model"
    input = "input"

class EvidenceNode(SQLModel, table=True):
    __tablename__ = "evidence_nodes"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    run_id: str = Field(index=True)
    node_type: NodeType
    content_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    parent_node_id: Optional[uuid.UUID] = Field(default=None, foreign_key="evidence_nodes.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Experiment(SQLModel, table=True):
    __tablename__ = "experiments"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    parent_run_id: str = Field(index=True) # or foreign key if run is stored
    parameter_overrides_json: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    rerun_stage_from: str
    status: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FeedbackTagEnum(str, Enum):
    accepted = "accepted"
    rejected = "rejected"
    needs_review = "needs_review"

class FeedbackTag(SQLModel, table=True):
    __tablename__ = "feedback_tags"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    evidence_node_id: uuid.UUID = Field(foreign_key="evidence_nodes.id")
    tag: FeedbackTagEnum
    reviewer_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

from sqlalchemy.orm import Session
from sqlalchemy import func

def regions_touching_point(session: Session, lon: float, lat: float) -> list[Region]:
    """
    Returns regions that contain the given (lon, lat) point.
    """
    point = f'SRID=4326;POINT({lon} {lat})'
    # ST_Intersects or ST_Contains
    query = session.query(Region).filter(
        func.ST_Intersects(Region.geometry, func.ST_GeomFromEWKT(point))
    )
    return query.all()
