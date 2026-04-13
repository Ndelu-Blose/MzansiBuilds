import React from 'react';

export default function BuilderScoreCard({ score = 0, band = 'New Builder', breakdown = {} }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Builder Score</h3>
        <span className="font-mono text-2xl font-bold text-foreground">{score}</span>
      </div>
      <p className="text-sm text-primary mt-1">{band}</p>
      <div className="mt-4 space-y-1">
        {Object.entries(breakdown || {}).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
            <span className="font-mono text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
