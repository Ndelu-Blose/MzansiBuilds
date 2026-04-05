import React, { useState, useEffect, useCallback, useRef } from 'react';
import { celebrationAPI } from '../lib/api';
import { Loader2, Trophy, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';

export default function CelebrationPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;
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
      const response = await celebrationAPI.get({ limit, offset: currentOffset });
      const items = response.data.items || [];

      if (loadMore) {
        setProjects(prev => [...prev, ...items]);
      } else {
        setProjects(items);
      }

      setHasMore(items.length === limit);
      if (loadMore) {
        setOffset(currentOffset + limit);
      } else {
        setOffset(limit);
      }
    } catch (error) {
      console.error('Error fetching celebration projects:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchProjects(false);
  }, [fetchProjects]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="celebration-page">
        {/* Hero Section */}
        <div 
          className="relative py-16 mb-8"
          style={{
            backgroundImage: 'url(/images/hero-celebration.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-zinc-950/80"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Trophy className="w-8 h-8 text-amber-500" />
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4">
              Celebration Wall
            </h1>
            <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
              Projects that made it to the finish line. Congratulations to these builders!
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {projects.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-12 text-center max-w-lg mx-auto">
              <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No completed projects yet</h3>
              <p className="text-zinc-400">
                Be the first to complete a project and join the celebration!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    showOwner={true}
                    celebrationMode={true}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() => fetchProjects(true)}
                    disabled={loadingMore}
                    className="bg-transparent text-white border border-zinc-700 px-8 py-3 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    data-testid="load-more-celebration-btn"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
