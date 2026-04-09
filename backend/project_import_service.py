from datetime import datetime, timezone

from models import (
    OwnershipType,
    Project,
    ProjectRepository,
    ProjectType,
    RepoProvider,
    RepoSyncStatus,
    VerificationStatus,
)
from verification_service import compute_verification


def build_project_slug(title: str) -> str:
    return "-".join(title.lower().strip().split())[:100]


def create_imported_project(user_id: str, payload: dict, repo_data: dict, contributor_ids: set[int], connected_account_id: int) -> tuple[Project, ProjectRepository]:
    project = Project(
        user_id=user_id,
        title=payload.get("title") or repo_data.get("name"),
        description=payload.get("long_description") or repo_data.get("description"),
        short_pitch=payload.get("short_pitch"),
        long_description=payload.get("long_description"),
        category=payload.get("category"),
        stage=payload.get("stage"),
        tags_json=payload.get("tags_json"),
        looking_for_help=payload.get("looking_for_help") or False,
        roles_needed_json=payload.get("roles_needed_json"),
        demo_url=payload.get("demo_url"),
        problem_statement=payload.get("problem_statement"),
        roadmap_summary=payload.get("roadmap_summary"),
        project_type=ProjectType.repo_backed,
        repo_connected=True,
        published_at=datetime.now(timezone.utc),
    )

    ownership, verification = compute_verification(connected_account_id, repo_data["owner"]["id"], contributor_ids)
    project.ownership_type = OwnershipType(ownership.value)
    project.verification_status = VerificationStatus(verification.value)

    repo = ProjectRepository(
        provider=RepoProvider.github,
        github_repo_id=repo_data["id"],
        repo_name=repo_data["name"],
        repo_full_name=repo_data["full_name"],
        repo_url=repo_data["html_url"],
        owner_login=repo_data["owner"]["login"],
        owner_id=repo_data["owner"]["id"],
        default_branch=repo_data.get("default_branch"),
        visibility="private" if repo_data.get("private") else "public",
        description=repo_data.get("description"),
        homepage_url=repo_data.get("homepage"),
        stars_count=repo_data.get("stargazers_count") or 0,
        forks_count=repo_data.get("forks_count") or 0,
        watchers_count=repo_data.get("watchers_count") or 0,
        open_issues_count=repo_data.get("open_issues_count") or 0,
        language_primary=repo_data.get("language"),
        repo_created_at=datetime.fromisoformat(repo_data["created_at"].replace("Z", "+00:00")) if repo_data.get("created_at") else None,
        repo_updated_at=datetime.fromisoformat(repo_data["updated_at"].replace("Z", "+00:00")) if repo_data.get("updated_at") else None,
        repo_pushed_at=datetime.fromisoformat(repo_data["pushed_at"].replace("Z", "+00:00")) if repo_data.get("pushed_at") else None,
        sync_status=RepoSyncStatus.queued,
    )

    return project, repo
