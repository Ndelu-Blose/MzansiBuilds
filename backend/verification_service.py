from models import VerificationStatus, OwnershipType


def compute_verification(connected_account_id: int, repo_owner_id: int, contributor_ids: set[int]) -> tuple[OwnershipType, VerificationStatus]:
    if connected_account_id == repo_owner_id:
        return OwnershipType.owner, VerificationStatus.verified_owner
    if connected_account_id in contributor_ids:
        return OwnershipType.contributor, VerificationStatus.verified_contributor
    return OwnershipType.external, VerificationStatus.unverified
