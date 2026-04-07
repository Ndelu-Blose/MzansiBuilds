# Use case diagram — MzansiBuilds

Actors map to how people use the product. Use cases are the five user stories requested for profiling; they can be split into smaller use cases over time.

```mermaid
flowchart TB
  subgraph actors["Actors"]
    Builder(("Builder"))
    Viewer(("Viewer"))
    Collaborator(("Collaborator"))
    Admin(("Admin"))
  end

  subgraph system["MzansiBuilds system"]
    UC1["US1: Authenticate & manage account / profile"]
    UC2["US2: Create & manage projects (updates, milestones, stage)"]
    US3["US3: Discover & view (feed, explore, profiles)"]
    US4["US4: Collaborate (comments, collaboration requests)"]
    US5["US5: Administer users & platform settings"]
  end

  Builder --> UC1
  Builder --> UC2
  Builder --> US3
  Builder --> US4

  Viewer --> US3
  Viewer --> US4

  Collaborator --> US3
  Collaborator --> US4

  Admin --> UC1
  Admin --> US5
```

## Actor notes

| Actor | Description |
|-------|-------------|
| **Builder** | Signed-in user who owns projects, posts updates, and maintains a profile. |
| **Viewer** | Authenticated or anonymous user who browses feed, explore, and public project/profile pages. |
| **Collaborator** | User who engages with others’ projects (comments, collaboration requests). Often also a Builder. |
| **Admin** | Elevated role (`role=admin` in backend) for operational tasks; extend for moderation as the product grows. |

## User stories (use cases) — summary

| ID | Use case | Primary actors |
|----|-----------|----------------|
| US1 | Authenticate (Supabase) and manage profile | Builder, Admin |
| US2 | CRUD projects, stage, updates, milestones | Builder |
| US3 | Discover: feed, explore, user/project detail | Builder, Viewer |
| US4 | Comment and request collaboration on projects | Builder, Viewer, Collaborator |
| US5 | Administer accounts / platform | Admin |

## Maintenance notes

- When you add features (e.g. follows, reports), add use cases and wire new actors only if behavior truly differs.
- If “Collaborator” stays behaviorally identical to “Builder,” you may merge them in the diagram and describe collaboration as included use cases under Builder.
