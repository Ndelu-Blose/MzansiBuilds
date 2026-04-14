# Pydantic Schemas for MzansiBuilds
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import Any, Dict, List, Optional, Literal
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


class ProjectUpdateTypeEnum(str, Enum):
    progress = "progress"
    milestone = "milestone"
    blocker = "blocker"
    learning = "learning"
    release = "release"


class MilestoneStatusEnum(str, Enum):
    planned = "planned"
    active = "active"
    done = "done"
    dropped = "dropped"


class ProjectTypeEnum(str, Enum):
    idea = "idea"
    repo_backed = "repo_backed"


class VerificationStatusEnum(str, Enum):
    verified_owner = "verified_owner"
    verified_contributor = "verified_contributor"
    unverified = "unverified"
    disconnected = "disconnected"


class OwnershipTypeEnum(str, Enum):
    owner = "owner"
    contributor = "contributor"
    external = "external"
    none = "none"


class ProjectReactionTypeEnum(str, Enum):
    applaud = "applaud"
    star = "star"
    inspired = "inspired"


class FeedTabEnum(str, Enum):
    all = "all"
    following = "following"
    my_projects = "my_projects"
    completed = "completed"
    trending = "trending"


class FeedPostTypeEnum(str, Enum):
    update = "update"
    completed = "completed"
    idea = "idea"
    collaboration = "collaboration"


class FeedReactionTypeEnum(str, Enum):
    like = "like"
    applaud = "applaud"
    inspired = "inspired"


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
    username: Optional[str] = None
    role: str
    auth_provider: str
    picture: Optional[str] = None
    builder_score: Optional[int] = None
    builder_score_band: Optional[str] = None
    completed_projects_count: Optional[int] = 0
    receipts_count: Optional[int] = 0
    last_active_at: Optional[datetime] = None
    created_at: datetime


class UserWithProfile(UserResponse):
    profile: Optional["ProfileResponse"] = None


# ========== Profile Schemas ==========
class ProfileBase(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    bio: Optional[str] = None
    headline: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    avatar_url: Optional[str] = None
    builder_score: Optional[int] = None
    builder_score_band: Optional[str] = None
    completed_projects_count: Optional[int] = 0
    receipts_count: Optional[int] = 0
    last_active_at: Optional[datetime] = None
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
    project_type: Optional[ProjectTypeEnum] = ProjectTypeEnum.idea
    verification_status: Optional[VerificationStatusEnum] = VerificationStatusEnum.unverified
    ownership_type: Optional[OwnershipTypeEnum] = OwnershipTypeEnum.none
    repo_connected: Optional[bool] = False
    created_at: datetime
    updated_at: datetime
    import_provenance: Optional[Dict[str, Any]] = None
    bookmark_count: int = 0
    is_bookmarked: bool = False
    health_status: Optional[str] = None
    last_activity_at: Optional[datetime] = None


class ProjectBookmarkResponse(BaseModel):
    project: ProjectResponse
    created_at: datetime


class ProjectBookmarkListResponse(BaseModel):
    items: List[ProjectBookmarkResponse]
    total: int
    limit: int
    offset: int


class MatchedProjectResponse(ProjectResponse):
    match_score: int = 0
    matched_skills: List[str] = Field(default_factory=list)
    roles_needed: List[str] = Field(default_factory=list)


class MatchedProjectListResponse(BaseModel):
    items: List[MatchedProjectResponse]
    total: int
    limit: int
    offset: int


class SuggestedCollaboratorResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    username: Optional[str] = None
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    match_score: int = 0
    matched_skills: List[str] = Field(default_factory=list)
    builder_score: Optional[int] = None
    builder_score_band: Optional[str] = None
    completed_projects_count: Optional[int] = 0
    receipts_count: Optional[int] = 0
    last_active_at: Optional[datetime] = None


class ProjectTimelineEventResponse(BaseModel):
    id: str
    type: str
    label: str
    timestamp: Optional[datetime] = None
    actor: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProjectTimelineResponse(BaseModel):
    items: List[ProjectTimelineEventResponse]


class BuilderScoreBreakdown(BaseModel):
    profile_complete: int = 0
    completed_projects: int = 0
    active_projects: int = 0
    milestones: int = 0
    recent_activity: int = 0
    collaboration_quality: int = 0
    stale_penalty: int = 0


class BuilderScoreResponse(BaseModel):
    score: int
    band: str
    breakdown: BuilderScoreBreakdown


class CollaborationReceiptCreate(BaseModel):
    role_title: Optional[str] = None
    summary: Optional[str] = None


class CollaborationReceiptResponse(BaseModel):
    id: str
    project_id: str
    collaboration_id: Optional[str] = None
    owner_user_id: str
    collaborator_user_id: str
    role_title: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    summary: Optional[str] = None
    owner_acknowledged: bool
    collaborator_acknowledged: bool
    created_at: datetime
    project_title: Optional[str] = None


class CollaborationReceiptListResponse(BaseModel):
    items: List[CollaborationReceiptResponse]
    total: int
    limit: int
    offset: int


class OpenRoleItemResponse(ProjectResponse):
    roles_needed: List[str] = Field(default_factory=list)
    owner_score_band: Optional[str] = None
    owner_score: Optional[int] = None


class OpenRoleListResponse(BaseModel):
    items: List[OpenRoleItemResponse]
    total: int
    limit: int
    offset: int


class TrendingProjectItemResponse(ProjectResponse):
    momentum_score: int = 0


class TrendingBuilderItemResponse(BaseModel):
    user: UserResponse
    momentum_score: int = 0


class DigestPreferenceUpdate(BaseModel):
    frequency: Optional[Literal["weekly", "biweekly"]] = None
    channels: Optional[List[str]] = None

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, value):
        if value is None:
            return value
        allowed = {"email_digest", "comment_emails"}
        cleaned = [str(v).strip().lower() for v in value if str(v).strip()]
        invalid = [v for v in cleaned if v not in allowed]
        if invalid:
            raise ValueError(f"Invalid channels: {', '.join(sorted(set(invalid)))}")
        return list(dict.fromkeys(cleaned))


class DigestPreferenceResponse(BaseModel):
    user_id: str
    frequency: Literal["weekly", "biweekly"]
    channels: List[str]


class WeeklyDigestPreviewResponse(BaseModel):
    active_projects: List[ProjectResponse]
    open_roles: List[OpenRoleItemResponse]
    trending_builders: List[TrendingBuilderItemResponse]
    milestone_highlights: List[Dict[str, Any]]


class ActivationChecklistItemResponse(BaseModel):
    id: str
    title: str
    description: str
    action_path: Optional[str] = None
    priority: int = 0
    category: str


class ActivationChecklistResponse(BaseModel):
    profile_items: List[ActivationChecklistItemResponse]
    owner_items: List[ActivationChecklistItemResponse]
    top_items: List[ActivationChecklistItemResponse]


class DashboardActivationStateResponse(BaseModel):
    has_projects: bool
    has_matches: bool
    has_activity: bool
    skills_count: int = 0
    first_match_count: int = 0


class ProjectShareCardResponse(BaseModel):
    project_id: str
    title: str
    stage: Optional[ProjectStageEnum] = None
    health_status: Optional[str] = None
    roles_needed: List[str] = Field(default_factory=list)
    owner_name: Optional[str] = None
    owner_score_band: Optional[str] = None
    last_activity_at: Optional[datetime] = None
    share_url: str


class ProfileShareCardResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    username: Optional[str] = None
    headline: Optional[str] = None
    top_skills: List[str] = Field(default_factory=list)
    builder_score_band: Optional[str] = None
    completed_projects_count: int = 0
    receipts_count: int = 0
    share_url: str


class GitHubConnectStartResponse(BaseModel):
    authorization_url: str
    state: str


class GitHubAccountResponse(BaseModel):
    connected: bool
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    scopes: Optional[str] = None
    connected_at: Optional[datetime] = None


class GitHubRepoSummary(BaseModel):
    github_repo_id: int
    name: str
    full_name: str
    owner_login: str
    owner_id: int
    private: bool
    description: Optional[str] = None
    updated_at: Optional[str] = None
    pushed_at: Optional[str] = None
    language: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    stargazers_count: int = 0
    forks_count: int = 0
    owner_avatar_url: Optional[str] = None
    homepage: Optional[str] = None
    owner_match: Optional[bool] = False
    contributor_match: Optional[bool] = False
    visibility: Optional[str] = None


class GitHubRepoLanguagesResponse(BaseModel):
    languages: Dict[str, int]


class GitHubRepoReadmeSummaryResponse(BaseModel):
    text: Optional[str] = None


class GitHubRepoListResponse(BaseModel):
    items: List[GitHubRepoSummary]
    total: int
    page: int
    per_page: int


class ImportGitHubProjectRequest(BaseModel):
    github_repo_id: int
    title: Optional[str] = None
    stage: ProjectStageEnum = ProjectStageEnum.idea
    short_pitch: Optional[str] = None
    long_description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    looking_for_help: Optional[bool] = False
    roles_needed: Optional[List[str]] = None
    demo_url: Optional[str] = None
    problem_statement: Optional[str] = None
    roadmap_summary: Optional[str] = None


class CreateManualProjectRequest(BaseModel):
    title: str
    short_pitch: Optional[str] = None
    long_description: Optional[str] = None
    stage: ProjectStageEnum = ProjectStageEnum.idea
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    looking_for_help: Optional[bool] = False
    roles_needed: Optional[List[str]] = None
    problem_statement: Optional[str] = None
    roadmap_summary: Optional[str] = None
    optional_repo_url: Optional[str] = None


class ProjectWithOwner(ProjectResponse):
    user: Optional[UserResponse] = None


class ProjectDetail(ProjectWithOwner):
    milestones: Optional[List["MilestoneResponse"]] = None
    updates_count: Optional[int] = None
    comments_count: Optional[int] = None


# ========== Project Update Schemas ==========
class ProjectUpdateBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    update_type: ProjectUpdateTypeEnum


class ProjectUpdateCreate(ProjectUpdateBase):
    pass


class ProjectUpdatePatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    body: Optional[str] = Field(None, min_length=1)
    update_type: Optional[ProjectUpdateTypeEnum] = None


class ProjectUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    author_user_id: str
    title: str
    body: str
    update_type: ProjectUpdateTypeEnum
    created_at: datetime
    updated_at: datetime
    author: Optional[UserResponse] = None


class ProjectUpdateWithProject(ProjectUpdateResponse):
    project: Optional[ProjectWithOwner] = None


# ========== Milestone Schemas ==========
class MilestoneBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    status: MilestoneStatusEnum = MilestoneStatusEnum.planned
    due_date: Optional[datetime] = None


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MilestoneStatusEnum] = None
    due_date: Optional[datetime] = None


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    status: MilestoneStatusEnum
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime


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


# ========== In-app notifications ==========
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    body: str
    project_id: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    limit: int
    offset: int


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


class FeedAuthorSummary(BaseModel):
    id: str
    name: Optional[str] = None
    username: Optional[str] = None
    picture: Optional[str] = None


class FeedProjectSummary(BaseModel):
    id: str
    title: str
    stage: Optional[ProjectStageEnum] = None


class FeedReactionCounts(BaseModel):
    like: int = 0
    applaud: int = 0
    inspired: int = 0


class FeedViewerReactions(BaseModel):
    liked: bool = False
    applauded: bool = False
    inspired: bool = False


class FeedCommentItemResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    content: str
    created_at: datetime
    user: Optional[FeedAuthorSummary] = None


class FeedPostItemResponse(BaseModel):
    id: str
    activity_type: FeedPostTypeEnum = FeedPostTypeEnum.update
    content: str
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: FeedAuthorSummary
    project: Optional[FeedProjectSummary] = None
    reactions: FeedReactionCounts = Field(default_factory=FeedReactionCounts)
    viewer_reactions: FeedViewerReactions = Field(default_factory=FeedViewerReactions)
    comments_count: int = 0
    recent_comments: List[FeedCommentItemResponse] = Field(default_factory=list)


class FeedListResponse(BaseModel):
    items: List[FeedPostItemResponse]
    total: int
    limit: int
    offset: int
    tab: FeedTabEnum = FeedTabEnum.all


class FeedPostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    project_id: Optional[str] = None
    activity_type: FeedPostTypeEnum = FeedPostTypeEnum.update
    tags: List[str] = Field(default_factory=list)


class FeedCommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class FeedReactionUpdateRequest(BaseModel):
    reaction_type: FeedReactionTypeEnum


class FeedReactionUpdateResponse(BaseModel):
    post_id: str
    reactions: FeedReactionCounts
    viewer_reactions: FeedViewerReactions


class CelebrationBuilderSummary(BaseModel):
    id: str
    name: Optional[str] = None
    username: Optional[str] = None
    picture: Optional[str] = None


class CelebrationReactionCounts(BaseModel):
    applaud: int = 0
    star: int = 0
    inspired: int = 0


class CelebrationReactionFlags(BaseModel):
    applauded: bool = False
    starred: bool = False
    inspired: bool = False


class CelebrationProjectItemResponse(ProjectResponse):
    completed_at: Optional[datetime] = None
    builder: Optional[CelebrationBuilderSummary] = None
    collaborators_count: int = 0
    comments_count: int = 0
    reaction_counts: CelebrationReactionCounts = Field(default_factory=CelebrationReactionCounts)
    viewer_reactions: CelebrationReactionFlags = Field(default_factory=CelebrationReactionFlags)


class CelebrationSummaryResponse(BaseModel):
    total_completed: int = 0
    this_week: int = 0
    this_month: int = 0


class CelebrationListResponse(BaseModel):
    items: List[CelebrationProjectItemResponse]
    spotlight: Optional[CelebrationProjectItemResponse] = None
    summary: CelebrationSummaryResponse
    total: int
    limit: int
    offset: int


class ProjectReactionUpdateRequest(BaseModel):
    reaction_type: ProjectReactionTypeEnum


class ProjectReactionUpdateResponse(BaseModel):
    project_id: str
    reaction_counts: CelebrationReactionCounts
    viewer_reactions: CelebrationReactionFlags


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
