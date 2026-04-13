from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from models import CollaborationReceipt, CollaborationRequest


async def create_collaboration_receipt(
    db: AsyncSession,
    *,
    collaboration_id: str,
    owner_user_id: str,
    role_title: Optional[str],
    summary: Optional[str],
) -> Tuple[CollaborationReceipt, bool]:
    collab_result = await db.execute(
        select(CollaborationRequest)
        .options(selectinload(CollaborationRequest.project))
        .where(CollaborationRequest.id == collaboration_id)
    )
    collab = collab_result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collab.status.value != "accepted":
        raise HTTPException(status_code=400, detail="Collaboration must be accepted first")

    if not collab.project or collab.project.user_id != owner_user_id:
        raise HTTPException(status_code=403, detail="Only project owner can create receipt")

    duplicate_result = await db.execute(
        select(CollaborationReceipt).where(
            CollaborationReceipt.project_id == collab.project_id,
            CollaborationReceipt.owner_user_id == owner_user_id,
            CollaborationReceipt.collaborator_user_id == collab.requester_user_id,
        )
    )
    existing_receipt = duplicate_result.scalar_one_or_none()
    if existing_receipt:
        return existing_receipt, False

    receipt = CollaborationReceipt(
        project_id=collab.project_id,
        owner_user_id=owner_user_id,
        collaborator_user_id=collab.requester_user_id,
        collaboration_id=collab.id,
        role_title=role_title,
        started_at=collab.created_at,
        ended_at=datetime.now(timezone.utc),
        summary=summary,
        owner_acknowledged=True,
        collaborator_acknowledged=False,
    )
    db.add(receipt)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing_result = await db.execute(
            select(CollaborationReceipt).where(
                CollaborationReceipt.project_id == collab.project_id,
                CollaborationReceipt.owner_user_id == owner_user_id,
                CollaborationReceipt.collaborator_user_id == collab.requester_user_id,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing, False
        raise HTTPException(status_code=500, detail="Could not create collaboration receipt")

    await db.refresh(receipt)
    return receipt, True
