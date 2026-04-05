import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsAPI } from '../lib/api';
import { Loader2, Search, Filter, X, Code } from 'lucide-react';
import Layout from '../components/Layout';
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

  const clearFilters = () => {
    setSearch('');
    setStage('');
    setTech('');
    setSort('recent');
  };

  const hasActiveFilters = search || stage || tech || sort !== 'recent';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="explore-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Code className="w-8 h-8 text-primary" />
            Explore Projects
          </h1>
          <p className="text-muted-foreground mt-1">Discover what developers are building in public</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md border transition-colors ${
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} showOwner={true} />
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
    </Layout>
  );
}
