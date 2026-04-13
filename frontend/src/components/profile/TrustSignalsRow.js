import React from 'react';

export default function TrustSignalsRow({
  band,
  completedProjects = 0,
  receipts = 0,
  lastActiveAt = null,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {band ? <span className="px-2 py-0.5 rounded border border-border bg-muted text-foreground">{band}</span> : null}
      <span className="px-2 py-0.5 rounded border border-border bg-muted text-foreground">
        {completedProjects} completed
      </span>
      <span className="px-2 py-0.5 rounded border border-border bg-muted text-foreground">
        {receipts} receipts
      </span>
      <span className="text-muted-foreground">
        Last active {lastActiveAt ? new Date(lastActiveAt).toLocaleDateString() : 'unknown'}
      </span>
    </div>
  );
}
