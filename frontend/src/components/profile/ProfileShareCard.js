import React from 'react';

export default function ProfileShareCard({ card }) {
  if (!card) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">Share Preview</p>
      <h4 className="text-base font-semibold text-foreground">{card.name || card.username}</h4>
      <p className="text-sm text-muted-foreground mt-1">{card.headline || 'Builder on MzansiBuilds'}</p>
      <p className="text-xs text-muted-foreground mt-2">
        {card.builder_score_band || 'New Builder'} · {card.completed_projects_count} completed · {card.receipts_count} receipts
      </p>
    </div>
  );
}
