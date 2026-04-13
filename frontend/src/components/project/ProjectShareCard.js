import React from 'react';

export default function ProjectShareCard({ card }) {
  if (!card) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">Share Preview</p>
      <h4 className="text-base font-semibold text-foreground">{card.title}</h4>
      <p className="text-sm text-muted-foreground mt-1">
        {card.stage} · {card.health_status} · {card.owner_score_band || 'Unrated owner'}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Roles: {(card.roles_needed || []).join(', ') || 'Not specified'}
      </p>
    </div>
  );
}
