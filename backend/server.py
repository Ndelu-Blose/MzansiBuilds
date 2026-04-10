# MzansiBuilds API Server
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from cachetools import TTLCache
import os
import base64
import logging
import bcrypt
import jwt
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from database import get_db, engine, Base, AsyncSessionLocal
from models import (
    User, Profile, Project, ProjectUpdate, Milestone,
    Comment, CollaborationRequest, UserSession, LoginAttempt,
    ProjectStage, CollaborationStatus, ConnectedAccount, ConnectedProvider,
    ProjectRepository, ProjectLanguage, ProjectCommit, ProjectContributor, ProjectFileHighlight,
    RepoProvider, OwnershipType, VerificationStatus, ProjectType, ProjectUpdateType, MilestoneStatus
)
from schemas import (
    UserCreate, UserLogin, UserResponse, UserWithProfile,
    ProfileCreate, ProfileUpdate, ProfileResponse,
    ProjectCreate, ProjectUpdate as ProjectUpdateSchema, ProjectResponse, 
    ProjectWithOwner, ProjectDetail,
    ProjectUpdateCreate, ProjectUpdateResponse, ProjectUpdateWithProject,
    MilestoneCreate, MilestoneUpdate, MilestoneResponse,
    CommentCreate, CommentResponse, CommentWithUser,
    CollaborationRequestCreate, CollaborationRequestUpdate, 
    CollaborationRequestResponse, CollaborationRequestWithRequester,
    FeedItem, FeedResponse, AuthResponse, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
    ProjectStageEnum, CollaborationStatusEnum, GitHubConnectStartResponse,
    GitHubAccountResponse, GitHubRepoListResponse, ImportGitHubProjectRequest,
    CreateManualProjectRequest
)
from github_oauth_service import (
    build_authorization_url, exchange_code_for_token, fetch_authenticated_profile,
    encrypt_token, decrypt_token,
)
from github_api_service import list_user_repos, get_repo_by_id, get_repo_contributors
from project_import_service import create_imported_project
from project_sync_service import run_repo_sync
from project_activity_service import merge_project_activity
from oauth_state_service import create_oauth_state, consume_oauth_state, cleanup_expired_states
from email_service import (
    send_welcome_email, 
    send_collaboration_request_email,
    send_comment_notification_email,
    send_project_completed_email
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JWT Configuration - Now supports both custom JWT and Supabase JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "fallback-secret-change-me")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def _build_allowed_origins() -> List[str]:
    raw_origins = (os.environ.get("CORS_ALLOW_ORIGINS") or "").strip()
    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]

    frontend_url = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if frontend_url:
        origins.append(frontend_url)

    # Keep local development origins available by default.
    origins.extend(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3010",
            "http://127.0.0.1:3010",
        ]
    )

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(origins))


def _cookies_should_be_secure() -> bool:
    explicit = (os.environ.get("COOKIE_SECURE") or "").strip().lower()
    if explicit in ("1", "true", "yes"):
        return True
    if explicit in ("0", "false", "no"):
        return False

    frontend_url = (os.environ.get("FRONTEND_URL") or "").strip().lower()
    return frontend_url.startswith("https://")


COOKIE_SECURE = _cookies_should_be_secure()
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"
ALLOWED_ORIGINS = _build_allowed_origins()

# Google OAuth session exchange (override via OAUTH_SESSION_DATA_URL in .env)
def _oauth_session_data_url() -> str:
    raw = os.environ.get("OAUTH_SESSION_DATA_URL", "").strip()
    if raw:
        return raw
    return base64.b64decode(
        "aHR0cHM6Ly9kZW1vYmFja2VuZC5lbWVyZ2VudGFnZW50LmNvbS9hdXRoL3YxL2Vudi9vYXV0aC9zZXNzaW9uLWRhdGE="
    ).decode("ascii")
# App setup
app = FastAPI(title="MzansiBuilds API", version="1.0.0")
api_router = APIRouter(prefix="/api")
repo_refresh_tracker: TTLCache = TTLCache(maxsize=10_000, ttl=60)


# ========== Password Utilities ==========
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ========== JWT Utilities ==========
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, 
        "email": email, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), 
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), 
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ========== Auth Dependencies ==========
async def verify_supabase_token(token: str) -> Optional[dict]:
    """Verify Supabase access JWT using SUPABASE_JWT_SECRET (required; no unverified fallback)."""
    if not SUPABASE_JWT_SECRET:
        return None
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="authenticated",
        )
    except jwt.InvalidTokenError:
        return None
    iss = str(payload.get("iss") or "")
    if "supabase" not in iss.lower():
        return None
    if SUPABASE_URL:
        expected_iss = f"{SUPABASE_URL.rstrip('/')}/auth/v1"
        if payload.get("iss") != expected_iss:
            return None
    return payload


async def require_supabase_access_jwt(request: Request) -> dict:
    """Dependency: valid Supabase Bearer JWT; used for /auth/sync so claims cannot be spoofed via JSON."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_JWT_SECRET is not configured",
        )
    payload = await verify_supabase_token(auth_header[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session")
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Token must include an email claim")
    if not payload.get("sub"):
        raise HTTPException(status_code=400, detail="Token must include a subject claim")
    return payload


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # Try Authorization header first (for Supabase tokens)
    auth_header = request.headers.get("Authorization", "")
    token = None
    
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        # Try cookie
        token = request.cookies.get("access_token")
    
    # Try session token (for legacy Google OAuth)
    if not token:
        session_token = request.cookies.get("session_token")
        if session_token:
            result = await db.execute(
                select(UserSession)
                .options(selectinload(UserSession.user))
                .where(UserSession.session_token == session_token)
            )
            session = result.scalar_one_or_none()
            if session:
                expires_at = session.expires_at
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > datetime.now(timezone.utc):
                    return session.user
            raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Try to verify as Supabase token first
    supabase_payload = await verify_supabase_token(token)
    if supabase_payload:
        # Find user by supabase_id or email
        supabase_id = supabase_payload.get("sub")
        email = supabase_payload.get("email")
        
        result = await db.execute(
            select(User).where(
                or_(
                    User.google_id == supabase_id,  # We store supabase_id in google_id field
                    User.email == email
                )
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found. Please sync your account first.")
        
        return user
    
    # Fall back to custom JWT verification
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[User]:
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None


# ========== Helper Functions ==========
def user_to_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "auth_provider": user.auth_provider,
        "picture": user.picture,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


def profile_to_response(profile: Profile, user: Optional[User] = None) -> dict:
    skills = None
    if profile.skills:
        try:
            skills = json.loads(profile.skills)
        except:
            skills = []
    source_user = user or profile.user
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "display_name": source_user.name if source_user else None,
        "username": source_user.username if source_user else None,
        "bio": profile.bio,
        "headline": profile.headline,
        "location": profile.location,
        "skills": skills,
        "github_url": profile.github_url,
        "linkedin_url": profile.linkedin_url,
        "portfolio_url": profile.portfolio_url,
        "avatar_url": profile.avatar_url,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
    }


def normalize_username(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    if not re.fullmatch(r"[a-z0-9_]{3,50}", normalized):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-50 chars and contain only lowercase letters, numbers, or underscores.",
        )
    return normalized


def normalize_profile_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if not (normalized.startswith("http://") or normalized.startswith("https://")):
        raise HTTPException(status_code=422, detail="Profile links must start with http:// or https://")
    return normalized


def project_to_response(project: Project, include_user: bool = False) -> dict:
    tech_stack = None
    if project.tech_stack:
        try:
            tech_stack = json.loads(project.tech_stack)
        except:
            tech_stack = []
    
    response = {
        "id": project.id,
        "user_id": project.user_id,
        "title": project.title,
        "description": project.description,
        "tech_stack": tech_stack,
        "stage": project.stage.value if project.stage else "idea",
        "support_needed": project.support_needed,
        "short_pitch": project.short_pitch,
        "long_description": project.long_description,
        "category": project.category,
        "tags": json.loads(project.tags_json) if project.tags_json else [],
        "looking_for_help": project.looking_for_help,
        "roles_needed": json.loads(project.roles_needed_json) if project.roles_needed_json else [],
        "demo_url": project.demo_url,
        "problem_statement": project.problem_statement,
        "roadmap_summary": project.roadmap_summary,
        "project_type": project.project_type.value if project.project_type else "idea",
        "verification_status": project.verification_status.value if project.verification_status else "unverified",
        "ownership_type": project.ownership_type.value if project.ownership_type else "none",
        "repo_connected": bool(project.repo_connected),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }
    
    if include_user and project.user:
        response["user"] = user_to_response(project.user)
    
    return response


def decrypt_connected_account_token_or_400(account: ConnectedAccount) -> str:
    try:
        return decrypt_token(account.access_token_encrypted)
    except ValueError:
        raise HTTPException(status_code=400, detail="GitHub token is invalid or expired. Please reconnect GitHub.")


def encrypt_connected_account_token_or_503(token: str) -> str:
    try:
        return encrypt_token(token)
    except ValueError:
        raise HTTPException(status_code=503, detail="GITHUB_TOKEN_SECRET is not configured securely")


def project_update_to_response(update: ProjectUpdate) -> dict:
    return {
        "id": update.id,
        "project_id": update.project_id,
        "author_user_id": update.author_user_id,
        "title": update.title,
        "body": update.body,
        "update_type": update.update_type.value if update.update_type else "progress",
        "created_at": update.created_at.isoformat() if update.created_at else None,
        "updated_at": update.updated_at.isoformat() if update.updated_at else None,
    }


def milestone_to_response(milestone: Milestone) -> dict:
    return {
        "id": milestone.id,
        "project_id": milestone.project_id,
        "title": milestone.title,
        "description": milestone.description,
        "status": milestone.status.value if milestone.status else "planned",
        "due_date": milestone.due_date.isoformat() if milestone.due_date else None,
        "completed_at": milestone.completed_at.isoformat() if milestone.completed_at else None,
        "created_by_user_id": milestone.created_by_user_id,
        "created_at": milestone.created_at.isoformat() if milestone.created_at else None,
        "updated_at": milestone.updated_at.isoformat() if milestone.updated_at else None,
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=900,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,
        path="/",
    )


async def get_active_github_account(db: AsyncSession, user_id: str) -> Optional[ConnectedAccount]:
    result = await db.execute(
        select(ConnectedAccount).where(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == ConnectedProvider.github,
            ConnectedAccount.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


# ========== AUTH ENDPOINTS ==========
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    email = data.email.lower().strip()
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=email,
        password_hash=hash_password(data.password),
        name=data.name or email.split("@")[0],
        role="user",
        auth_provider="email"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Create empty profile
    profile = Profile(user_id=user.id)
    db.add(profile)
    await db.commit()
    
    # Generate tokens
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {"user": user_to_response(user), "message": "Registration successful"}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    
    # Check brute force lockout
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.identifier == identifier))
    attempt = result.scalar_one_or_none()
    
    if attempt and attempt.locked_until:
        locked_until = attempt.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Account temporarily locked. Try again later.")
    
    # Find user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        # Record failed attempt
        if attempt:
            attempt.attempts += 1
            if attempt.attempts >= 5:
                attempt.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        else:
            attempt = LoginAttempt(identifier=identifier, attempts=1)
            db.add(attempt)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts on success
    if attempt:
        await db.delete(attempt)
        await db.commit()
    
    # Generate tokens
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {"user": user_to_response(user), "message": "Login successful"}


@api_router.post("/auth/logout")
async def logout(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Delete session token if exists
    await db.execute(
        select(UserSession).where(UserSession.user_id == user.id)
    )
    
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}


@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Load profile
    result = await db.execute(
        select(Profile).where(Profile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    
    response = user_to_response(user)
    if not response.get("picture"):
        github_account = await get_active_github_account(db, user.id)
        if github_account and github_account.avatar_url:
            response["picture"] = github_account.avatar_url
    if profile:
        response["profile"] = profile_to_response(profile)
    return response


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(user.id, user.email)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            max_age=900,
            path="/",
        )
        
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ========== GOOGLE OAUTH ENDPOINTS ==========
@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Exchange session_id from the hosted OAuth bridge for an app user session."""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    session_data_url = _oauth_session_data_url()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                session_data_url,
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    google_id = auth_data.get("id")
    email = auth_data.get("email", "").lower().strip()
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    # Find or create user
    result = await db.execute(select(User).where(or_(User.email == email, User.google_id == google_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            email=email,
            name=name,
            google_id=google_id,
            picture=picture,
            auth_provider="google",
            role="user"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Create empty profile
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.commit()
    else:
        # Update existing user
        if google_id and not user.google_id:
            user.google_id = google_id
        if picture:
            user.picture = picture
        if name and not user.name:
            user.name = name
        await db.commit()
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    user_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at
    )
    db.add(user_session)
    await db.commit()
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,
        path="/"
    )
    
    return {"user": user_to_response(user), "message": "Google login successful"}


# ========== SUPABASE AUTH SYNC ENDPOINT ==========
@api_router.post("/auth/sync")
async def sync_supabase_user(
    request: Request,
    background_tasks: BackgroundTasks,
    claims: dict = Depends(require_supabase_access_jwt),
    db: AsyncSession = Depends(get_db),
):
    """Sync user from Supabase Auth to our database. Identity and auth state come from the verified JWT only."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    supabase_id = claims.get("sub")
    email = (claims.get("email") or "").lower().strip()
    user_meta = claims.get("user_metadata") or {}
    if not isinstance(user_meta, dict):
        user_meta = {}
    app_meta = claims.get("app_metadata") or {}
    if not isinstance(app_meta, dict):
        app_meta = {}

    # Optional profile hints from client (cannot override JWT identity / provider / verification)
    name = body.get("name") or user_meta.get("full_name") or user_meta.get("name")
    picture = body.get("picture") or user_meta.get("avatar_url") or user_meta.get("picture")
    provider = app_meta.get("provider") or "email"
    email_confirmed_at = claims.get("email_confirmed_at")

    if body.get("supabase_id") is not None and body.get("supabase_id") != supabase_id:
        raise HTTPException(status_code=400, detail="supabase_id does not match session")
    if body.get("email") is not None and (body.get("email") or "").lower().strip() != email:
        raise HTTPException(status_code=400, detail="email does not match session")
    
    # Resolve identity deterministically to avoid split-account behavior.
    by_supabase_result = await db.execute(select(User).where(User.google_id == supabase_id))
    user_by_supabase = by_supabase_result.scalar_one_or_none()
    by_email_result = await db.execute(select(User).where(User.email == email))
    user_by_email = by_email_result.scalar_one_or_none()

    # Hard conflict: this Supabase identity points at a different local user than the claimed email.
    if user_by_supabase and user_by_email and user_by_supabase.id != user_by_email.id:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "identity_conflict",
                "message": "This email is already linked to another account.",
                "hint": "Sign in with the original provider for this email account.",
            },
        )

    user = user_by_supabase or user_by_email
    
    is_new_user = False
    if not user:
        # Create new user
        is_new_user = True
        user = User(
            email=email,
            name=name or email.split("@")[0],
            google_id=supabase_id,  # Store supabase_id here
            picture=picture,
            auth_provider=provider,
            role="user"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Create empty profile
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.commit()
        
        logger.info(f"New user created from Supabase: {email}")
    else:
        # Update existing user
        if supabase_id and not user.google_id:
            user.google_id = supabase_id
        elif supabase_id and user.google_id and user.google_id != supabase_id:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "identity_conflict",
                    "message": "This account is linked to a different sign-in identity.",
                    "hint": "Use the same provider you used previously for this email.",
                },
            )
        if email and user.email != email:
            user.email = email
        if picture:
            user.picture = picture
        if name and not user.name:
            user.name = name
        if provider and user.auth_provider == "email":
            user.auth_provider = provider
        await db.commit()
    
    # Product welcome via Resend: only after verified email for password signups; OAuth emails are provider-verified
    if is_new_user:
        p = (provider or "email").lower()
        oauth_provider = p not in ("email",)
        email_verified = bool(email_confirmed_at)
        if oauth_provider or email_verified:
            background_tasks.add_task(send_welcome_email, email, name or email.split("@")[0])

    return {"user": user_to_response(user), "message": "User synced successfully", "is_new": is_new_user}


# ========== GITHUB INTEGRATION ENDPOINTS ==========
@api_router.post("/integrations/github/connect/start", response_model=GitHubConnectStartResponse)
async def github_connect_start(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = build_authorization_url()
    await create_oauth_state(db, data["state"], user.id, ConnectedProvider.github)
    return data


@api_router.get("/integrations/github/callback")
async def github_callback(code: str, state: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    await cleanup_expired_states(db)
    if not state:
        raise HTTPException(status_code=400, detail="Missing OAuth state")
    try:
        oauth_state = await consume_oauth_state(db, state, ConnectedProvider.github)
    except ValueError as exc:
        reason = str(exc)
        if reason == "expired":
            raise HTTPException(status_code=400, detail="OAuth state expired")
        if reason == "reused":
            raise HTTPException(status_code=400, detail="OAuth state already used")
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token = await exchange_code_for_token(code)
    profile = await fetch_authenticated_profile(token)
    encrypted_token = encrypt_connected_account_token_or_503(token)
    provider_account_id = profile.get("id")
    if not provider_account_id:
        raise HTTPException(status_code=400, detail="GitHub profile missing id")

    user_result = await db.execute(select(User).where(User.id == oauth_state.user_id))
    current_user = user_result.scalar_one_or_none()
    if not current_user:
        frontend_url = (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
        return RedirectResponse(url=f"{frontend_url}/dashboard?github_connect=failed", status_code=302)

    linked_result = await db.execute(
        select(ConnectedAccount).where(
            ConnectedAccount.provider == ConnectedProvider.github,
            ConnectedAccount.provider_account_id == provider_account_id,
            ConnectedAccount.is_active.is_(True),
        )
    )
    linked_account = linked_result.scalar_one_or_none()
    if linked_account and linked_account.user_id != current_user.id:
        frontend_url = (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
        return RedirectResponse(url=f"{frontend_url}/dashboard?github_connect=already_linked", status_code=302)

    existing = await get_active_github_account(db, current_user.id)
    if existing:
        existing.provider_account_id = provider_account_id
        existing.provider_username = profile.get("login") or ""
        existing.provider_display_name = profile.get("name")
        existing.avatar_url = profile.get("avatar_url")
        existing.access_token_encrypted = encrypted_token
        existing.last_used_at = datetime.now(timezone.utc)
    else:
        db.add(
            ConnectedAccount(
                user_id=current_user.id,
                provider=ConnectedProvider.github,
                provider_account_id=provider_account_id,
                provider_username=profile.get("login") or "",
                provider_display_name=profile.get("name"),
                avatar_url=profile.get("avatar_url"),
                access_token_encrypted=encrypted_token,
                is_active=True,
            )
        )
    profile_result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    user_profile = profile_result.scalar_one_or_none()
    if profile.get("avatar_url") and (not user_profile or not user_profile.avatar_url):
        current_user.picture = profile.get("avatar_url")
    if (not current_user.name) and (profile.get("name") or profile.get("login")):
        current_user.name = profile.get("name") or profile.get("login")

    # Auto-populate profile links after successful GitHub connect.
    github_login = profile.get("login")
    if user_profile and github_login:
        if not user_profile.github_url:
            user_profile.github_url = f"https://github.com/{github_login}"
        user_profile.updated_at = datetime.now(timezone.utc)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        frontend_url = (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
        return RedirectResponse(url=f"{frontend_url}/dashboard?github_connect=already_linked", status_code=302)
    frontend_url = (os.environ.get("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
    return RedirectResponse(url=f"{frontend_url}/dashboard?github_connect=success", status_code=302)


@api_router.get("/integrations/github/account", response_model=GitHubAccountResponse)
async def github_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await get_active_github_account(db, user.id)
    if not account:
        return {"connected": False}
    return {
        "connected": True,
        "username": account.provider_username,
        "avatar_url": account.avatar_url,
        "scopes": account.token_scopes,
        "connected_at": account.connected_at,
    }


@api_router.delete("/integrations/github/account")
async def github_disconnect(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await get_active_github_account(db, user.id)
    if not account:
        return {"message": "No connected GitHub account"}
    account.is_active = False
    await db.execute(
        select(Project).where(
            Project.user_id == user.id,
            Project.project_type == ProjectType.repo_backed,
        )
    )
    result = await db.execute(select(Project).where(Project.user_id == user.id, Project.repo_connected.is_(True)))
    projects = result.scalars().all()
    for project in projects:
        project.verification_status = VerificationStatus.disconnected
        project.repo_connected = False
    await db.commit()
    return {"message": "GitHub account disconnected"}


@api_router.get("/integrations/github/repos", response_model=GitHubRepoListResponse)
async def github_repos(page: int = 1, per_page: int = 30, search: Optional[str] = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await get_active_github_account(db, user.id)
    if not account:
        raise HTTPException(status_code=400, detail="Connect GitHub first")
    token = decrypt_connected_account_token_or_400(account)
    repos = await list_user_repos(token, page=page, per_page=per_page)
    if search:
        search_lower = search.lower().strip()
        repos = [
            r
            for r in repos
            if search_lower in (r.get("full_name") or "").lower()
            or search_lower in (r.get("description") or "").lower()
            or search_lower in (r.get("language") or "").lower()
        ]
    total = len(repos)
    items = [
        {
            "github_repo_id": r["id"],
            "name": r["name"],
            "full_name": r["full_name"],
            "owner_login": (r.get("owner") or {}).get("login"),
            "owner_id": (r.get("owner") or {}).get("id"),
            "private": r.get("private") or False,
            "description": r.get("description"),
            "updated_at": r.get("updated_at"),
            "pushed_at": r.get("pushed_at"),
            "language": r.get("language"),
            "owner_match": (r.get("owner") or {}).get("id") == account.provider_account_id,
            "contributor_match": not ((r.get("owner") or {}).get("id") == account.provider_account_id),
            "visibility": "private" if r.get("private") else "public",
        }
        for r in repos
    ]
    return {"items": items, "total": total, "page": page, "per_page": per_page}


# ========== PROFILE ENDPOINTS ==========
@api_router.get("/profile")
async def get_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile_to_response(profile, user=user)


@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create profile if doesn't exist
        profile = Profile(user_id=user.id)
        db.add(profile)

    if data.display_name is not None:
        user.name = data.display_name.strip() or None
    if data.username is not None:
        normalized_username = normalize_username(data.username)
        if normalized_username:
            username_result = await db.execute(
                select(User).where(
                    User.username == normalized_username,
                    User.id != user.id,
                )
            )
            if username_result.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="That username is already taken.")
        user.username = normalized_username

    if data.bio is not None:
        profile.bio = data.bio
    if data.headline is not None:
        profile.headline = data.headline
    if data.location is not None:
        profile.location = data.location
    if data.skills is not None:
        profile.skills = json.dumps(data.skills)
    if data.github_url is not None:
        profile.github_url = normalize_profile_url(data.github_url)
    if data.linkedin_url is not None:
        profile.linkedin_url = normalize_profile_url(data.linkedin_url)
    if data.portfolio_url is not None:
        profile.portfolio_url = normalize_profile_url(data.portfolio_url)
    if data.avatar_url is not None:
        profile.avatar_url = data.avatar_url
        user.picture = data.avatar_url or None
    
    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    await db.refresh(user)
    
    return profile_to_response(profile, user=user)


@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's projects with stats
    projects_result = await db.execute(
        select(Project).where(Project.user_id == user_id)
    )
    projects = projects_result.scalars().all()
    
    total_projects = len(projects)
    completed_projects = len([p for p in projects if p.stage == ProjectStage.completed])
    active_projects = len([p for p in projects if p.stage == ProjectStage.in_progress])
    
    response = user_to_response(user)
    if user.profile:
        response["profile"] = profile_to_response(user.profile, user=user)
    
    response["stats"] = {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "active_projects": active_projects
    }
    
    # Add recent projects
    recent_projects = sorted(projects, key=lambda p: p.created_at, reverse=True)[:5]
    response["recent_projects"] = [project_to_response(p) for p in recent_projects]
    
    return response


# ========== PROJECT ENDPOINTS ==========
@api_router.post("/projects/import/github")
async def import_project_from_github(
    data: ImportGitHubProjectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_active_github_account(db, user.id)
    if not account:
        raise HTTPException(status_code=400, detail="Connect GitHub account first")

    token = decrypt_connected_account_token_or_400(account)
    try:
        repo_data = await get_repo_by_id(token, data.github_repo_id)
    except httpx.HTTPStatusError as exc:
        if exc.response is not None and exc.response.status_code in (403, 404):
            raise HTTPException(status_code=403, detail="Selected repository is not accessible for connected account")
        raise
    contributors = await get_repo_contributors(token, repo_data["owner"]["login"], repo_data["name"], limit=100)
    contributor_ids = {c.get("id") for c in contributors if c.get("id")}

    project_payload = {
        "title": data.title,
        "stage": ProjectStage(data.stage.value),
        "short_pitch": data.short_pitch,
        "long_description": data.long_description,
        "category": data.category,
        "tags_json": json.dumps(data.tags or []),
        "looking_for_help": data.looking_for_help,
        "roles_needed_json": json.dumps(data.roles_needed or []),
        "demo_url": data.demo_url,
        "problem_statement": data.problem_statement,
        "roadmap_summary": data.roadmap_summary,
    }
    project, repository = create_imported_project(
        user_id=user.id,
        payload=project_payload,
        repo_data=repo_data,
        contributor_ids=contributor_ids,
        connected_account_id=account.provider_account_id,
    )
    db.add(project)
    await db.flush()
    repository.project_id = project.id
    db.add(repository)
    await db.commit()
    await db.refresh(project)
    await db.refresh(repository)

    await run_repo_sync(db, repository, token)
    return project_to_response(project, include_user=False)


@api_router.post("/projects/manual")
async def create_manual_project(
    data: CreateManualProjectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=user.id,
        title=data.title,
        description=data.long_description,
        short_pitch=data.short_pitch,
        long_description=data.long_description,
        category=data.category,
        stage=ProjectStage(data.stage.value),
        tags_json=json.dumps(data.tags or []),
        looking_for_help=data.looking_for_help or False,
        roles_needed_json=json.dumps(data.roles_needed or []),
        problem_statement=data.problem_statement,
        roadmap_summary=data.roadmap_summary,
        project_type=ProjectType.idea,
        verification_status=VerificationStatus.unverified,
        ownership_type=OwnershipType.external if data.optional_repo_url else OwnershipType.none,
        repo_connected=False,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project_to_response(project, include_user=False)


@api_router.post("/projects")
async def create_project(data: ProjectCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tech_stack = json.dumps(data.tech_stack) if data.tech_stack else None
    
    project = Project(
        user_id=user.id,
        title=data.title,
        description=data.description,
        tech_stack=tech_stack,
        stage=ProjectStage(data.stage.value),
        support_needed=data.support_needed,
        project_type=ProjectType.idea,
        verification_status=VerificationStatus.unverified,
        ownership_type=OwnershipType.none,
        repo_connected=False,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Load user for response
    result = await db.execute(select(Project).options(selectinload(Project.user)).where(Project.id == project.id))
    project = result.scalar_one()
    
    return project_to_response(project, include_user=True)


@api_router.get("/projects")
async def list_projects(
    stage: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    tech: Optional[str] = None,
    sort: Optional[str] = "recent",  # recent, active, trending
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Project).options(selectinload(Project.user))
    
    # Stage filter
    if stage:
        try:
            stage_enum = ProjectStage(stage)
            query = query.where(Project.stage == stage_enum)
        except ValueError:
            pass
    
    # User filter
    if user_id:
        query = query.where(Project.user_id == user_id)
    
    # Search by title or description
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Project.title.ilike(search_term),
                Project.description.ilike(search_term)
            )
        )
    
    # Tech stack filter
    if tech:
        tech_term = f"%{tech}%"
        query = query.where(Project.tech_stack.ilike(tech_term))
    
    # Sorting
    if sort == "active":
        query = query.order_by(Project.updated_at.desc())
    else:  # recent (default)
        query = query.order_by(Project.created_at.desc())
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # Get total count with same filters
    count_query = select(func.count(Project.id))
    if stage:
        try:
            stage_enum = ProjectStage(stage)
            count_query = count_query.where(Project.stage == stage_enum)
        except ValueError:
            pass
    if user_id:
        count_query = count_query.where(Project.user_id == user_id)
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            or_(
                Project.title.ilike(search_term),
                Project.description.ilike(search_term)
            )
        )
    if tech:
        tech_term = f"%{tech}%"
        count_query = count_query.where(Project.tech_stack.ilike(tech_term))
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    return {
        "items": [project_to_response(p, include_user=True) for p in projects],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db), viewer: Optional[User] = Depends(get_optional_user)):
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.user),
            selectinload(Project.milestones),
            selectinload(Project.updates),
            selectinload(Project.comments),
            selectinload(Project.repository),
            selectinload(Project.repo_contributors),
            selectinload(Project.commits),
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    response = project_to_response(project, include_user=True)
    response["milestones"] = [milestone_to_response(m) for m in project.milestones]
    response["updates_count"] = len(project.updates)
    response["comments_count"] = len(project.comments)
    can_view_repo_intelligence = True
    if project.repository and project.repository.visibility == "private":
        can_view_repo_intelligence = bool(viewer and viewer.id == project.user_id)
    response["contributors"] = [
        {
            "github_user_id": c.github_user_id,
            "github_username": c.github_username,
            "display_name": c.display_name,
            "avatar_url": c.avatar_url,
            "role": c.role.value if c.role else "contributor",
            "is_verified": c.is_verified,
        }
        for c in project.repo_contributors
    ] if can_view_repo_intelligence else []
    response["recent_commits"] = [
        {
            "sha": c.commit_sha,
            "author_login": c.author_login,
            "message_headline": c.message_headline,
            "committed_at": c.committed_at.isoformat() if c.committed_at else None,
            "commit_url": c.commit_url,
        }
        for c in sorted(project.commits, key=lambda item: item.committed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:10]
    ] if can_view_repo_intelligence else []
    if project.repository and can_view_repo_intelligence:
        repo = project.repository
        langs_result = await db.execute(select(ProjectLanguage).where(ProjectLanguage.project_repository_id == repo.id))
        languages = langs_result.scalars().all()
        highlights_result = await db.execute(
            select(ProjectFileHighlight).where(ProjectFileHighlight.project_repository_id == repo.id)
        )
        key_files = highlights_result.scalars().all()
        detected_frameworks = json.loads(repo.detected_frameworks_json) if repo.detected_frameworks_json else []
        response["repo_summary"] = {
            "provider": repo.provider.value,
            "repo_name": repo.repo_name,
            "repo_full_name": repo.repo_full_name,
            "repo_url": repo.repo_url,
            "default_branch": repo.default_branch,
            "visibility": repo.visibility,
            "stars_count": repo.stars_count,
            "forks_count": repo.forks_count,
            "open_issues_count": repo.open_issues_count,
            "repo_created_at": repo.repo_created_at.isoformat() if repo.repo_created_at else None,
            "repo_updated_at": repo.repo_updated_at.isoformat() if repo.repo_updated_at else None,
            "repo_pushed_at": repo.repo_pushed_at.isoformat() if repo.repo_pushed_at else None,
            "last_synced_at": repo.last_synced_at.isoformat() if repo.last_synced_at else None,
            "sync_status": repo.sync_status.value if repo.sync_status else None,
            "sync_error": repo.sync_error,
            "readme_excerpt": repo.readme_preview,
            "key_files": json.loads(repo.important_files_json) if repo.important_files_json else [],
            "detected_frameworks": detected_frameworks,
        }
        response["languages"] = [{"name": l.language_name, "bytes": l.bytes, "percentage": l.percentage} for l in languages]
        response["readme_excerpt"] = repo.readme_preview
        response["readme_present"] = bool(repo.readme_preview)
        response["last_synced_at"] = repo.last_synced_at.isoformat() if repo.last_synced_at else None
        response["sync_status"] = repo.sync_status.value if repo.sync_status else None
        response["sync_error"] = repo.sync_error
        response["detected_frameworks"] = detected_frameworks
        response["key_file_highlights"] = [
            {
                "path": f.path,
                "item_type": f.item_type,
                "classification": f.classification,
                "is_key_file": f.is_key_file,
            }
            for f in key_files
        ]
    else:
        response["repo_summary"] = None
        response["languages"] = []
        response["readme_excerpt"] = None
        response["readme_present"] = False
        response["last_synced_at"] = None
        response["sync_status"] = None
        response["sync_error"] = None
        response["detected_frameworks"] = []
        response["key_file_highlights"] = []
    
    return response


@api_router.post("/projects/{project_id}/refresh")
async def refresh_project_repo(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key = f"{user.id}:{project_id}"
    if key in repo_refresh_tracker:
        raise HTTPException(status_code=429, detail="Refresh rate limit exceeded. Try again in a minute.")
    result = await db.execute(
        select(Project).options(selectinload(Project.repository)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to refresh this project")
    if not project.repository:
        raise HTTPException(status_code=400, detail="Project has no connected repository")

    account = await get_active_github_account(db, user.id)
    if not account:
        raise HTTPException(status_code=400, detail="GitHub account disconnected")

    token = decrypt_connected_account_token_or_400(account)
    await run_repo_sync(db, project.repository, token)
    repo_refresh_tracker[key] = datetime.now(timezone.utc)
    await db.refresh(project.repository)
    return {
        "status": project.repository.sync_status.value,
        "last_synced_at": project.repository.last_synced_at.isoformat() if project.repository.last_synced_at else None,
        "sync_error": project.repository.sync_error,
    }


@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdateSchema, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Ownership check
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    if data.tech_stack is not None:
        project.tech_stack = json.dumps(data.tech_stack)
    if data.stage is not None:
        project.stage = ProjectStage(data.stage.value)
    if data.support_needed is not None:
        project.support_needed = data.support_needed
    
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with user
    result = await db.execute(select(Project).options(selectinload(Project.user)).where(Project.id == project_id))
    project = result.scalar_one()
    
    return project_to_response(project, include_user=True)


@api_router.patch("/projects/{project_id}/complete")
async def complete_project(project_id: str, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to complete this project")
    
    project.stage = ProjectStage.completed
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    result = await db.execute(select(Project).options(selectinload(Project.user)).where(Project.id == project_id))
    project = result.scalar_one()
    
    # Send congratulations email
    background_tasks.add_task(
        send_project_completed_email,
        to=user.email,
        name=user.name or user.email.split("@")[0],
        project_title=project.title
    )
    
    return project_to_response(project, include_user=True)


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}


# ========== PROJECT UPDATES ENDPOINTS ==========
@api_router.post("/projects/{project_id}/updates")
async def create_project_update(project_id: str, data: ProjectUpdateCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    update = ProjectUpdate(
        project_id=project_id,
        author_user_id=user.id,
        title=data.title,
        body=data.body,
        update_type=ProjectUpdateType(data.update_type.value),
    )
    db.add(update)
    await db.commit()
    await db.refresh(update)
    return project_update_to_response(update)


@api_router.get("/projects/{project_id}/updates")
async def get_project_updates(project_id: str, limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = (
        select(ProjectUpdate)
        .where(ProjectUpdate.project_id == project_id)
        .order_by(ProjectUpdate.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    updates = result.scalars().all()
    
    return {"items": [project_update_to_response(u) for u in updates]}


# ========== MILESTONES ENDPOINTS ==========
@api_router.post("/projects/{project_id}/milestones")
async def create_milestone(project_id: str, data: MilestoneCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    milestone = Milestone(
        project_id=project_id,
        title=data.title,
        description=data.description,
        status=MilestoneStatus(data.status.value),
        due_date=data.due_date,
        completed_at=datetime.now(timezone.utc) if data.status.value == "done" else None,
        created_by_user_id=user.id,
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    
    return milestone_to_response(milestone)


@api_router.patch("/projects/{project_id}/milestones/{milestone_id}")
async def update_milestone(project_id: str, milestone_id: str, data: MilestoneUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Milestone)
        .options(selectinload(Milestone.project))
        .where(Milestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    if milestone.project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if data.title is not None:
        milestone.title = data.title
    if data.description is not None:
        milestone.description = data.description
    if data.status is not None:
        next_status = MilestoneStatus(data.status.value)
        was_done = milestone.status == MilestoneStatus.done
        milestone.status = next_status
        if next_status == MilestoneStatus.done and milestone.completed_at is None:
            milestone.completed_at = datetime.now(timezone.utc)
        if was_done and next_status != MilestoneStatus.done:
            milestone.completed_at = None
    if data.due_date is not None:
        milestone.due_date = data.due_date
    milestone.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(milestone)
    
    return milestone_to_response(milestone)


@api_router.get("/projects/{project_id}/milestones")
async def get_project_milestones(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.created_at)
    )
    milestones = result.scalars().all()
    
    return {"items": [milestone_to_response(m) for m in milestones]}


@api_router.get("/projects/{project_id}/activity")
async def get_project_activity(project_id: str, db: AsyncSession = Depends(get_db), viewer: Optional[User] = Depends(get_optional_user)):
    project_result = await db.execute(
        select(Project).options(selectinload(Project.repository)).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    include_repo_activity = True
    if project.repository and project.repository.visibility == "private":
        include_repo_activity = bool(viewer and viewer.id == project.user_id)

    commits_result = await db.execute(
        select(ProjectCommit).where(ProjectCommit.project_id == project_id).order_by(ProjectCommit.committed_at.desc()).limit(50)
    )
    updates_result = await db.execute(
        select(ProjectUpdate).where(ProjectUpdate.project_id == project_id).order_by(ProjectUpdate.created_at.desc()).limit(50)
    )
    milestones_result = await db.execute(
        select(Milestone).where(Milestone.project_id == project_id).order_by(Milestone.updated_at.desc()).limit(50)
    )

    commits = [
        {
            "id": c.id,
            "commit_sha": c.commit_sha,
            "author_login": c.author_login,
            "author_name": c.author_name,
            "message_headline": c.message_headline,
            "message_body": c.message_body,
            "committed_at": c.committed_at.isoformat() if c.committed_at else None,
            "commit_url": c.commit_url,
        }
        for c in commits_result.scalars().all()
    ] if include_repo_activity else []
    updates = [project_update_to_response(u) for u in updates_result.scalars().all()]
    milestones = [milestone_to_response(m) for m in milestones_result.scalars().all()]

    return {"items": merge_project_activity(commits, updates, milestones)}


# ========== COMMENTS ENDPOINTS ==========
@api_router.post("/projects/{project_id}/comments")
async def create_comment(project_id: str, data: CommentCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    comment = Comment(
        project_id=project_id,
        user_id=user.id,
        content=data.content
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    # Send email notification to project owner (if commenter is not the owner)
    if project.user and project.user.id != user.id:
        background_tasks.add_task(
            send_comment_notification_email,
            to=project.user.email,
            owner_name=project.user.name or project.user.email.split("@")[0],
            project_title=project.title,
            commenter_name=user.name or user.email.split("@")[0],
            comment_preview=data.content
        )
    
    return {
        "id": comment.id,
        "project_id": comment.project_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "user": user_to_response(user)
    }


@api_router.get("/projects/{project_id}/comments")
async def get_project_comments(project_id: str, limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.project_id == project_id)
        .order_by(Comment.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    comments = result.scalars().all()
    
    return {
        "items": [
            {
                "id": c.id,
                "project_id": c.project_id,
                "user_id": c.user_id,
                "content": c.content,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "user": user_to_response(c.user) if c.user else None
            }
            for c in comments
        ]
    }


# ========== COLLABORATION ENDPOINTS ==========
@api_router.post("/projects/{project_id}/collaborate")
async def request_collaboration(project_id: str, data: CollaborationRequestCreate, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot request collaboration on your own project")
    
    # Check if already requested
    result = await db.execute(
        select(CollaborationRequest)
        .where(
            and_(
                CollaborationRequest.project_id == project_id,
                CollaborationRequest.requester_user_id == user.id
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Collaboration already requested")
    
    collab = CollaborationRequest(
        project_id=project_id,
        requester_user_id=user.id,
        message=data.message
    )
    db.add(collab)
    await db.commit()
    await db.refresh(collab)
    
    # Send email notification to project owner
    if project.user:
        background_tasks.add_task(
            send_collaboration_request_email,
            to=project.user.email,
            owner_name=project.user.name or project.user.email.split("@")[0],
            project_title=project.title,
            requester_name=user.name or user.email.split("@")[0],
            message=data.message
        )
    
    return {
        "id": collab.id,
        "project_id": collab.project_id,
        "requester_user_id": collab.requester_user_id,
        "message": collab.message,
        "status": collab.status.value,
        "created_at": collab.created_at.isoformat() if collab.created_at else None,
        "requester": user_to_response(user)
    }


@api_router.get("/projects/{project_id}/collaborators")
async def get_collaborators(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(CollaborationRequest)
        .options(selectinload(CollaborationRequest.requester))
        .where(CollaborationRequest.project_id == project_id)
        .order_by(CollaborationRequest.created_at.desc())
    )
    collabs = result.scalars().all()
    
    return {
        "items": [
            {
                "id": c.id,
                "project_id": c.project_id,
                "requester_user_id": c.requester_user_id,
                "message": c.message,
                "status": c.status.value,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "requester": user_to_response(c.requester) if c.requester else None
            }
            for c in collabs
        ]
    }


@api_router.patch("/collaborations/{collab_id}")
async def update_collaboration(collab_id: str, data: CollaborationRequestUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CollaborationRequest)
        .options(selectinload(CollaborationRequest.project))
        .where(CollaborationRequest.id == collab_id)
    )
    collab = result.scalar_one_or_none()
    
    if not collab:
        raise HTTPException(status_code=404, detail="Collaboration request not found")
    
    # Only project owner can accept/reject
    if collab.project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    collab.status = CollaborationStatus(data.status.value)
    await db.commit()
    await db.refresh(collab)
    
    return {
        "id": collab.id,
        "project_id": collab.project_id,
        "requester_user_id": collab.requester_user_id,
        "message": collab.message,
        "status": collab.status.value,
        "created_at": collab.created_at.isoformat() if collab.created_at else None
    }


# ========== FEED ENDPOINT ==========
@api_router.get("/feed")
async def get_feed(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    # Get recent project updates with project and user info
    result = await db.execute(
        select(ProjectUpdate)
        .options(selectinload(ProjectUpdate.project).selectinload(Project.user))
        .order_by(ProjectUpdate.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    updates = result.scalars().all()
    
    # Count total
    count_result = await db.execute(select(func.count(ProjectUpdate.id)))
    total = count_result.scalar()
    
    items = []
    for u in updates:
        if u.project:
            items.append({
                "id": u.id,
                "type": "update",
                "content": f"{u.title}\n\n{u.body}",
                "project": project_to_response(u.project, include_user=True),
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
    
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ========== CELEBRATION WALL ENDPOINT ==========
@api_router.get("/celebration")
async def get_celebration_wall(limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.stage == ProjectStage.completed)
        .order_by(Project.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    projects = result.scalars().all()
    
    count_result = await db.execute(
        select(func.count(Project.id))
        .where(Project.stage == ProjectStage.completed)
    )
    total = count_result.scalar()
    
    return {
        "items": [project_to_response(p, include_user=True) for p in projects],
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ========== MY PROJECTS ENDPOINT ==========
@api_router.get("/my/projects")
async def get_my_projects(
    stage: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Project).where(Project.user_id == user.id)
    
    if stage:
        try:
            stage_enum = ProjectStage(stage)
            query = query.where(Project.stage == stage_enum)
        except ValueError:
            pass
    
    query = query.order_by(Project.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return {
        "items": [project_to_response(p) for p in projects]
    }


# ========== MY COLLABORATION REQUESTS ENDPOINT ==========
@api_router.get("/my/collaboration-requests")
async def get_my_collaboration_requests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Get requests on my projects
    result = await db.execute(
        select(CollaborationRequest)
        .options(
            selectinload(CollaborationRequest.requester),
            selectinload(CollaborationRequest.project)
        )
        .join(Project)
        .where(Project.user_id == user.id)
        .order_by(CollaborationRequest.created_at.desc())
    )
    requests = result.scalars().all()
    
    return {
        "items": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "project_title": r.project.title if r.project else None,
                "requester_user_id": r.requester_user_id,
                "message": r.message,
                "status": r.status.value,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "requester": user_to_response(r.requester) if r.requester else None
            }
            for r in requests
        ]
    }


# ========== HEALTH CHECK ==========
@api_router.get("/")
async def root():
    return {"message": "MzansiBuilds API is running", "version": "1.0.0"}


@api_router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Startup Events ==========
@app.on_event("startup")
async def startup():
    logger.info("Starting MzansiBuilds API...")
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created/verified")
    
    # Seed admin user (only when ADMIN_PASSWORD is set — no default password)
    async with AsyncSessionLocal() as db:
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@mzansibuilds.com")
        admin_password = (os.environ.get("ADMIN_PASSWORD") or "").strip() or None

        if not admin_password:
            logger.info(
                "admin seed skipped: set ADMIN_PASSWORD in the environment to create or update the admin user"
            )
        else:
            result = await db.execute(select(User).where(User.email == admin_email))
            existing = result.scalar_one_or_none()

            if not existing:
                admin = User(
                    email=admin_email,
                    password_hash=hash_password(admin_password),
                    name="Admin",
                    role="admin",
                    auth_provider="email",
                )
                db.add(admin)
                await db.commit()
                await db.refresh(admin)

                profile = Profile(user_id=admin.id)
                db.add(profile)
                await db.commit()

                logger.info("Admin user created: %s", admin_email)
            elif not verify_password(admin_password, existing.password_hash):
                existing.password_hash = hash_password(admin_password)
                await db.commit()
                logger.info("Admin password updated: %s", admin_email)

            # Never write plaintext credentials unless explicitly enabled (local dev / QA only)
            write_file = os.environ.get("WRITE_ADMIN_CREDENTIALS_FILE", "").lower() in (
                "1",
                "true",
                "yes",
            )
            if write_file:
                creds_dir = os.environ.get("ADMIN_CREDENTIALS_DIR", "/app/memory")
                creds_path = os.path.join(creds_dir, "test_credentials.md")
                try:
                    os.makedirs(creds_dir, exist_ok=True)
                    with open(creds_path, "w") as f:
                        f.write("# Test Credentials\n\n")
                        f.write("## Admin Account\n")
                        f.write(f"- Email: {admin_email}\n")
                        f.write(f"- Password: {admin_password}\n")
                        f.write("- Role: admin\n\n")
                        f.write("## Auth Endpoints\n")
                        f.write("- POST /api/auth/register\n")
                        f.write("- POST /api/auth/login\n")
                        f.write("- POST /api/auth/logout\n")
                        f.write("- GET /api/auth/me\n")
                        f.write("- POST /api/auth/refresh\n")
                        f.write("- POST /api/auth/google/session\n")
                except OSError as e:
                    logger.warning(
                        "Could not write admin credentials file to %s: %s", creds_path, e
                    )


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
    logger.info("MzansiBuilds API shutdown complete")
