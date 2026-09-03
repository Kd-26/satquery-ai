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
