# SQLAlchemy Models for MzansiBuilds
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Index, Integer, BigInteger
from sqlalchemy.orm import relationship
from database import Base
import enum


def generate_uuid():
    return str(uuid.uuid4())


class ProjectStage(enum.Enum):
    idea = "idea"
    planning = "planning"
    in_progress = "in_progress"
    testing = "testing"
    completed = "completed"


class CollaborationStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class ProjectUpdateType(enum.Enum):
    progress = "progress"
    milestone = "milestone"
    blocker = "blocker"
    learning = "learning"
    release = "release"


class MilestoneStatus(enum.Enum):
    planned = "planned"
    active = "active"
    done = "done"
    dropped = "dropped"


class ProjectType(enum.Enum):
    idea = "idea"
    repo_backed = "repo_backed"


class VerificationStatus(enum.Enum):
    verified_owner = "verified_owner"
    verified_contributor = "verified_contributor"
    unverified = "unverified"
    disconnected = "disconnected"


class OwnershipType(enum.Enum):
    owner = "owner"
    contributor = "contributor"
    external = "external"
    none = "none"


class ConnectedProvider(enum.Enum):
    github = "github"


class RepoProvider(enum.Enum):
    github = "github"


class RepoSyncStatus(enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class ContributorRole(enum.Enum):
    owner = "owner"
    maintainer = "maintainer"
    collaborator = "collaborator"
    contributor = "contributor"


class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    name = Column(String(255), nullable=True)
    username = Column(String(50), nullable=True, unique=True, index=True)
    role = Column(String(50), default="user")
    auth_provider = Column(String(50), default="email")  # email or google
    google_id = Column(String(255), nullable=True, unique=True)
    picture = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    collaboration_requests = relationship("CollaborationRequest", back_populates="requester", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    connected_accounts = relationship("ConnectedAccount", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="sessions")


class Profile(Base):
    __tablename__ = 'profiles'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)  # JSON string array
    headline = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    github_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="profile")


class Project(Base):
    __tablename__ = 'projects'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tech_stack = Column(Text, nullable=True)  # JSON string array
    stage = Column(SQLEnum(ProjectStage), default=ProjectStage.idea, nullable=False, index=True)
    support_needed = Column(Text, nullable=True)
    short_pitch = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)
    category = Column(String(120), nullable=True)
    tags_json = Column(Text, nullable=True)
    looking_for_help = Column(Boolean, default=False)
    roles_needed_json = Column(Text, nullable=True)
    demo_url = Column(String(500), nullable=True)
    problem_statement = Column(Text, nullable=True)
    roadmap_summary = Column(Text, nullable=True)
    import_provenance_json = Column(Text, nullable=True)
    project_type = Column(SQLEnum(ProjectType), default=ProjectType.idea, nullable=False)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.unverified, nullable=False)
    ownership_type = Column(SQLEnum(OwnershipType), default=OwnershipType.none, nullable=False)
    repo_connected = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="projects")
    updates = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan", order_by="desc(ProjectUpdate.created_at)")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="project", cascade="all, delete-orphan")
    collaboration_requests = relationship("CollaborationRequest", back_populates="project", cascade="all, delete-orphan")
    repository = relationship("ProjectRepository", back_populates="project", uselist=False, cascade="all, delete-orphan")
    repo_contributors = relationship("ProjectContributor", back_populates="project", cascade="all, delete-orphan")
    commits = relationship("ProjectCommit", back_populates="project", cascade="all, delete-orphan")


class ProjectUpdate(Base):
    __tablename__ = 'project_updates'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    author_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    update_type = Column(SQLEnum(ProjectUpdateType), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="updates")
    author = relationship("User", foreign_keys=[author_user_id])

    __table_args__ = (
        Index('idx_project_updates_created_at_desc', created_at.desc()),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(64), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="notifications")
    project = relationship("Project", foreign_keys=[project_id])

    __table_args__ = (Index("idx_notifications_user_created", "user_id", "created_at"),)


class Milestone(Base):
    __tablename__ = 'milestones'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(MilestoneStatus), default=MilestoneStatus.planned, nullable=False, index=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="milestones")


class Comment(Base):
    __tablename__ = 'comments'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="comments")
    user = relationship("User", back_populates="comments")


class CollaborationRequest(Base):
    __tablename__ = 'collaboration_requests'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    requester_user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(SQLEnum(CollaborationStatus), default=CollaborationStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="collaboration_requests")
    requester = relationship("User", back_populates="collaboration_requests")
    
    __table_args__ = (
        Index('idx_collab_project_requester', 'project_id', 'requester_user_id', unique=True),
    )


class LoginAttempt(Base):
    __tablename__ = 'login_attempts'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    identifier = Column(String(255), nullable=False, index=True)  # ip:email
    attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(SQLEnum(ConnectedProvider), nullable=False)
    provider_account_id = Column(BigInteger, nullable=False, index=True)
    provider_username = Column(String(255), nullable=False)
    provider_display_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    access_token_encrypted = Column(Text, nullable=False)
    token_scopes = Column(Text, nullable=True)
    connected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="connected_accounts")

    __table_args__ = (
        Index("idx_connected_accounts_provider_pid", "provider", "provider_account_id", unique=True),
    )


class ProjectRepository(Base):
    __tablename__ = "project_repositories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    provider = Column(SQLEnum(RepoProvider), nullable=False)
    github_repo_id = Column(BigInteger, nullable=False)
    repo_name = Column(String(255), nullable=False)
    repo_full_name = Column(String(255), nullable=False, index=True)
    repo_url = Column(Text, nullable=False)
    owner_login = Column(String(255), nullable=False)
    owner_id = Column(BigInteger, nullable=False)
    default_branch = Column(String(255), nullable=True)
    visibility = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    homepage_url = Column(Text, nullable=True)
    stars_count = Column(Integer, default=0)
    forks_count = Column(Integer, default=0)
    watchers_count = Column(Integer, default=0)
    open_issues_count = Column(Integer, default=0)
    language_primary = Column(String(100), nullable=True)
    readme_preview = Column(Text, nullable=True)
    detected_frameworks_json = Column(Text, nullable=True)
    important_files_json = Column(Text, nullable=True)
    repo_created_at = Column(DateTime(timezone=True), nullable=True)
    repo_updated_at = Column(DateTime(timezone=True), nullable=True)
    repo_pushed_at = Column(DateTime(timezone=True), nullable=True)
    last_commit_date = Column(DateTime(timezone=True), nullable=True)
    contributors_count = Column(Integer, default=0)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(SQLEnum(RepoSyncStatus), default=RepoSyncStatus.queued, nullable=False)
    sync_error = Column(Text, nullable=True)

    project = relationship("Project", back_populates="repository")
    languages = relationship("ProjectLanguage", back_populates="project_repository", cascade="all, delete-orphan")
    snapshots = relationship("ProjectRepoSnapshot", back_populates="project_repository", cascade="all, delete-orphan")
    file_highlights = relationship("ProjectFileHighlight", back_populates="project_repository", cascade="all, delete-orphan")
    commits = relationship("ProjectCommit", back_populates="project_repository", cascade="all, delete-orphan")
    sync_jobs = relationship("RepoSyncJob", back_populates="project_repository", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_project_repositories_provider_repo", "provider", "github_repo_id", unique=True),
    )


class ProjectLanguage(Base):
    __tablename__ = "project_languages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_repository_id = Column(String(36), ForeignKey("project_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    language_name = Column(String(100), nullable=False)
    bytes = Column(Integer, default=0)
    percentage = Column(Integer, default=0)

    project_repository = relationship("ProjectRepository", back_populates="languages")


class ProjectRepoSnapshot(Base):
    __tablename__ = "project_repo_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_repository_id = Column(String(36), ForeignKey("project_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    captured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    stars_count = Column(Integer, default=0)
    forks_count = Column(Integer, default=0)
    open_issues_count = Column(Integer, default=0)
    contributors_count = Column(Integer, default=0)
    commits_count = Column(Integer, default=0)
    last_commit_at = Column(DateTime(timezone=True), nullable=True)

    project_repository = relationship("ProjectRepository", back_populates="snapshots")


class ProjectContributor(Base):
    __tablename__ = "project_contributors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    github_user_id = Column(BigInteger, nullable=True)
    github_username = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    role = Column(SQLEnum(ContributorRole), default=ContributorRole.contributor, nullable=False)
    is_verified = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="repo_contributors")


class ProjectCommit(Base):
    __tablename__ = "project_commits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    project_repository_id = Column(String(36), ForeignKey("project_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha = Column(String(64), nullable=False)
    author_github_id = Column(BigInteger, nullable=True)
    author_login = Column(String(255), nullable=True)
    author_name = Column(String(255), nullable=True)
    message_headline = Column(Text, nullable=True)
    message_body = Column(Text, nullable=True)
    committed_at = Column(DateTime(timezone=True), nullable=True)
    commit_url = Column(Text, nullable=True)

    project = relationship("Project", back_populates="commits")
    project_repository = relationship("ProjectRepository", back_populates="commits")

    __table_args__ = (
        Index("idx_project_commits_repo_sha", "project_repository_id", "commit_sha", unique=True),
    )


class ProjectFileHighlight(Base):
    __tablename__ = "project_file_highlights"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_repository_id = Column(String(36), ForeignKey("project_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(Text, nullable=False)
    item_type = Column(String(20), nullable=False)  # file or dir
    is_key_file = Column(Boolean, default=False)
    classification = Column(String(100), nullable=True)

    project_repository = relationship("ProjectRepository", back_populates="file_highlights")


class RepoSyncJob(Base):
    __tablename__ = "repo_sync_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_repository_id = Column(String(36), ForeignKey("project_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    sync_type = Column(String(50), nullable=False)
    status = Column(SQLEnum(RepoSyncStatus), default=RepoSyncStatus.queued, nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    project_repository = relationship("ProjectRepository", back_populates="sync_jobs")


class OAuthState(Base):
    __tablename__ = "oauth_states"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    state_hash = Column(String(128), nullable=False, unique=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(SQLEnum(ConnectedProvider), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True, index=True)
