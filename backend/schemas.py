# Pydantic Schemas for MzansiBuilds
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProjectStageEnum(str, Enum):
    idea = "idea"
    planning = "planning"
    in_progress = "in_progress"
    testing = "testing"
    completed = "completed"


class CollaborationStatusEnum(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


# ========== User Schemas ==========
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    name: Optional[str] = None
    role: str
    auth_provider: str
    picture: Optional[str] = None
    created_at: datetime


class UserWithProfile(UserResponse):
    profile: Optional["ProfileResponse"] = None


# ========== Profile Schemas ==========
class ProfileBase(BaseModel):
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ========== Project Schemas ==========
class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    stage: ProjectStageEnum = ProjectStageEnum.idea
    support_needed: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    stage: Optional[ProjectStageEnum] = None
    support_needed: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    stage: ProjectStageEnum
    support_needed: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProjectWithOwner(ProjectResponse):
    user: Optional[UserResponse] = None


class ProjectDetail(ProjectWithOwner):
    milestones: Optional[List["MilestoneResponse"]] = None
    updates_count: Optional[int] = None
    comments_count: Optional[int] = None


# ========== Project Update Schemas ==========
class ProjectUpdateBase(BaseModel):
    content: str = Field(min_length=1)


class ProjectUpdateCreate(ProjectUpdateBase):
    pass


class ProjectUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    content: str
    created_at: datetime


class ProjectUpdateWithProject(ProjectUpdateResponse):
    project: Optional[ProjectWithOwner] = None


# ========== Milestone Schemas ==========
class MilestoneBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    is_completed: Optional[bool] = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    title: str
    is_completed: bool
    created_at: datetime


# ========== Comment Schemas ==========
class CommentBase(BaseModel):
    content: str = Field(min_length=1)


class CommentCreate(CommentBase):
    pass


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    user_id: str
    content: str
    created_at: datetime


class CommentWithUser(CommentResponse):
    user: Optional[UserResponse] = None


# ========== Collaboration Request Schemas ==========
class CollaborationRequestBase(BaseModel):
    message: Optional[str] = None


class CollaborationRequestCreate(CollaborationRequestBase):
    pass


class CollaborationRequestUpdate(BaseModel):
    status: CollaborationStatusEnum


class CollaborationRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    requester_user_id: str
    message: Optional[str] = None
    status: CollaborationStatusEnum
    created_at: datetime


class CollaborationRequestWithRequester(CollaborationRequestResponse):
    requester: Optional[UserResponse] = None


# ========== Feed Schemas ==========
class FeedItem(BaseModel):
    id: str
    type: str  # "update", "project_created", "project_completed"
    content: str
    project: ProjectWithOwner
    created_at: datetime


class FeedResponse(BaseModel):
    items: List[FeedItem]
    total: int
    limit: int
    offset: int


# ========== Auth Response Schemas ==========
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: UserResponse
    message: str


# ========== Password Reset Schemas ==========
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


# Forward references
UserWithProfile.model_rebuild()
ProjectDetail.model_rebuild()
