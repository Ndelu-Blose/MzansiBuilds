# MzansiBuilds - Product Requirements Document

## Project Overview
MzansiBuilds is a full-stack web platform that enables South African developers to:
- Build in public and share their journey
- Track project progress through defined stages
- Collaborate with other developers
- Share updates via a live activity feed
- Showcase completed projects on a celebration wall

## System Architecture

> See [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the complete functional decomposition.

### Core Functional Domains
1. **Authentication & Identity** - Who is the user?
2. **Profile & Developer Presence** - Who is this developer on the platform?
3. **Project Lifecycle Management** - What is being built?
4. **Progress & Activity Tracking** - How is work moving?
5. **Community Engagement & Collaboration** - How do developers engage?
6. **Discovery & Recognition** - How are projects found and celebrated?

### Tech Stack
- **Frontend**: React 19 with Tailwind CSS
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google, GitHub, Email) + Legacy JWT
- **Email**: Resend for transactional emails

## User Personas
1. **Developer (Primary)**: Creates projects, tracks progress, shares updates
2. **Community Member (Secondary)**: Views feed, comments, requests collaboration

## Core Requirements (Static)
### Authentication
- Email/password registration and login
- Google OAuth integration
- JWT token-based session management
- Protected routes for authenticated users

### Project Management
- CRUD operations for projects
- Project stages: idea → planning → in_progress → testing → completed
- Tech stack tagging
- Support needed field for collaboration

### Progress Tracking
- Project updates (timeline)
- Milestones with completion toggle
- Comments from community

### Collaboration
- Request to collaborate feature
- Accept/reject collaboration requests
- View collaborators per project

### Feed & Celebration
- Activity feed showing recent project updates
- Celebration wall for completed projects

### Integrations & awareness (shipped beyond original MVP scope)
- Optional **GitHub** account linking and **import project from repository**; repo-backed sync for metadata shown on project pages
- **In-app notifications** for collaboration, comments, milestones, and project updates (REST-backed; not real-time push)

## What's Been Implemented

### MVP (April 2, 2026)
✅ Full backend API with all endpoints
✅ User authentication (JWT + Google OAuth ready)
✅ Profile management
✅ Project CRUD with stages
✅ Project updates system
✅ Milestones with toggle completion
✅ Comments system
✅ Collaboration requests
✅ Activity feed
✅ Celebration wall
✅ Light theme UI (Tailwind + CSS variables), responsive layout
✅ Admin seeding

### Layer 1 & 2 Enhancements (April 2, 2026)
✅ **Search & Filtering**: Search by title/description, filter by stage, tech stack, sort options
✅ **Explore Page**: Dedicated project discovery page with advanced filters
✅ **Public User Profile**: Bio, skills, GitHub link, project stats (total/active/completed)
✅ **Project Status Indicators**: Color-coded stage badges
✅ **"Support Needed" Badge**: Visual indicator when project owner needs help
✅ **Milestone Progress Bar**: Visual progress tracking on project cards
✅ **Relative Timestamps**: "Just now", "2h ago", etc.
✅ **Enhanced Navigation**: Added Explore link to main nav

### Auth & Email Enhancements (April 2, 2026)
✅ **Supabase Auth Integration**: Email/password, Google OAuth, GitHub OAuth
✅ **Resend Email Service**: Transactional emails for engagement
✅ **Welcome Email**: Sent after new user signup
✅ **Collaboration Request Email**: Notifies project owner
✅ **Comment Notification Email**: Notifies project owner of new comments
✅ **Project Completion Email**: Congratulates user when project ships
✅ **Dual Auth Support**: Legacy JWT + Supabase JWT verification

### GitHub integration (April 2026)
✅ **Connect GitHub** (OAuth): link account, list repositories, preview languages/README
✅ **Import from GitHub**: create repo-backed projects from a selected repository
✅ **Repo sync**: contributors, languages, README preview, recent commits (for connected private/public repos as permitted by token)
✅ **Import provenance**: metadata on imported projects (e.g. source repo, flags) where enabled

### In-app notifications (April 2026)
✅ **Notification list & read state**: REST API for user notifications (collaboration, comments, milestones, updates)
✅ **Header / dashboard preview**: surface recent unread items in the UI

### Product polish & reliability (April 2026)
✅ **Dashboard resilience**: projects, stats, and collaboration requests load even if the notifications request fails; notification area fails with a clear empty state
✅ **Project cards (discovery)**: owner profile image when available (else initials / neutral fallback); owner row links to public profile
✅ **Mobile browser chrome**: `theme-color` / `color-scheme` aligned with the light UI so address bar and related surfaces are not stuck on legacy black

## API Endpoints
### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/google/session

### Profile
- GET /api/profile
- PUT /api/profile
- GET /api/users/{user_id}/profile (includes stats + recent projects)

### Projects
- GET /api/projects (with search, stage, tech, sort params)
- POST /api/projects
- GET /api/projects/{id}
- PUT /api/projects/{id}
- PATCH /api/projects/{id}/complete
- DELETE /api/projects/{id}

### Updates
- GET /api/projects/{id}/updates
- POST /api/projects/{id}/updates

### Milestones
- GET /api/projects/{id}/milestones
- POST /api/projects/{id}/milestones
- PATCH /api/milestones/{id}

### Comments
- GET /api/projects/{id}/comments
- POST /api/projects/{id}/comments

### Collaboration
- GET /api/projects/{id}/collaborators
- POST /api/projects/{id}/collaborate
- PATCH /api/collaborations/{id}

### Feed & Celebration
- GET /api/feed
- GET /api/celebration

### Notifications
- GET /api/notifications
- PATCH /api/notifications/{notification_id}/read

### GitHub (integrations)
- POST /api/integrations/github/connect/start
- GET /api/integrations/github/callback
- GET /api/integrations/github/account
- DELETE /api/integrations/github/account
- GET /api/integrations/github/repos (+ repo-scoped preview routes)
- POST /api/projects/import/github

## Prioritized Backlog
### P0 (Critical) - Done
- ✅ Authentication system
- ✅ Project CRUD
- ✅ Activity feed
- ✅ Celebration wall
- ✅ Search & filtering
- ✅ User profiles with stats

### P1 (Important) - Future
- Real-time / push notifications (e.g. WebSockets or web push) on top of existing in-app notifications
- Follow system (follow developers)
- Smart feed sorting (trending algorithm)
- Project templates

### P2 (Nice to have) - Future
- GitHub OAuth scope UX (e.g. fine-grained or GitHub App) to limit access to explicitly chosen repos
- Project analytics/insights
- Export project data
- Optional dark/light theme toggle (product is light-first today)
- Notification digest emails (beyond transactional Resend flows already shipped)

## Next Tasks
1. Optional: live notification delivery (WebSockets / push) without changing core REST notification model
2. Implement follow system for developers
3. Add trending/personalized feed algorithm
4. Create project templates (Web App, API, Mobile)
5. Harden GitHub permissions story for non-technical users (copy + optional narrower scopes)
