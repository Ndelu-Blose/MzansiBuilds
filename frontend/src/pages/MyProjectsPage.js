import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, FolderKanban } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { projectsAPI } from '../lib/api';
import { Button } from '@/components/ui/button';

export default function MyProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await projectsAPI.getMyProjects();
      setProjects(res.data.items || []);
    } catch (_err) {
      setError('Unable to load projects right now. Please retry.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">Owned and active collaboration projects in your workspace.</p>
          </div>
          <Button variant="outline" onClick={loadProjects}>Refresh</Button>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-5">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="mt-3" onClick={loadProjects}>Retry</Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">No projects yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Create or import your first project from the dashboard.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} showOwner={false} />
            ))}
          </div>
        )}
    </div>
  );
}
