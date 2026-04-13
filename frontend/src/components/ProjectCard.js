import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users, UserRound, Bookmark } from 'lucide-react';
import StageBadge from './StageBadge';
import { bookmarksAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function ownerAvatarUrl(user) {
  if (!user) return '';
  return (user.picture || user.avatar_url || '').trim() || '';
}

function ownerDisplayName(user) {
  if (!user) return '';
  return (user.name || user.email?.split('@')[0] || '').trim() || '';
}

function ownerInitial(user) {
  const n = ownerDisplayName(user);
  if (n) return n[0].toUpperCase();
  const e = user?.email?.[0];
  if (e) return e.toUpperCase();
  return '';
}

export default function ProjectCard({ project, showOwner = true, celebrationMode = false, onBookmarkChange = null }) {
  const { isAuthenticated } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(project.is_bookmarked));
  const [bookmarkCount, setBookmarkCount] = useState(Number(project.bookmark_count || 0));
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const owner = project.user;
  const rawAvatar = ownerAvatarUrl(owner);
  const displayName = ownerDisplayName(owner);
  const initial = ownerInitial(owner);

  useEffect(() => {
    setAvatarFailed(false);
  }, [rawAvatar]);

  useEffect(() => {
    setIsBookmarked(Boolean(project.is_bookmarked));
    setBookmarkCount(Number(project.bookmark_count || 0));
  }, [project.is_bookmarked, project.bookmark_count]);

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

  const showAvatarImage = Boolean(rawAvatar) && !avatarFailed;
  const healthLabel = project.health_status ? String(project.health_status).replace('_', ' ') : '';

  const handleToggleBookmark = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated || bookmarkBusy) return;
    setBookmarkBusy(true);
    const nextBookmarked = !isBookmarked;
    try {
      const response = nextBookmarked
        ? await bookmarksAPI.add(project.id)
        : await bookmarksAPI.remove(project.id);
      setIsBookmarked(Boolean(response.data.is_bookmarked));
      setBookmarkCount(Number(response.data.bookmark_count || 0));
      if (typeof onBookmarkChange === 'function') {
        onBookmarkChange({
          projectId: project.id,
          is_bookmarked: Boolean(response.data.is_bookmarked),
          bookmark_count: Number(response.data.bookmark_count || 0),
        });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
    } finally {
      setBookmarkBusy(false);
    }
  };

  return (
    <div
      className={`bg-card border border-border rounded-xl shadow-card project-card overflow-hidden ${
        celebrationMode ? 'relative' : ''
      }`}
    >
      <Link
        to={`/projects/${project.id}`}
        className={`block p-6 ${showOwner && owner ? 'pb-4' : ''} ${
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
          <div className="flex items-center gap-2">
            <StageBadge stage={project.stage} />
            {healthLabel ? (
              <span className="font-mono text-[10px] uppercase bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
                {healthLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{formatDate(project.created_at)}</span>
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={!isAuthenticated || bookmarkBusy}
              className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-primary' : ''}`} />
              {bookmarkCount}
            </button>
          </div>
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
      </Link>

      {showOwner && owner && (
        <Link
          to={`/user/${owner.id}`}
          title="View profile"
          className="group/owner flex items-center gap-3 px-6 pb-6 pt-3 border-t border-border hover:bg-muted/40 transition-colors"
          data-testid="project-card-owner"
        >
          <span className="relative shrink-0 transition-transform duration-200 ease-out group-hover/owner:scale-105">
            {showAvatarImage ? (
              <img
                src={rawAvatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-border bg-muted"
                onError={() => setAvatarFailed(true)}
              />
            ) : initial ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                {initial}
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
            )}
          </span>
          <span className="min-w-0 text-sm font-medium text-foreground truncate group-hover/owner:text-primary transition-colors">
            {displayName || 'Member'}
          </span>
        </Link>
      )}
    </div>
  );
}
