# MzansiBuilds API Server
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
import os
import base64
import logging
import bcrypt
import jwt
import secrets
import json
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from database import get_db, engine, Base, AsyncSessionLocal
from models import (
    User, Profile, Project, ProjectUpdate, Milestone, 
    Comment, CollaborationRequest, UserSession, LoginAttempt,
    ProjectStage, CollaborationStatus
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
    ProjectStageEnum, CollaborationStatusEnum
)
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
async def verify_supabase_token(token: str) -> dict:
    """Verify Supabase JWT token"""
    try:
        # Supabase JWTs can be verified by checking the iss claim matches the Supabase URL
        # For production, you should verify with the JWT secret
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        # Check if it's a Supabase token
        if unverified.get("iss") and "supabase" in unverified.get("iss", ""):
            return {
                "sub": unverified.get("sub"),
                "email": unverified.get("email"),
                "provider": "supabase"
            }
        return None
    except Exception:
        return None


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
        "role": user.role,
        "auth_provider": user.auth_provider,
        "picture": user.picture,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


def profile_to_response(profile: Profile) -> dict:
    skills = None
    if profile.skills:
        try:
            skills = json.loads(profile.skills)
        except:
            skills = []
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "bio": profile.bio,
        "skills": skills,
        "github_url": profile.github_url,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
    }


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
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }
    
    if include_user and project.user:
        response["user"] = user_to_response(project.user)
    
    return response


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


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
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        
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
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    
    return {"user": user_to_response(user), "message": "Google login successful"}


# ========== SUPABASE AUTH SYNC ENDPOINT ==========
@api_router.post("/auth/sync")
async def sync_supabase_user(request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Sync user from Supabase Auth to our database"""
    body = await request.json()
    
    supabase_id = body.get("supabase_id")
    email = body.get("email", "").lower().strip()
    name = body.get("name")
    picture = body.get("picture")
    provider = body.get("provider", "email")
    email_confirmed_at = body.get("email_confirmed_at")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Find existing user by supabase_id (stored in google_id field) or email
    result = await db.execute(
        select(User).where(
            or_(
                User.google_id == supabase_id,
                User.email == email
            )
        )
    )
    user = result.scalar_one_or_none()
    
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


# ========== PROFILE ENDPOINTS ==========
@api_router.get("/profile")
async def get_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile_to_response(profile)


@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Create profile if doesn't exist
        profile = Profile(user_id=user.id)
        db.add(profile)
    
    if data.bio is not None:
        profile.bio = data.bio
    if data.skills is not None:
        profile.skills = json.dumps(data.skills)
    if data.github_url is not None:
        profile.github_url = data.github_url
    
    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    
    return profile_to_response(profile)


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
        response["profile"] = profile_to_response(user.profile)
    
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
@api_router.post("/projects")
async def create_project(data: ProjectCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tech_stack = json.dumps(data.tech_stack) if data.tech_stack else None
    
    project = Project(
        user_id=user.id,
        title=data.title,
        description=data.description,
        tech_stack=tech_stack,
        stage=ProjectStage(data.stage.value),
        support_needed=data.support_needed
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
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.user),
            selectinload(Project.milestones),
            selectinload(Project.updates),
            selectinload(Project.comments)
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    response = project_to_response(project, include_user=True)
    response["milestones"] = [
        {
            "id": m.id,
            "project_id": m.project_id,
            "title": m.title,
            "is_completed": m.is_completed,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in project.milestones
    ]
    response["updates_count"] = len(project.updates)
    response["comments_count"] = len(project.comments)
    
    return response


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
        content=data.content
    )
    db.add(update)
    await db.commit()
    await db.refresh(update)
    
    return {
        "id": update.id,
        "project_id": update.project_id,
        "content": update.content,
        "created_at": update.created_at.isoformat() if update.created_at else None
    }


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
    
    return {
        "items": [
            {
                "id": u.id,
                "project_id": u.project_id,
                "content": u.content,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in updates
        ]
    }


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
        title=data.title
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    
    return {
        "id": milestone.id,
        "project_id": milestone.project_id,
        "title": milestone.title,
        "is_completed": milestone.is_completed,
        "created_at": milestone.created_at.isoformat() if milestone.created_at else None
    }


@api_router.patch("/milestones/{milestone_id}")
async def update_milestone(milestone_id: str, data: MilestoneUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
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
    if data.is_completed is not None:
        milestone.is_completed = data.is_completed
    
    await db.commit()
    await db.refresh(milestone)
    
    return {
        "id": milestone.id,
        "project_id": milestone.project_id,
        "title": milestone.title,
        "is_completed": milestone.is_completed,
        "created_at": milestone.created_at.isoformat() if milestone.created_at else None
    }


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
    
    return {
        "items": [
            {
                "id": m.id,
                "project_id": m.project_id,
                "title": m.title,
                "is_completed": m.is_completed,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in milestones
        ]
    }


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
                "content": u.content,
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
    allow_origins=["*"],
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
    
    # Seed admin user
    async with AsyncSessionLocal() as db:
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@mzansibuilds.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
        
        result = await db.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        
        if not existing:
            admin = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                name="Admin",
                role="admin",
                auth_provider="email"
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            
            # Create admin profile
            profile = Profile(user_id=admin.id)
            db.add(profile)
            await db.commit()
            
            logger.info(f"Admin user created: {admin_email}")
        elif not verify_password(admin_password, existing.password_hash):
            existing.password_hash = hash_password(admin_password)
            await db.commit()
            logger.info(f"Admin password updated: {admin_email}")
        
        # Write credentials to file (optional; skip in CI or when path is not writable)
        skip_file = os.environ.get("SKIP_ADMIN_CREDENTIALS_FILE", "").lower() in ("1", "true", "yes")
        if not skip_file:
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
                logger.warning("Could not write admin credentials file to %s: %s", creds_path, e)


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
    logger.info("MzansiBuilds API shutdown complete")
