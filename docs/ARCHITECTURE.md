# MzansiBuilds - System Architecture & Functional Decomposition

## Overview

MzansiBuilds is a full-stack platform enabling South African developers to build in public, track progress, collaborate, and celebrate completed projects. This document provides the functional decomposition of the system.

---

## 1. Core Functional Domains

The system is organized into **6 main functional domains**:

| Domain | Key Question |
|--------|-------------|
| Authentication & Identity | Who is the user, and how do they access the system safely? |
| Profile & Developer Presence | Who is this developer on the platform? |
| Project Lifecycle Management | What is being built, who owns it, and what state is it in? |
| Progress & Activity Tracking | How does the platform show that work is actually moving? |
| Community Engagement & Collaboration | How do other developers engage with what's being built? |
| Discovery & Recognition | How do users find projects and how does the platform celebrate progress? |

---

## 2. Domain Details

### A. Authentication & Identity

#### Core Functionality
- Register account (email/password)
- Sign in with email/password
- Sign in with Google OAuth
- Sign in with GitHub OAuth
- Sign out
- Maintain authenticated session

#### Supporting Functions
- Validate auth input
- Hash passwords (bcrypt)
- Verify passwords
- Create session/token (JWT)
- Handle OAuth callback
- Persist login state
- Protect private routes
- Identify current user
- Refresh/restore session
- Handle failed login attempts (brute force protection)

#### Output to Other Domains
- Profile ownership
- Project ownership
- Protected mutations
- Personalized dashboard access

---

### B. Profile & Developer Presence

#### Core Functionality
- Create profile
- Edit profile
- View public profile
- Show developer bio, skills, links
- Show developer stats

#### Supporting Functions
- Auto-create profile on first login if missing
- Validate profile fields
- Store provider info (google, github, email)
- Store GitHub link
- Store avatar or generate fallback
- Calculate profile stats:
  - Total projects
  - Active projects (in_progress stage)
  - Completed projects
- Fetch public projects by user

#### Output to Other Domains
- Trust and identity verification
- Project ownership display
- Public discovery
- Collaboration credibility

---

### C. Project Lifecycle Management

#### Core Functionality
- Create project
- Edit project
- View project
- Delete project
- Set project stage
- Mark project complete

#### Core Project Fields
| Field | Description |
|-------|-------------|
| title | Project name (required) |
| description | What the project does |
| tech_stack | Array of technologies used |
| stage | Current lifecycle stage (enum) |
| support_needed | What help the developer is looking for |

#### Stage Enum Values
```
idea → planning → in_progress → testing → completed
```

#### Supporting Functions
- Validate project payload
- Assign owner on create
- Enforce ownership checks (403 if not owner)
- Restrict mutations to owner
- Normalize stage values
- Handle completion transition
- Update timestamps (created_at, updated_at)
- Cascade delete child records (updates, milestones, comments, collaboration requests)
- Fetch project summary data

#### Output to Other Domains
- Feed items
- Search and filtering
- Milestone tracking
- Collaboration requests
- Celebration wall

---

### D. Progress & Activity Tracking

#### Core Functionality
- Create project updates
- List project updates
- Create milestones
- Toggle milestone completion
- Show milestone progress
- Generate activity feed

#### Supporting Functions
- Validate update content (non-empty)
- Validate milestone payload
- Attach updates to correct project
- Ensure only owner can post official updates
- Calculate milestone completion percentage:
  ```
  progress = completed_milestones / total_milestones
  ```
- Compute relative timestamps ("Just now", "2h ago", "Yesterday")
- Order updates newest first
- Paginate feed (limit/offset)
- Optimize feed queries (indexed on created_at)
- Transform updates into feed cards

#### Output to Other Domains
- Public visibility
- "Build in public" behavior
- Progress indicators on project cards
- Recent activity on profiles and dashboard

---

### E. Community Engagement & Collaboration

#### Core Functionality
- Comment on project
- Send collaboration request
- View collaboration interest
- Accept/reject collaboration requests
- Notify project owner of activity

#### Supporting Functions
- Validate comment content
- Validate collaboration message
- Prevent duplicate collaboration requests (unique constraint)
- Attach comments to project
- Fetch collaboration requests per project
- Track collaboration status (pending, accepted, rejected)
- Protect collaboration actions
- Trigger email notifications:
  - Collaboration request email
  - Comment notification email
- Optionally create in-app notifications

#### Output to Other Domains
- Community interaction
- Project support flow
- Engagement history
- Better retention and platform realism

---

### F. Discovery & Recognition

#### Core Functionality
- Explore projects
- Search projects (by title, description)
- Filter by stage
- Filter by tech stack
- Sort projects (recent, active)
- Browse developer profiles
- View celebration wall

#### Supporting Functions
- Build search query (ILIKE pattern matching)
- Apply filters (stage, tech, user)
- Apply sort order
- Paginate project discovery results
- Calculate active/completed project counts
- Identify completed projects (stage = 'completed')
- Render celebration wall entries
- Show "looking for help" badge (support_needed)
- Show project progress bar

#### Output to Other Domains
- Usability
- Discovery
- Visibility of work
- Recognition of completed builds

---

## 3. Cross-Cutting Supporting Functions

These functions support the entire platform:

### A. Validation
- Required fields check
- Correct enum values
- Non-empty content
- Valid URLs (GitHub, etc.)
- Safe field lengths

### B. Authorization
- Owner-only project editing
- Owner-only completion
- Authenticated-only comments/collaboration
- Private page protection (ProtectedRoute)

### C. State Consistency
- Completed projects appear on celebration wall
- Updates appear in feed
- Milestone progress updates correctly
- Profile stats stay aligned with projects

### D. Error Handling
- Clear API error messages
- Frontend error display
- Safe fallback states
- Graceful failed request handling

### E. Data Retrieval
- Fetch current user (/api/auth/me)
- Fetch profile (/api/profile)
- Fetch project details (/api/projects/{id})
- Fetch project lists (/api/projects)
- Fetch feed (/api/feed)
- Fetch milestone summaries
- Fetch comments
- Fetch collaboration requests

### F. Notification Support
- Welcome email (new user signup)
- Collaboration request email
- Comment notification email
- Completion/congrats email

### G. Presentation Helpers
- Relative timestamps (formatRelativeTime)
- Badge rendering (StageBadge component)
- Progress bar values
- Empty states
- Loading states

---

## 4. System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IDENTITY      │───▶│   PRESENCE      │───▶│   OWNERSHIP     │
│                 │    │                 │    │                 │
│ • Register      │    │ • Create profile│    │ • Create project│
│ • Sign in       │    │ • Show bio/skills│   │ • Assign owner  │
│ • OAuth         │    │ • Calculate stats│   │ • Edit project  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  RECOGNITION    │◀───│   ENGAGEMENT    │◀───│   ACTIVITY      │
│                 │    │                 │    │                 │
│ • Complete      │    │ • Comments      │    │ • Post updates  │
│ • Celebration   │    │ • Collab requests│   │ • Add milestones│
│ • Discovery     │    │ • Notifications │    │ • Track progress│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Flow Details

| Flow | From | To | Description |
|------|------|-----|-------------|
| 1 | Identity | Presence | User registers/signs in → profile created/loaded → developer identity visible |
| 2 | Presence | Ownership | Authenticated user creates project → assigned as owner → project linked to profile |
| 3 | Ownership | Activity | Owner posts updates → adds milestones → changes stage → generates visible progress |
| 4 | Activity | Engagement | Community sees updates in feed → opens project → comments or offers help |
| 5 | Engagement | Recognition | Owner marks project complete → moves to celebration wall → recognized |

---

## 5. Functional Hierarchy

### Level 1: Business Functions
- Identity
- Projects
- Progress
- Collaboration
- Discovery
- Recognition

### Level 2: Operational Functions
- Register/login
- Create/edit profile
- Create/edit project
- Add updates
- Manage milestones
- Add comments
- Send collaboration requests
- Search/filter
- Complete project

### Level 3: Supporting Functions
- Validation
- Authorization
- Session handling
- State synchronization
- Feed generation
- Notification triggers
- Query optimization
- Formatting/presentation helpers

---

## 6. Technical Implementation

### Backend (FastAPI + SQLAlchemy)
```
backend/
├── server.py        # Main API with all endpoints
├── models.py        # SQLAlchemy ORM models
├── schemas.py       # Pydantic validation schemas
├── database.py      # Database connection (Supabase)
└── email_service.py # Resend email integration
```

### Frontend (React + Tailwind)
```
frontend/src/
├── contexts/
│   └── AuthContext.js    # Supabase + legacy auth
├── lib/
│   ├── api.js            # Axios API client
│   ├── supabase.js       # Supabase client
│   └── utils.js          # Helpers (timestamps, etc.)
├── components/
│   ├── Layout.js         # Main layout with nav
│   ├── ProtectedRoute.js # Auth guard
│   ├── ProjectCard.js    # Project display card
│   ├── StageBadge.js     # Stage indicator
│   └── FeedItem.js       # Feed entry component
└── pages/
    ├── LandingPage.js
    ├── LoginPage.js
    ├── DashboardPage.js
    ├── ProjectDetailPage.js
    ├── FeedPage.js
    ├── CelebrationPage.js
    ├── ExplorePage.js
    ├── ProfilePage.js
    └── UserProfilePage.js
```

### Database (PostgreSQL via Supabase)
```sql
-- Core Tables
users, profiles, projects, project_updates, 
milestones, comments, collaboration_requests,
user_sessions, login_attempts
```

---

## 7. The System Truth

> **The core functionality gives users the ability to create identity, publish projects, track progress, engage with others, and complete work publicly. The supporting functions ensure those actions are secure, validated, consistent, discoverable, and connected across the platform.**

This is the real system model of MzansiBuilds.
