import React from 'react';
import { Zap, Target, Code, Trophy, Lightbulb } from 'lucide-react';

const stageConfig = {
  idea: {
    icon: Lightbulb,
    label: 'Idea',
    classes: 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
  },
  planning: {
    icon: Target,
    label: 'Planning',
    classes: 'text-zinc-300 bg-zinc-800 border border-zinc-700'
  },
  in_progress: {
    icon: Code,
    label: 'In Progress',
    classes: 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
  },
  testing: {
    icon: Zap,
    label: 'Testing',
    classes: 'text-purple-400 bg-purple-400/10 border border-purple-400/20'
  },
  completed: {
    icon: Trophy,
    label: 'Completed',
    classes: 'text-green-400 bg-green-400/10 border border-green-400/20'
  }
};

export default function StageBadge({ stage, showIcon = true }) {
  const config = stageConfig[stage] || stageConfig.idea;
  const Icon = config.icon;

  return (
    <span 
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-0.5 rounded-sm uppercase tracking-wider ${config.classes}`}
      data-testid={`stage-badge-${stage}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
