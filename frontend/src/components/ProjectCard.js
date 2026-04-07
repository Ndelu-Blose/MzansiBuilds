import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import StageBadge from './StageBadge';

export default function ProjectCard({ project, showOwner = true, celebrationMode = false }) {
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const milestoneProgress = project.milestones
    ? {
        completed: project.milestones.filter((m) => m.is_completed).length,
        total: project.milestones.length,
      }
    : null;

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`block bg-card border border-border p-6 rounded-xl shadow-card project-card ${
        celebrationMode ? 'relative overflow-hidden' : ''
      }`}
      data-testid="project-card"
    >
      {celebrationMode && (
        <div className="absolute top-0 right-0 p-2">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <StageBadge stage={project.stage} />
        <span className="font-mono text-xs text-muted-foreground">{formatDate(project.created_at)}</span>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">{project.title}</h3>

      {project.description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{project.description}</p>
      )}

      {project.tech_stack && project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tech_stack.slice(0, 4).map((tech, i) => (
            <span key={i} className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded-md border border-border">
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 4 && (
            <span className="font-mono text-xs text-muted-foreground">+{project.tech_stack.length - 4}</span>
          )}
        </div>
      )}

      {project.support_needed && (
        <div className="flex items-center gap-1 text-xs text-primary mb-4 font-medium">
          <Users className="w-3 h-3" />
          <span>Looking for help</span>
        </div>
      )}

      {milestoneProgress && milestoneProgress.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Milestones</span>
            <span>
              {milestoneProgress.completed}/{milestoneProgress.total}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(milestoneProgress.completed / milestoneProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {showOwner && project.user && (
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
            {project.user.name?.[0]?.toUpperCase() || project.user.email?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-muted-foreground">
            {project.user.name || project.user.email?.split('@')[0]}
          </span>
        </div>
      )}
    </Link>
  );
}
