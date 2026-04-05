# Architecture diagram — MzansiBuilds

High-level deployment and data flow: **React SPA** on **Vercel**, **FastAPI** on **Render** or **Railway**, **Supabase** for PostgreSQL and (browser-side) Auth; optional **Resend** for transactional email from the API.

```mermaid
flowchart TB
  subgraph clients["Clients"]
    Browser["Browser"]
  end

  subgraph vercel["Vercel"]
    SPA["React SPA\nCRA + Craco + React Router"]
  end

  subgraph supa["Supabase"]
    Auth["Auth\nOAuth / email"]
    DB["PostgreSQL\n(project data)"]
  end

  subgraph host["Render or Railway"]
    API["FastAPI + SQLAlchemy async"]
  end

  subgraph email["Email"]
    Resend["Resend API\noptional"]
  end

  Browser --> SPA
  SPA -->|"session / JWT"| Auth
  SPA -->|"REST /api/*\nBearer + cookies"| API
  API -->|"DATABASE_URL\nasyncpg"| DB
  API -->|"send mail"| Resend
```

## Sequence (typical authenticated request)

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as React SPA
  participant A as Supabase Auth
  participant F as FastAPI
  participant D as Postgres

  B->>S: User action
  S->>A: getSession / refresh
  A-->>S: access_token
  S->>F: HTTPS + Authorization Bearer
  F->>D: SQL via SQLAlchemy
  D-->>F: rows
  F-->>S: JSON
  S-->>B: UI update
```

## Maintenance notes

- If the frontend stops using Supabase Auth or adds a BFF, redraw the Auth and API arrows accordingly.
- If the API moves to the same host as the SPA (reverse proxy), collapse Vercel + host into one box and label routes.
- Document **environment variables** (`REACT_APP_*`, `DATABASE_URL`, `RESEND_API_KEY`) in [`frontend/.env.example`](../../frontend/.env.example) and [`backend/.env.example`](../../backend/.env.example), not only in this diagram.
