import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, discoveryAPI } from '../lib/api';
import { Loader2, Search, Filter, X, Code } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { Button } from '@/components/ui/button';

const stages = [
  { value: '', label: 'All Stages' },
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'completed', label: 'Completed' },
];

const popularTech = ['React', 'Python', 'Node.js', 'TypeScript', 'PostgreSQL', 'FastAPI', 'Next.js', 'MongoDB'];

const fieldClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function ExplorePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [tech, setTech] = useState('');
  const [sort, setSort] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [trendingProjects, setTrendingProjects] = useState([]);
  const [trendingBuilders, setTrendingBuilders] = useState([]);
  const trendingFetched = useRef(false);

  const limit = 12;
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
        const params = {
          limit,
          offset: currentOffset,
          sort,
        };

        if (search) params.search = search;
        if (stage) params.stage = stage;
        if (tech) params.tech = tech;

        const response = await projectsAPI.list(params);
        const items = response.data.items || [];

        if (loadMore) {
          setProjects((prev) => [...prev, ...items]);
          setOffset(currentOffset + limit);
        } else {
          setProjects(items);
          setOffset(limit);
        }

        setTotal(response.data.total || 0);
        setHasMore(items.length === limit);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, stage, tech, sort, limit]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProjects(false);
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchProjects]);

  useEffect(() => {
    if (trendingFetched.current) return;
    trendingFetched.current = true;
    Promise.all([
      discoveryAPI.getTrendingProjects({ limit: 4 }),
      discoveryAPI.getTrendingBuilders({ limit: 4 }),
    ])
      .then(([tp, tb]) => {
        setTrendingProjects(tp.data.items || []);
        setTrendingBuilders(tb.data.items || []);
      })
      .catch(() => {
        setTrendingProjects([]);
        setTrendingBuilders([]);
      });
  }, []);

  const clearFilters = () => {
    setSearch('');
    setStage('');
    setTech('');
    setSort('recent');
  };

  const hasActiveFilters = search || stage || tech || sort !== 'recent';

  const builderInitial = (builder) => {
    const name = builder?.user?.name || builder?.user?.email || 'B';
    return name[0]?.toUpperCase() || 'B';
  };

  return (
    <div className="page-shell" data-testid="explore-page">
        <div className="section-gap">
          <h1 className="page-title flex items-center gap-3 text-3xl">
            <Code className="w-8 h-8 text-primary" />
            Explore Projects
          </h1>
          <p className="text-muted-foreground mt-1">Discover what developers are building in public</p>
          <div className="mt-3">
            <Link to="/open-roles" className="text-sm text-primary hover:underline">Browse Open Roles Board</Link>
          </div>
        </div>

        <div className="card-shell section-gap">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px_190px_auto]">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className={`${fieldClass} pl-10`}
                data-testid="search-input"
              />
            </div>

            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={fieldClass}
              data-testid="stage-filter"
            >
              {stages.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={fieldClass}
              data-testid="sort-filter"
            >
              <option value="recent">Most Recent</option>
              <option value="active">Most Active</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 transition-colors ${
                showFilters || tech
                  ? 'bg-accent border-primary/40 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              data-testid="toggle-filters-btn"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Filter by Technology</p>
              <div className="flex flex-wrap gap-2">
                {popularTech.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTech(tech === t ? '' : t)}
                    className={`font-mono text-xs px-3 py-1.5 rounded-md transition-colors ${
                      tech === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                    data-testid={`tech-filter-${t.toLowerCase()}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  value={tech}
                  onChange={(e) => setTech(e.target.value)}
                  placeholder="Or type a technology..."
                  className={`${fieldClass} text-sm md:w-64`}
                  data-testid="tech-input"
                />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {search && (
                <span className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md border border-border">
                  Search: "{search}"
                  <button type="button" onClick={() => setSearch('')} className="hover:text-primary" aria-label="Clear search">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {stage && (
                <span className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md border border-border">
                  Stage: {stage.replace('_', ' ')}
                  <button type="button" onClick={() => setStage('')} className="hover:text-primary" aria-label="Clear stage">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {tech && (
                <span className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-md border border-border">
                  Tech: {tech}
                  <button type="button" onClick={() => setTech('')} className="hover:text-primary" aria-label="Clear tech">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button type="button" onClick={clearFilters} className="text-xs text-primary hover:text-primary-hover font-medium" data-testid="clear-filters-btn">
                Clear all
              </button>
            </div>
          )}
        </div>

        {!loading && (
          <p className="text-sm text-muted-foreground mb-6">
            Showing {projects.length} of {total} projects
          </p>
        )}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="section-title">Trending Projects</h3>
                <Link to="/celebration" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <ul className="space-y-2 text-sm">
                {trendingProjects.slice(0, 3).map((p) => (
                  <li key={p.id} className="rounded-md border border-border px-3 py-2">
                    <Link to={`/projects/${p.id}`} className="font-medium text-foreground hover:text-primary">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="section-title mb-2">Momentum Builders</h3>
              <ul className="space-y-2 text-sm">
                {trendingBuilders.slice(0, 3).map((b, i) => (
                  <li key={b.user?.id || i} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {builderInitial(b)}
                      </span>
                      <span className="font-medium text-foreground">{b.user?.name || 'Builder'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Score {b.momentum_score || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-card border border-border rounded-xl shadow-card p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Be the first to create a project!'}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="text-primary hover:text-primary-hover font-medium">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} showOwner={true} showQuickActions={true} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <Button variant="outline" onClick={() => fetchProjects(true)} disabled={loadingMore} data-testid="load-more-btn">
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load More Projects'}
                </Button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
