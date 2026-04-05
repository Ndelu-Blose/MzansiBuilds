# Entity–relationship diagram — MzansiBuilds

This ERD reflects the **target domain** named in the project brief, aligned with the current SQLAlchemy models where they exist.

**Implemented in code today:** `User`, `Profile`, `Project` (with **Stage** as enum column `stage`, not a separate table), `ProjectUpdate` (domain “Update”), `Milestone`, `Comment`, `CollaborationRequest` (domain “CollabRequest”).  
**Also in DB but out of brief scope:** `UserSession`, `LoginAttempt` — omitted below to keep the diagram readable; add them if you document auth persistence.

**Not implemented yet (keep in diagram for roadmap):** `Follow`, `Report` — shown with dashed relationships; remove or solidify when tables exist.

```mermaid
erDiagram
  USER ||--o| PROFILE : "has"
  USER ||--o{ PROJECT : "owns"
  PROJECT ||--o{ PROJECT_UPDATE : "contains"
  PROJECT ||--o{ MILESTONE : "contains"
  PROJECT ||--o{ COMMENT : "has"
  USER ||--o{ COMMENT : "writes"
  PROJECT ||--o{ COLLAB_REQUEST : "receives"
  USER ||--o{ COLLAB_REQUEST : "requests"

  USER {
    uuid id PK
    string email UK
    string name
    string role
    string auth_provider
    string google_id UK
    text picture
    datetime created_at
  }

  PROFILE {
    uuid id PK
    uuid user_id FK
    text bio
    text skills_json
    string github_url
    datetime updated_at
  }

  PROJECT {
    uuid id PK
    uuid user_id FK
    string title
    text description
    text tech_stack_json
    string stage
    text support_needed
    datetime created_at
  }

  PROJECT_UPDATE {
    uuid id PK
    uuid project_id FK
    text content
    datetime created_at
  }

  MILESTONE {
    uuid id PK
    uuid project_id FK
    string title
    boolean is_completed
    datetime created_at
  }

  COMMENT {
    uuid id PK
    uuid project_id FK
    uuid user_id FK
    text content
    datetime created_at
  }

  COLLAB_REQUEST {
    uuid id PK
    uuid project_id FK
    uuid requester_user_id FK
    text message
    string status
    datetime created_at
  }

  FOLLOW {
    uuid id PK
    uuid follower_user_id FK
    uuid followee_user_id FK
    datetime created_at
  }

  REPORT {
    uuid id PK
    uuid reporter_user_id FK
    uuid target_project_id FK
    uuid target_comment_id FK
    string reason
    string status
    datetime created_at
  }
```

**Follow** and **Report** appear above as entities for the brief; they are **not wired with edges** yet so the diagram stays valid in Mermaid and matches the current schema (no `follow` / `report` tables). When you add migrations, connect:

- `FOLLOW.follower_user_id` / `followee_user_id` → `USER.id`
- `REPORT.reporter_user_id` → `USER.id`; optional FKs to `PROJECT` / `COMMENT` for the reported target.

## Domain mapping

| Brief name | Code / table |
|------------|----------------|
| Stage | `Project.stage` (`ProjectStage` enum in [`backend/models.py`](../../backend/models.py)) |
| Update | `ProjectUpdate` → table `project_updates` |
| CollabRequest | `CollaborationRequest` → `collaboration_requests` |
| Follow | Not in schema yet — entity reserved above |
| Report | Not in schema yet — entity reserved above |

## Maintenance notes

- When **Follow** or **Report** ships, replace `..` relationships with solid FK lines and update attributes to match migrations.
- If you split **Stage** into its own table, introduce `STAGE` and relate `PROJECT` → `STAGE`.
- Regenerate column lists from Alembic migrations or `models.py` whenever you change fields.
