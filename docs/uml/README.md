# UML diagrams (MzansiBuilds)

Diagrams are authored as **Mermaid** inside Markdown so they render on GitHub and are easy to diff and edit.

| Diagram | File | Purpose |
|--------|------|--------|
| Use case | [use-case.md](use-case.md) | Actors and user stories / use cases |
| ERD | [erd.md](erd.md) | Domain entities and relationships |
| Architecture | [architecture.md](architecture.md) | Deployment and request flow |

## Editing

1. Open the `.md` file and change the fenced `mermaid` block(s).
2. Validate syntax in the [Mermaid Live Editor](https://mermaid.live/) if needed.
3. Keep the **“Maintenance notes”** section at the bottom of each file in sync when the product or schema changes.

## Conventions

- **Implemented today** vs **planned** is called out in ERD and use-case notes where the codebase differs from the target domain model.
- Table/column names in ERD align with [`backend/models.py`](../../backend/models.py) where applicable.
