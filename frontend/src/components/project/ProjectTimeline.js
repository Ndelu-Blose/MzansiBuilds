import React from 'react';
import { Clock3, Flag, Milestone, ActivitySquare, GitBranch } from 'lucide-react';

const iconByType = {
  project_created: Flag,
  project_completed: Flag,
  milestone_updated: Milestone,
  update_posted: ActivitySquare,
  collaboration_event: Clock3,
  repo_sync: GitBranch,
};

function formatDate(value) {
  if (!value) return 'Unknown time';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Unknown time';
  }
}

export default function ProjectTimeline({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = iconByType[item.type] || Clock3;
        return (
          <div key={item.id} className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">{item.label}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(item.timestamp)}
              {item.actor ? ` • ${item.actor}` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}
