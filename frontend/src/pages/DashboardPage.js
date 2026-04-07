import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, collaborationAPI } from '../lib/api';
import { 
  Plus, FolderKanban, Trophy, Users, ChevronRight, 
  Loader2, ExternalLink, Zap
} from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [collabRequests, setCollabRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pendingCollabs: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, collabsRes] = await Promise.all([
        projectsAPI.getMyProjects(),
        collaborationAPI.getMyRequests()
      ]);

      const projectList = projectsRes.data.items || [];
      setProjects(projectList);

      const collabList = collabsRes.data.items || [];
      setCollabRequests(collabList.filter(c => c.status === 'pending'));

      // Calculate stats
      setStats({
        total: projectList.length,
        completed: projectList.filter(p => p.stage === 'completed').length,
        inProgress: projectList.filter(p => p.stage === 'in_progress').length,
        pendingCollabs: collabList.filter(c => c.status === 'pending').length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back, <span className="text-primary">{user?.name || user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your projects</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-primary" />
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-card">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{stats.pendingCollabs}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Collab Requests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
              <Button onClick={() => setShowCreateModal(true)} data-testid="create-project-btn">
                <Plus className="w-4 h-4" />
                Import from GitHub
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="bg-card border border-border rounded-xl shadow-card p-12 text-center">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">Start building in public by importing code or creating an idea project</p>
                <Button onClick={() => setShowCreateModal(true)} data-testid="empty-create-project-btn">
                  <Plus className="w-4 h-4" />
                  Import from GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map(project => (
                  <ProjectCard key={project.id} project={project} showOwner={false} />
                ))}
                {projects.length > 5 && (
                  <Link
                    to="/my-projects"
                    className="block text-center text-primary hover:text-primary-hover py-2 text-sm font-medium"
                  >
                    View all {projects.length} projects
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Collaboration Requests */}
            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Collaboration Requests</h3>
                {collabRequests.length > 0 && (
                  <span className="bg-accent text-primary text-xs font-mono px-2 py-0.5 rounded-md border border-border">
                    {collabRequests.length}
                  </span>
                )}
              </div>

              {collabRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {collabRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <p className="text-sm text-foreground font-medium">{request.requester?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        wants to join <span className="text-primary font-medium">{request.project_title}</span>
                      </p>
                    </div>
                  ))}
                  {collabRequests.length > 3 && (
                    <Link
                      to="/collaboration-requests"
                      className="text-primary text-sm hover:text-primary-hover flex items-center gap-1 font-medium"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-1">
                <NavLink
                  to="/feed"
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors border-l-4 ${
                      isActive
                        ? 'bg-accent text-foreground border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`
                  }
                  data-testid="view-feed-link"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Feed
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </NavLink>
                <NavLink
                  to="/celebration"
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors border-l-4 ${
                      isActive
                        ? 'bg-accent text-foreground border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`
                  }
                  data-testid="view-celebration-link"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Celebration Wall
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors border-l-4 ${
                      isActive
                        ? 'bg-accent text-foreground border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`
                  }
                  data-testid="edit-profile-link"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Edit Profile
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreated={handleProjectCreated}
          />
        )}
      </div>
    </Layout>
  );
}
