import React from 'react';

export default function CollaborationReceiptCard({ receipt }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{receipt.project_title || 'Project'}</p>
      {receipt.role_title ? <p className="text-xs text-muted-foreground mt-1">Role: {receipt.role_title}</p> : null}
      {receipt.summary ? <p className="text-sm text-muted-foreground mt-2">{receipt.summary}</p> : null}
      <p className="text-xs text-muted-foreground mt-2">
        {receipt.started_at ? new Date(receipt.started_at).toLocaleDateString() : 'N/A'} -{' '}
        {receipt.ended_at ? new Date(receipt.ended_at).toLocaleDateString() : 'N/A'}
      </p>
    </div>
  );
}
