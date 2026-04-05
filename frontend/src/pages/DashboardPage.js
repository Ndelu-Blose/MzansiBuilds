import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, collaborationAPI } from '../lib/api';
import { 
  Plus, FolderKanban, Trophy, Users, ChevronRight, 
  Loader2, ExternalLink, CheckCircle, Clock, Zap
} from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';

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
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-amber-500">{user?.name || user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-zinc-400 mt-1">Here's what's happening with your projects</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="font-mono text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-mono text-2xl font-bold text-white">{stats.inProgress}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-mono text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-mono text-2xl font-bold text-white">{stats.pendingCollabs}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Collab Requests</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Projects</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-sm hover:bg-amber-400 transition-colors flex items-center gap-2"
                data-testid="create-project-btn"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-12 text-center">
                <FolderKanban className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                <p className="text-zinc-400 mb-6">Start building in public by creating your first project</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-sm hover:bg-amber-400 transition-colors inline-flex items-center gap-2"
                  data-testid="empty-create-project-btn"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map(project => (
                  <ProjectCard key={project.id} project={project} showOwner={false} />
                ))}
                {projects.length > 5 && (
                  <Link 
                    to="/my-projects" 
                    className="block text-center text-amber-500 hover:text-amber-400 py-2"
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Collaboration Requests</h3>
                {collabRequests.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-500 text-xs font-mono px-2 py-0.5 rounded-sm">
                    {collabRequests.length}
                  </span>
                )}
              </div>

              {collabRequests.length === 0 ? (
                <p className="text-zinc-500 text-sm">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {collabRequests.slice(0, 3).map(request => (
                    <div key={request.id} className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm text-white font-medium">{request.requester?.name || 'Unknown'}</p>
                      <p className="text-xs text-zinc-500">
                        wants to join <span className="text-amber-500">{request.project_title}</span>
                      </p>
                    </div>
                  ))}
                  {collabRequests.length > 3 && (
                    <Link 
                      to="/collaboration-requests" 
                      className="text-amber-500 text-sm hover:text-amber-400 flex items-center gap-1"
                    >
                      View all <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link 
                  to="/feed" 
                  className="flex items-center justify-between text-zinc-400 hover:text-white transition-colors py-2"
                  data-testid="view-feed-link"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Feed
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link 
                  to="/celebration" 
                  className="flex items-center justify-between text-zinc-400 hover:text-white transition-colors py-2"
                  data-testid="view-celebration-link"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Celebration Wall
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link 
                  to="/profile" 
                  className="flex items-center justify-between text-zinc-400 hover:text-white transition-colors py-2"
                  data-testid="edit-profile-link"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Edit Profile
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
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
