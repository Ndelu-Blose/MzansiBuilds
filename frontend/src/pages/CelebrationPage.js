import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { celebrationAPI } from '../lib/api';
import { Loader2, Trophy, Sparkles, Flame, Hand, Star, CalendarDays } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { Button } from '@/components/ui/button';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

const SORTS = [
  { id: 'recent', label: 'Recent', icon: CalendarDays },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'most_applauded', label: 'Most Applauded', icon: Hand },
];

const MAX_SPOTLIGHT_CHARS = 320;

function normalizePreviewText(value, maxChars = MAX_SPOTLIGHT_CHARS) {
  if (!value) return '';
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}...`;
}

function getProjectDisplayCopy(projectLike, maxChars = MAX_SPOTLIGHT_CHARS) {
  if (!projectLike) return '';
  const primary = normalizePreviewText(projectLike.description, maxChars);
  if (primary) return primary;
  return normalizePreviewText(projectLike.long_description || projectLike.content || projectLike.summary, maxChars);
}

export default function CelebrationPage() {
  const [projects, setProjects] = useState([]);
  const [spotlight, setSpotlight] = useState(null);
  const [summary, setSummary] = useState({ total_completed: 0, this_week: 0, this_month: 0 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState('');
  const limit = 20;
  const offsetRef = useRef(0);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const fetchProjects = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const currentOffset = loadMore ? offsetRef.current : 0;
        const response = await celebrationAPI.get({
          limit,
          offset: currentOffset,
          filter: activeFilter,
          sort: activeSort,
        });
        const items = response.data.items || [];
        const nextSpotlight = response.data.spotlight || null;
        const nextSummary = response.data.summary || { total_completed: 0, this_week: 0, this_month: 0 };

        if (loadMore) {
          setProjects((prev) => [...prev, ...items]);
        } else {
          setProjects(items);
          setSpotlight(nextSpotlight);
          setSummary(nextSummary);
        }
        setLoadError('');

        setHasMore(items.length === limit);
        if (loadMore) {
          setOffset(currentOffset + limit);
        } else {
          setOffset(limit);
        }
      } catch (error) {
        console.error('Error fetching celebration projects:', error);
        setLoadError('Could not load celebration projects right now.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeFilter, activeSort, limit]
  );

  useEffect(() => {
    fetchProjects(false);
  }, [fetchProjects]);

  const handleFilterChange = (nextFilter) => {
    setActiveFilter(nextFilter);
    setOffset(0);
    offsetRef.current = 0;
  };

  const handleSortChange = (nextSort) => {
    setActiveSort(nextSort);
    setOffset(0);
    offsetRef.current = 0;
  };

  const handleRefresh = () => {
    setOffset(0);
    offsetRef.current = 0;
    fetchProjects(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const spotlightDescription = getProjectDisplayCopy(spotlight);

  return (
    <div data-testid="celebration-page">
        <div
          className="relative mb-6 overflow-hidden rounded-b-2xl py-10"
          style={{
            backgroundImage: 'url(/images/hero-celebration.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-primary" />
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h1 className="mb-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Celebration Wall</h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Discover completed builds, celebrate creators, and applaud the projects inspiring the community.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-center shadow-sm">
                  <p className="text-muted-foreground">Completed</p>
                  <p className="text-foreground font-semibold">{summary.total_completed}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-center shadow-sm">
                  <p className="text-muted-foreground">This week</p>
                  <p className="text-foreground font-semibold">{summary.this_week}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-center shadow-sm">
                  <p className="text-muted-foreground">This month</p>
                  <p className="text-foreground font-semibold">{summary.this_month}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={activeFilter === option.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={activeSort === option.id ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleSortChange(option.id)}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {option.label}
                    </Button>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-muted-foreground">
              {loadError}
            </div>
          ) : null}

          {spotlight && (
            <div className="mb-8 rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm ring-1 ring-primary/20">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Trophy className="w-3.5 h-3.5" />
                    Spotlight project
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">{spotlight.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground/90">
                    Built by {spotlight.builder?.name || spotlight.builder?.username || 'Builder'} · Completed{' '}
                    {spotlight.completed_at ? new Date(spotlight.completed_at).toLocaleDateString() : 'recently'}
                  </p>
                  {spotlightDescription && (
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground line-clamp-4 whitespace-normal break-words">
                      {spotlightDescription}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(spotlight.tech_stack || []).slice(0, 5).map((tech) => (
                      <span key={tech} className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-foreground">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link to={`/projects/${spotlight.id}`}>View Project</Link>
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1"><Hand className="w-3.5 h-3.5" /> {spotlight.reaction_counts?.applaud || 0} applauds</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1"><Star className="w-3.5 h-3.5" /> {spotlight.reaction_counts?.star || 0} stars</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1"><Sparkles className="w-3.5 h-3.5" /> {spotlight.reaction_counts?.inspired || 0} inspired</span>
              </div>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl shadow-card p-12 text-center max-w-lg mx-auto">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No completed projects yet</h3>
              <p className="text-muted-foreground">Be the first builder to complete a project.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} showOwner={true} celebrationMode={true} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 text-center">
                  <Button variant="outline" onClick={() => fetchProjects(true)} disabled={loadingMore} data-testid="load-more-celebration-btn">
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}
