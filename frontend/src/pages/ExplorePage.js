import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsAPI } from '../lib/api';
import { Loader2, Search, Filter, X, Code } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import StageBadge from '../components/StageBadge';

const stages = [
  { value: '', label: 'All Stages' },
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'completed', label: 'Completed' }
];

const popularTech = ['React', 'Python', 'Node.js', 'TypeScript', 'PostgreSQL', 'FastAPI', 'Next.js', 'MongoDB'];

export default function ExplorePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
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

  const fetchProjects = useCallback(async (loadMore = false) => {
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
        sort
      };
      
      if (search) params.search = search;
      if (stage) params.stage = stage;
      if (tech) params.tech = tech;

      const response = await projectsAPI.list(params);
      const items = response.data.items || [];
      
      if (loadMore) {
        setProjects(prev => [...prev, ...items]);
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
  }, [search, stage, tech, sort, limit]);

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Code className="w-8 h-8 text-amber-500" />
            Explore Projects
          </h1>
          <p className="text-zinc-400 mt-1">
            Discover what developers are building in public
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 pl-10 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                data-testid="search-input"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="stage-filter"
            >
              {stages.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="sort-filter"
            >
              <option value="recent">Most Recent</option>
              <option value="active">Most Active</option>
            </select>

            {/* Toggle Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border transition-colors ${
                showFilters || tech 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
              data-testid="toggle-filters-btn"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400 mb-3">Filter by Technology</p>
              <div className="flex flex-wrap gap-2">
                {popularTech.map(t => (
                  <button
                    key={t}
                    onClick={() => setTech(tech === t ? '' : t)}
                    className={`font-mono text-xs px-3 py-1.5 rounded-sm transition-colors ${
                      tech === t 
                        ? 'bg-amber-500 text-zinc-950' 
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                    data-testid={`tech-filter-${t.toLowerCase()}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              
              {/* Tech Input */}
              <div className="mt-3">
                <input
                  type="text"
                  value={tech}
                  onChange={(e) => setTech(e.target.value)}
                  placeholder="Or type a technology..."
                  className="w-full md:w-64 bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  data-testid="tech-input"
                />
              </div>
            </div>
          )}

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-zinc-500">Active filters:</span>
              
              {search && (
                <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-sm">
                  Search: "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {stage && (
                <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-sm">
                  Stage: {stage.replace('_', ' ')}
                  <button onClick={() => setStage('')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {tech && (
                <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-sm">
                  Tech: {tech}
                  <button onClick={() => setTech('')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              <button
                onClick={clearFilters}
                className="text-xs text-amber-500 hover:text-amber-400"
                data-testid="clear-filters-btn"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <p className="text-sm text-zinc-500 mb-6">
            Showing {projects.length} of {total} projects
          </p>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-12 text-center">
            <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-zinc-400 mb-4">
              {hasActiveFilters 
                ? "Try adjusting your filters"
                : "Be the first to create a project!"
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-amber-500 hover:text-amber-400"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} showOwner={true} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => fetchProjects(true)}
                  disabled={loadingMore}
                  className="bg-transparent text-white border border-zinc-700 px-8 py-3 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  data-testid="load-more-btn"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Load More Projects'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
