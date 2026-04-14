import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, collaborationAPI, notificationsAPI, bookmarksAPI, discoveryAPI, digestAPI, activationAPI } from '../lib/api';
import {
  Plus,
  FolderKanban,
  Trophy,
  Users,
  ChevronRight,
  Loader2,
  ExternalLink,
  Zap,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import { Button } from '@/components/ui/button';

function formatNotifWhen(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const { user, isAuthenticated, authReady } = useAuth();
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
  const [notifPreview, setNotifPreview] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoadError, setNotifLoadError] = useState(false);
  const [savedProjects, setSavedProjects] = useState([]);
  const [matchedProjects, setMatchedProjects] = useState([]);
  const [trendingProjects, setTrendingProjects] = useState([]);
  const [trendingBuilders, setTrendingBuilders] = useState([]);
  const [digestPreview, setDigestPreview] = useState(null);
  const [activationState, setActivationState] = useState({
    has_projects: false,
    has_matches: false,
    has_activity: false,
    skills_count: 0,
    first_match_count: 0,
  });
  const [projectsLoadError, setProjectsLoadError] = useState('');

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !authReady) return;
    setLoading(true);
    setProjectsLoadError('');

    try {
      const [projectsRes, collabsRes, savedRes, matchedRes, trendingProjectsRes, trendingBuildersRes, digestRes, activationStateRes] = await Promise.all([
        projectsAPI.getMyProjects(),
        collaborationAPI.getMyRequests(),
        bookmarksAPI.list({ limit: 5, offset: 0 }),
        projectsAPI.getMatched({ limit: 5, offset: 0 }),
        discoveryAPI.getTrendingProjects({ limit: 5 }),
        discoveryAPI.getTrendingBuilders({ limit: 5 }),
        digestAPI.getPreview(),
        activationAPI.getDashboardState(),
      ]);

      const projectList = projectsRes.data.items || [];
      setProjects(projectList);

      const collabList = collabsRes.data.items || [];
      setCollabRequests(collabList.filter(c => c.status === 'pending'));
      setSavedProjects((savedRes.data.items || []).map((item) => item.project).filter(Boolean));
      setMatchedProjects(matchedRes.data.items || []);
      setTrendingProjects(trendingProjectsRes.data.items || []);
      setTrendingBuilders(trendingBuildersRes.data.items || []);
      setDigestPreview(digestRes.data || null);
      setActivationState(activationStateRes.data || {
        has_projects: false,
        has_matches: false,
        has_activity: false,
        skills_count: 0,
        first_match_count: 0,
      });

      setStats({
        total: projectList.length,
        completed: projectList.filter(p => p.stage === 'completed').length,
        inProgress: projectList.filter(p => p.stage === 'in_progress').length,
        pendingCollabs: collabList.filter(c => c.status === 'pending').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setProjectsLoadError('We could not load your workspace projects right now. Please retry.');
      // Preserve current cards when a refresh fails, so recent optimistic updates remain visible.
      setStats({
        total: 0,
        completed: 0,
        inProgress: 0,
        pendingCollabs: 0,
      });
    } finally {
      setLoading(false);
    }

    try {
      setNotifLoadError(false);
      const notifRes = await notificationsAPI.list({ limit: 6, offset: 0 });
      setNotifPreview(notifRes.data.items || []);
      setNotifUnread(typeof notifRes.data.unread_count === 'number' ? notifRes.data.unread_count : 0);
    } catch (_err) {
      setNotifPreview([]);
      setNotifUnread(0);
      setNotifLoadError(true);
    }
  }, [isAuthenticated, authReady]);

  useEffect(() => {
    fetchData();
  }, [fetchData, user?.id, authReady]);

  const hasStats = useMemo(
    () => stats.total > 0 || stats.completed > 0 || stats.inProgress > 0 || stats.pendingCollabs > 0,
    [stats]
  );

  const handleProjectCreated = (newProject) => {
    setProjectsLoadError('');
    setProjects((prev) => [newProject, ...prev]);
    setStats((prev) => ({ ...prev, total: prev.total + 1 }));
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome back, <span className="text-primary">{user?.name || user?.email?.split('@')[0]}</span>
            </h1>
            <p className="text-muted-foreground mt-1">Your build in public workspace</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
            <Button onClick={() => setShowCreateModal(true)} data-testid="create-project-btn">
              <Plus className="w-4 h-4" />
              Import GitHub
            </Button>
          </div>
        </div>

        {hasStats ? (
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Collaborations</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Tip: add your first project or import a GitHub repo to start building momentum.
          </div>
        )}

        {activationState.first_match_count > 0 && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{activationState.first_match_count} projects</span> need your skills right now.
              {' '}
              <Link to="/explore" className="text-primary hover:underline">Explore matches</Link>
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Your Projects</h2>
              <Button variant="ghost" onClick={fetchData}>
                Refresh
              </Button>
            </div>

            {projectsLoadError ? (
              <div className="bg-card border border-destructive/30 rounded-xl shadow-card p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">Project data could not load</h3>
                    <p className="text-sm text-muted-foreground mt-1">{projectsLoadError}</p>
                    <Button className="mt-4" onClick={fetchData}>Retry loading projects</Button>
                  </div>
                </div>
              </div>
            ) : null}
            {projects.length === 0 ? (
              <div className="bg-card border border-border rounded-xl shadow-card p-12 text-center">
                <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">You have not created any projects yet</h3>
                <p className="text-muted-foreground mb-6">Start building in public by importing a repo, creating an idea, or joining a collaboration.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>
                  <Button onClick={() => setShowCreateModal(true)} data-testid="empty-create-project-btn">
                    <Plus className="w-4 h-4" />
                    Import from GitHub
                  </Button>
                </div>
                {activationState.skills_count === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">Add skills in your profile to unlock matching.</p>
                )}
              </div>
            ) : (
              <div className="space-y-8">
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

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Matched for You</h2>
                  {matchedProjects.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl shadow-card p-6 text-sm text-muted-foreground">
                      {activationState.skills_count === 0
                        ? 'Add skills to your profile and we will surface projects seeking those skills.'
                        : 'No matches yet. Try exploring Open Roles or check back after new projects are posted.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matchedProjects.map((project) => (
                        <ProjectCard key={`matched-${project.id}`} project={project} showOwner={true} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Saved Projects</h2>
                  {savedProjects.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl shadow-card p-6 text-sm text-muted-foreground">
                      Bookmark interesting projects to keep a quick watchlist here.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedProjects.map((project) => (
                        <ProjectCard key={`saved-${project.id}`} project={project} showOwner={true} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activity</div>
            <div
              className="bg-card border border-border rounded-xl shadow-card p-6"
              data-testid="dashboard-notifications-preview"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  Notifications
                </h3>
                {notifUnread > 0 ? (
                  <span className="bg-primary/15 text-primary text-xs font-mono px-2 py-0.5 rounded-md border border-primary/30">
                    {notifUnread} unread
                  </span>
                ) : null}
              </div>
              {notifLoadError ? (
                <p
                  className="text-muted-foreground text-sm leading-relaxed"
                  data-testid="dashboard-notifications-unavailable"
                >
                  Notifications unavailable right now.
                </p>
              ) : notifPreview.length === 0 ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You are all caught up. Comments, collaboration requests, and project alerts also arrive by email when
                  your account has a verified address and email is configured.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notifPreview.map((n) => (
                    <li key={n.id}>
                      {n.project_id ? (
                        <Link
                          to={`/projects/${n.project_id}`}
                          className="block rounded-md border border-transparent px-1 -mx-1 py-1 hover:bg-muted/80 hover:border-border transition-colors"
                        >
                          <p className="text-xs text-muted-foreground">{formatNotifWhen(n.created_at)}</p>
                          <p className="text-sm font-medium text-foreground line-clamp-2">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        </Link>
                      ) : (
                        <div className="px-1 py-1">
                          <p className="text-xs text-muted-foreground">{formatNotifWhen(n.created_at)}</p>
                          <p className="text-sm font-medium text-foreground line-clamp-2">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!notifLoadError ? (
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  Open the full notifications center from the sidebar or header bell to manage unread activity.
                </p>
              ) : null}
            </div>

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

            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick Access</div>
            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-1">
                <NavLink
                  to="/open-roles"
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors border-l-4 ${
                      isActive
                        ? 'bg-accent text-foreground border-primary'
                        : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Open Roles Board
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </NavLink>
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

            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Insights</div>
            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-3">Trending Projects</h3>
              {trendingProjects.length === 0 ? <p className="text-sm text-muted-foreground">No momentum yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {trendingProjects.slice(0, 3).map((p) => (
                    <li key={p.id}><Link to={`/projects/${p.id}`} className="hover:text-primary">{p.title}</Link></li>
                  ))}
                </ul>
              )}
              <h3 className="font-semibold text-foreground mt-5 mb-3">Momentum Builders</h3>
              {trendingBuilders.length === 0 ? <p className="text-sm text-muted-foreground">No builder momentum yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {trendingBuilders.slice(0, 3).map((b) => (
                    <li key={b.user?.id || b.momentum_score}>{b.user?.name || b.user?.email || 'Builder'} - {b.momentum_score}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-3">Weekly Digest Preview</h3>
              {!digestPreview ? <p className="text-sm text-muted-foreground">Preview unavailable.</p> : (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Active projects: {(digestPreview.active_projects || []).length}</p>
                  <p>Open roles: {(digestPreview.open_roles || []).length}</p>
                  <p>Trending builders: {(digestPreview.trending_builders || []).length}</p>
                  <p>Milestones: {(digestPreview.milestone_highlights || []).length}</p>
                </div>
              )}
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
  );
}
