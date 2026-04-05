import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles, Users } from 'lucide-react';
import StageBadge from './StageBadge';

export default function ProjectCard({ project, showOwner = true, celebrationMode = false }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate milestone progress if available
  const milestoneProgress = project.milestones 
    ? {
        completed: project.milestones.filter(m => m.is_completed).length,
        total: project.milestones.length
      }
    : null;

  return (
    <Link 
      to={`/projects/${project.id}`}
      className={`block bg-zinc-900 border border-zinc-800 p-6 rounded-sm project-card ${
        celebrationMode ? 'relative overflow-hidden' : ''
      }`}
      data-testid="project-card"
    >
      {celebrationMode && (
        <div className="absolute top-0 right-0 p-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <StageBadge stage={project.stage} />
        <span className="font-mono text-xs text-zinc-500">
          {formatDate(project.created_at)}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
        {project.title}
      </h3>

      {project.description && (
        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Tech Stack */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tech_stack.slice(0, 4).map((tech, i) => (
            <span 
              key={i} 
              className="font-mono text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm"
            >
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 4 && (
            <span className="font-mono text-xs text-zinc-500">
              +{project.tech_stack.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Support Needed Badge */}
      {project.support_needed && (
        <div className="flex items-center gap-1 text-xs text-amber-400 mb-4">
          <Users className="w-3 h-3" />
          <span>Looking for help</span>
        </div>
      )}

      {/* Milestone Progress Bar */}
      {milestoneProgress && milestoneProgress.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>Milestones</span>
            <span>{milestoneProgress.completed}/{milestoneProgress.total}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${(milestoneProgress.completed / milestoneProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Owner */}
      {showOwner && project.user && (
        <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
          <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
            {project.user.name?.[0]?.toUpperCase() || project.user.email?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-zinc-400">
            {project.user.name || project.user.email?.split('@')[0]}
          </span>
        </div>
      )}
    </Link>
  );
}
