import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List
from bson import ObjectId
from datetime import date, datetime
from pydantic_core import core_schema


# TASK MODELS

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid objectid')
        return str(v)

    @classmethod
    def __get_pydantic_core_schema__(
            cls, _source_type, _handler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

class Task(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias='_id')
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # high / medium / low
    due_date: Optional[date] = None
    status: str = "pending"  # pending / completed / overdue
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    user_id: Optional[str] = None


    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


class UpdateTask(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    # Backwards compatibility for older clients
    completed: Optional[bool] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


# USERS MODELS

class User(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"  # admin / user

    class Config:
        from_attributes = True
class Login(BaseModel):
    username: str
    password: str
class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None

    class Config:
        from_attributes = True


# ROUTINE + SMART PRODUCTIVITY MODELS

ALLOWED_TASK_CATEGORIES = {"dsa", "backend", "other", "frontend", "system-design"}
ALLOWED_TASK_PRIORITIES = {"low", "medium", "high"}
ALLOWED_DAILY_TASK_STATUSES = {"pending", "completed", "skipped"}


class RoutineTaskTemplate(BaseModel):
    title: str
    category: str = "other"
    time: str
    goal: str
    priority: str = "medium"

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in ALLOWED_TASK_CATEGORIES:
            return "other"
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in ALLOWED_TASK_PRIORITIES:
            return "medium"
        return normalized

    @field_validator("time")
    @classmethod
    def validate_time(cls, value: str) -> str:
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", value):
            raise ValueError("time must be in HH:MM format")
        return value


class RoutineTemplate(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    tasks: List[RoutineTaskTemplate] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


class DailyTask(BaseModel):
    task_id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    category: str = "other"
    time: str
    goal: str
    priority: str = "medium"
    status: str = "pending"
    progress: int = 0
    carried_over: bool = False
    completed_at: Optional[datetime] = None
    reminded_at: Optional[datetime] = None
    email_reminded_at: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in ALLOWED_DAILY_TASK_STATUSES:
            return "pending"
        return normalized

    @field_validator("progress")
    @classmethod
    def validate_progress(cls, value: int) -> int:
        return max(0, min(100, int(value)))


class DailyLog(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    date: date
    tasks: List[DailyTask] = []
    completion_percentage: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


class DailyTaskStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in ALLOWED_DAILY_TASK_STATUSES:
            raise ValueError("status must be one of pending/completed/skipped")
        return normalized


class DailyTaskProgressUpdate(BaseModel):
    progress: int

    @field_validator("progress")
    @classmethod
    def validate_progress(cls, value: int) -> int:
        v = int(value)
        if v < 0 or v > 100:
            raise ValueError("progress must be between 0 and 100")
        return v


class GoalPlan(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: Optional[str] = None
    title: str
    target_date: Optional[date] = None
    milestones: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


class FocusSession(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    task_id: Optional[str] = None
    target_minutes: int = 25
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}


class NaturalLanguageTaskInput(BaseModel):
    text: str


class RoutineSuggestionResponse(BaseModel):
    tasks: List[RoutineTaskTemplate]


class StartFocusSessionRequest(BaseModel):
    task_id: Optional[str] = None
    target_minutes: int = 25


class StopFocusSessionRequest(BaseModel):
    ended_at: Optional[datetime] = None
