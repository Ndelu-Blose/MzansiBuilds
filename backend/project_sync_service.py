import json
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from github_api_service import (
    get_readme_preview,
    get_recent_commits,
    get_repo_contributors,
    get_repo_languages,
    get_root_contents,
)
from models import (
    ProjectCommit,
    ProjectContributor,
    ProjectFileHighlight,
    ProjectLanguage,
    ProjectRepoSnapshot,
    ProjectRepository,
    RepoSyncJob,
    RepoSyncStatus,
)


IMPORTANT_FILE_MAP = {
    "README.md": "readme",
    "README": "readme",
    "package.json": "package_manifest",
    "pyproject.toml": "package_manifest",
    "requirements.txt": "package_manifest",
    "Dockerfile": "docker_config",
    "docker-compose.yml": "docker_config",
    "LICENSE": "license",
    ".env.example": "env_example",
    "tsconfig.json": "typescript_config",
    "vite.config.ts": "build_config",
    "vite.config.js": "build_config",
    "tailwind.config.ts": "build_config",
    "tailwind.config.js": "build_config",
}


def detect_frameworks(file_names: list[str]) -> list[str]:
    frameworks = []
    normalized = {name.lower() for name in file_names}
    if "next.config.js" in normalized or "next.config.ts" in normalized:
        frameworks.append("Next.js")
    if "package.json" in normalized:
        frameworks.append("Node.js")
    if "vite.config.js" in normalized or "vite.config.ts" in normalized:
        frameworks.append("Vite")
    if "package.json" in file_names:
        frameworks.append("React")
    if "main.py" in normalized or "app.py" in normalized or "requirements.txt" in normalized or "pyproject.toml" in normalized:
        frameworks.append("FastAPI")
    if "tsconfig.json" in file_names:
        frameworks.append("TypeScript")
    if "tailwind.config.js" in file_names or "tailwind.config.ts" in file_names:
        frameworks.append("Tailwind")
    if "dockerfile" in normalized or "docker-compose.yml" in normalized:
        frameworks.append("Docker")
    if ".github" in file_names or ".github/workflows" in file_names:
        frameworks.append("GitHub Actions")
    if "requirements.txt" in file_names or "pyproject.toml" in file_names:
        frameworks.append("Python")
    # Preserve order while deduping.
    return list(dict.fromkeys(frameworks))


async def run_repo_sync(db: AsyncSession, project_repository: ProjectRepository, token: str) -> None:
    owner, repo = project_repository.repo_full_name.split("/", 1)
    job = RepoSyncJob(project_repository_id=project_repository.id, sync_type="manual_refresh", status=RepoSyncStatus.running)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        languages = await get_repo_languages(token, owner, repo)
        contributors = await get_repo_contributors(token, owner, repo)
        commits = await get_recent_commits(token, owner, repo)
        readme = await get_readme_preview(token, owner, repo)
        contents = await get_root_contents(token, owner, repo)

        await db.execute(delete(ProjectLanguage).where(ProjectLanguage.project_repository_id == project_repository.id))
        total_bytes = sum(languages.values()) if languages else 0
        for lang, bytes_used in languages.items():
            pct = int((bytes_used / total_bytes) * 100) if total_bytes else 0
            db.add(ProjectLanguage(project_repository_id=project_repository.id, language_name=lang, bytes=bytes_used, percentage=pct))

        await db.execute(delete(ProjectContributor).where(ProjectContributor.project_id == project_repository.project_id))
        for c in contributors:
            db.add(
                ProjectContributor(
                    project_id=project_repository.project_id,
                    github_user_id=c.get("id"),
                    github_username=c.get("login"),
                    display_name=c.get("login"),
                    avatar_url=c.get("avatar_url"),
                    is_verified=True,
                )
            )

        recent = commits[:20]
        for c in recent:
            sha = c.get("sha")
            if not sha:
                continue
            exists = await db.execute(
                select(ProjectCommit).where(
                    ProjectCommit.project_repository_id == project_repository.id,
                    ProjectCommit.commit_sha == sha,
                )
            )
            if exists.scalar_one_or_none():
                continue
            commit_data = c.get("commit") or {}
            message = commit_data.get("message") or ""
            headline, _, body = message.partition("\n")
            db.add(
                ProjectCommit(
                    project_id=project_repository.project_id,
                    project_repository_id=project_repository.id,
                    commit_sha=sha,
                    author_github_id=(c.get("author") or {}).get("id"),
                    author_login=(c.get("author") or {}).get("login"),
                    author_name=((commit_data.get("author") or {}).get("name")),
                    message_headline=headline,
                    message_body=body or None,
                    committed_at=datetime.fromisoformat((commit_data.get("author") or {}).get("date", "").replace("Z", "+00:00")) if (commit_data.get("author") or {}).get("date") else None,
                    commit_url=c.get("html_url"),
                )
            )

        await db.execute(delete(ProjectFileHighlight).where(ProjectFileHighlight.project_repository_id == project_repository.id))
        file_names = []
        important_files = []
        for item in contents:
            name = item.get("name")
            if not name:
                continue
            file_names.append(name)
            cls = IMPORTANT_FILE_MAP.get(name)
            if not cls and name == ".github":
                cls = "ci_config"
            if not cls and name in {"tests", "__tests__", "test"}:
                cls = "test_directory"
            if cls:
                important_files.append(name)
                db.add(
                    ProjectFileHighlight(
                        project_repository_id=project_repository.id,
                        path=item.get("path") or name,
                        item_type=item.get("type") or "file",
                        is_key_file=True,
                        classification=cls,
                    )
                )

        project_repository.readme_preview = readme
        project_repository.detected_frameworks_json = json.dumps(detect_frameworks(file_names))
        project_repository.important_files_json = json.dumps(important_files)
        project_repository.contributors_count = len(contributors)
        project_repository.last_commit_date = (
            datetime.fromisoformat(((recent[0].get("commit") or {}).get("author") or {}).get("date", "").replace("Z", "+00:00"))
            if recent and ((recent[0].get("commit") or {}).get("author") or {}).get("date")
            else None
        )
        project_repository.last_synced_at = datetime.now(timezone.utc)
        project_repository.sync_status = RepoSyncStatus.completed
        project_repository.sync_error = None

        db.add(
            ProjectRepoSnapshot(
                project_repository_id=project_repository.id,
                stars_count=project_repository.stars_count or 0,
                forks_count=project_repository.forks_count or 0,
                open_issues_count=project_repository.open_issues_count or 0,
                contributors_count=len(contributors),
                commits_count=len(recent),
                last_commit_at=project_repository.last_commit_date,
            )
        )

        job.status = RepoSyncStatus.completed
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception as exc:
        project_repository.sync_status = RepoSyncStatus.failed
        project_repository.sync_error = str(exc)
        job.status = RepoSyncStatus.failed
        job.error_message = str(exc)
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()
