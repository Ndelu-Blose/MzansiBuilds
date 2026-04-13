import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function SuggestedCollaboratorCard({ candidate }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {candidate.name || candidate.username || 'Contributor'}
        </p>
        <Badge variant="outline" className="font-mono">{candidate.match_score}</Badge>
      </div>
      {candidate.headline && <p className="text-xs text-muted-foreground mt-1">{candidate.headline}</p>}
      <p className="text-xs text-muted-foreground mt-2">
        {candidate.builder_score_band || 'New Builder'} • {candidate.completed_projects_count || 0} completed • {candidate.receipts_count || 0} receipts
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Matched: {(candidate.matched_skills || []).join(', ') || 'N/A'}
      </p>
    </div>
  );
}
