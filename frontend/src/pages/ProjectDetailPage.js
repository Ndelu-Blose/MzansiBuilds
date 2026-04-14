import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, updatesAPI, milestonesAPI, commentsAPI, collaborationAPI, activityAPI, bookmarksAPI, shareAPI } from '../lib/api';
import {
  Loader2, ArrowLeft, Edit2, Trash2,
  Send, Users, MessageSquare, Target, Plus, Check,
  Zap, Trophy, Clock, Github, RefreshCw, GitCommitHorizontal, FileText, ShieldCheck, AlertCircle
} from 'lucide-react';
import StageBadge from '../components/StageBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ProjectTimeline from '../components/project/ProjectTimeline';
import SuggestedCollaboratorCard from '../components/project/SuggestedCollaboratorCard';
import TrustSignalsRow from '../components/profile/TrustSignalsRow';
import ProjectShareCard from '../components/project/ProjectShareCard';

const inputBase =
  'rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [comments, setComments] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateBody, setNewUpdateBody] = useState('');
  const [newUpdateType, setNewUpdateType] = useState('progress');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneStatus, setNewMilestoneStatus] = useState('planned');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [collabMessage, setCollabMessage] = useState('');
  
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [milestoneBusyId, setMilestoneBusyId] = useState(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isSubmittingCollab, setIsSubmittingCollab] = useState(false);
  const [isRefreshingRepo, setIsRefreshingRepo] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editUpdateTitle, setEditUpdateTitle] = useState('');
  const [editUpdateBody, setEditUpdateBody] = useState('');
  const [editUpdateType, setEditUpdateType] = useState('progress');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [commentBusyId, setCommentBusyId] = useState(null);
  const [milestoneError, setMilestoneError] = useState('');
  const [milestoneSuccess, setMilestoneSuccess] = useState('');
  const [syncFeedbackError, setSyncFeedbackError] = useState('');
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [suggestedCollaborators, setSuggestedCollaborators] = useState([]);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [timelineItems, setTimelineItems] = useState([]);
  const [creatingReceiptId, setCreatingReceiptId] = useState(null);
  const [shareCard, setShareCard] = useState(null);
  const [shareFeedback, setShareFeedback] = useState('');

  const isOwner = user && project?.user_id === user.id;

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const projectRes = await projectsAPI.get(id);
      setProject(projectRes.data);
      // Render core project shell before supporting queries complete.
      setLoading(false);

      try {
        const [updatesRes, milestonesRes, commentsRes, collabsRes, activityRes, timelineRes] = await Promise.all([
          updatesAPI.list(id),
          milestonesAPI.list(id),
          commentsAPI.list(id),
          collaborationAPI.list(id),
          activityAPI.list(id),
          projectsAPI.getTimeline(id),
        ]);

        setUpdates(updatesRes.data.items || []);
        setMilestones(milestonesRes.data.items || []);
        setComments(commentsRes.data.items || []);
        setCollaborators(collabsRes.data.items || []);
        setActivityItems(activityRes.data.items || []);
        setTimelineItems(timelineRes.data.items || []);
      } catch (secondaryError) {
        console.error('Error fetching project supporting data:', secondaryError);
      }

      try {
        const shareRes = await shareAPI.getProjectCard(id);
        setShareCard(shareRes.data || null);
      } catch (_err) {
        setShareCard(null);
      }
      if (user && projectRes.data.user_id === user.id) {
        try {
          const suggestedRes = await projectsAPI.getSuggestedCollaborators(id, { limit: 6 });
          setSuggestedCollaborators(suggestedRes.data || []);
        } catch (_error) {
          setSuggestedCollaborators([]);
        }
      } else {
        setSuggestedCollaborators([]);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      if (error.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    if (!newUpdateTitle.trim()) {
      setUpdateError('Please add a title.');
      return;
    }
    if (!newUpdateBody.trim()) {
      setUpdateError('Please write a short update.');
      return;
    }
    if (!newUpdateType) {
      setUpdateError('Choose an update type.');
      return;
    }

    setIsPostingUpdate(true);
    try {
      const response = await updatesAPI.create(id, {
        title: newUpdateTitle,
        body: newUpdateBody,
        update_type: newUpdateType,
      });
      setUpdates([response.data, ...updates]);
      setNewUpdateTitle('');
      setNewUpdateBody('');
      setNewUpdateType('progress');
      setUpdateSuccess('Update posted successfully.');
      const activityRes = await activityAPI.list(id);
      setActivityItems(activityRes.data.items || []);
    } catch (error) {
      setUpdateError(error.response?.data?.detail || 'Could not post update. Please try again.');
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const startEditUpdate = (update) => {
    setUpdateError('');
    setUpdateSuccess('');
    setEditingUpdateId(update.id);
    setEditUpdateTitle(update.title);
    setEditUpdateBody(update.body);
    setEditUpdateType(update.update_type || 'progress');
  };

  const cancelEditUpdate = () => {
    setEditingUpdateId(null);
    setEditUpdateTitle('');
    setEditUpdateBody('');
    setEditUpdateType('progress');
  };

  const handleSaveEditUpdate = async (e) => {
    e.preventDefault();
    if (!editUpdateTitle.trim() || !editUpdateBody.trim()) {
      setUpdateError('Title and update text are required.');
      return;
    }
    setIsSavingEdit(true);
    setUpdateError('');
    try {
      const response = await updatesAPI.update(id, editingUpdateId, {
        title: editUpdateTitle.trim(),
        body: editUpdateBody.trim(),
        update_type: editUpdateType,
      });
      setUpdates(updates.map((u) => (u.id === editingUpdateId ? response.data : u)));
      cancelEditUpdate();
      setUpdateSuccess('Update saved.');
      const activityRes = await activityAPI.list(id);
      setActivityItems(activityRes.data.items || []);
    } catch (error) {
      setUpdateError(error.response?.data?.detail || 'Could not save update.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteUpdate = async (update) => {
    if (!window.confirm('Delete this update? This cannot be undone.')) return;
    setUpdateError('');
    setUpdateSuccess('');
    try {
      await updatesAPI.delete(id, update.id);
      setUpdates(updates.filter((u) => u.id !== update.id));
      if (editingUpdateId === update.id) cancelEditUpdate();
      setUpdateSuccess('Update deleted.');
      const activityRes = await activityAPI.list(id);
      setActivityItems(activityRes.data.items || []);
    } catch (error) {
      setUpdateError(error.response?.data?.detail || 'Could not delete update.');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    setMilestoneError('');
    setMilestoneSuccess('');
    if (!newMilestoneTitle.trim()) {
      setMilestoneError('Milestone title is required.');
      return;
    }

    setIsCreatingMilestone(true);
    try {
      const response = await milestonesAPI.create(id, {
        title: newMilestoneTitle,
        description: newMilestoneDescription || null,
        status: newMilestoneStatus,
        due_date: newMilestoneDueDate || null,
      });
      setMilestones([...milestones, response.data]);
      setNewMilestoneTitle('');
      setNewMilestoneDescription('');
      setNewMilestoneStatus('planned');
      setNewMilestoneDueDate('');
      setMilestoneSuccess('Milestone created.');
      const activityRes = await activityAPI.list(id);
      setActivityItems(activityRes.data.items || []);
    } catch (error) {
      setMilestoneError(error.response?.data?.detail || 'Could not create milestone. Please try again.');
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    setMilestoneError('');
    setMilestoneSuccess('');
    setMilestoneBusyId(milestone.id);
    try {
      const nextStatus = milestone.status === 'done' ? 'active' : 'done';
      const response = await milestonesAPI.update(id, milestone.id, { status: nextStatus });
      setMilestones(milestones.map(m => m.id === milestone.id ? response.data : m));
      const activityRes = await activityAPI.list(id);
      setActivityItems(activityRes.data.items || []);
      setMilestoneSuccess(nextStatus === 'done' ? 'Milestone completed.' : 'Milestone moved to Active.');
    } catch (error) {
      setMilestoneError(error.response?.data?.detail || 'Could not update milestone status.');
    } finally {
      setMilestoneBusyId(null);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsPostingComment(true);
    try {
      const response = await commentsAPI.create(id, { content: newComment });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;
    setCommentBusyId(comment.id);
    try {
      await commentsAPI.delete(id, comment.id);
      setComments(comments.filter((c) => c.id !== comment.id));
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setCommentBusyId(null);
    }
  };

  const handleRequestCollaboration = async (e) => {
    e.preventDefault();
    
    setIsSubmittingCollab(true);
    try {
      const response = await collaborationAPI.request(id, { message: collabMessage });
      setCollaborators([response.data, ...collaborators]);
      setCollabMessage('');
      setShowCollabForm(false);
    } catch (error) {
      console.error('Error requesting collaboration:', error);
      alert(error.response?.data?.detail || 'Failed to request collaboration');
    } finally {
      setIsSubmittingCollab(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm('Mark this project as completed?')) return;
    
    try {
      const response = await projectsAPI.complete(id);
      setProject(response.data);
    } catch (error) {
      console.error('Error completing project:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    
    try {
      await projectsAPI.delete(id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleRefreshRepo = async () => {
    setSyncFeedbackError('');
    setIsRefreshingRepo(true);
    try {
      await projectsAPI.refresh(id);
      await fetchProjectData();
    } catch (error) {
      setSyncFeedbackError(error.response?.data?.detail || 'Failed to refresh repository data.');
    } finally {
      setIsRefreshingRepo(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelative = (dateStr) => {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const humanize = (value) => {
    if (!value) return '';
    return value
      .replace(/^status_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isLikelyId = (value) => typeof value === 'string' && /^[0-9a-f-]{16,}$/i.test(value);
  const healthStatus = project?.health_status ? String(project.health_status).replace('_', ' ') : '';

  const handleToggleBookmark = async () => {
    if (!isAuthenticated || bookmarkBusy || !project) return;
    setBookmarkBusy(true);
    try {
      const response = project.is_bookmarked
        ? await bookmarksAPI.remove(project.id)
        : await bookmarksAPI.add(project.id);
      setProject((prev) => ({
        ...prev,
        is_bookmarked: Boolean(response.data.is_bookmarked),
        bookmark_count: Number(response.data.bookmark_count || 0),
      }));
    } catch (error) {
      console.error('Failed to update bookmark', error);
    } finally {
      setBookmarkBusy(false);
    }
  };

  const activityHeading = (item) => {
    if (item.type === 'commit') return 'Commit pushed';
    if (item.type === 'update') return `${humanize(item.subtype) || 'Project'} update posted`;
    if (item.type === 'milestone') {
      if (item.subtype === 'status_done') return 'Milestone completed';
      if (item.subtype === 'status_active') return 'Milestone moved to Active';
      if (item.subtype === 'status_planned') return 'Milestone created';
      return 'Milestone updated';
    }
    return humanize(item.type) || 'Activity';
  };

  const badgeVariantForStatus = (value) => {
    if (!value) return 'outline';
    if (['done', 'completed', 'verified_owner', 'verified_contributor', 'release'].includes(value)) return 'default';
    if (['blocker', 'failed', 'dropped', 'disconnected', 'rejected'].includes(value)) return 'destructive';
    if (['active', 'milestone', 'learning', 'progress'].includes(value)) return 'secondary';
    return 'outline';
  };

  const handleCreateReceipt = async (collabId) => {
    setCreatingReceiptId(collabId);
    try {
      await collaborationAPI.createReceipt(collabId, { role_title: 'Collaborator', summary: 'Completed collaboration.' });
      await fetchProjectData();
    } catch (error) {
      console.error('Failed to create receipt', error);
    } finally {
      setCreatingReceiptId(null);
    }
  };

  const handleShareProject = async () => {
    const url = shareCard?.share_url || `${window.location.origin}/projects/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback('Project link copied to clipboard.');
      setTimeout(() => setShareFeedback(''), 2500);
    } catch {
      setShareFeedback('Could not copy automatically. Use the link in the share card below.');
      setTimeout(() => setShareFeedback(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const alreadyRequested = collaborators.some(c => c.requester_user_id === user?.id);

  const completedMilestones = milestones.filter((milestone) => milestone.status === 'done').length
  const totalMilestones = milestones.length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const remainingMilestones = Math.max(0, totalMilestones - completedMilestones);
  const nextStepLabel =
    totalMilestones === 0
      ? 'Add your first milestone to make progress visible.'
      : remainingMilestones > 0
        ? `Complete ${remainingMilestones} remaining milestone${remainingMilestones === 1 ? '' : 's'} to finish this plan.`
        : 'All milestones completed. Share progress or post an update.';


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="project-detail">
        <div className="rounded-2xl border border-border bg-card/90 p-6 md:p-8 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-0 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate(-1)}
                  data-testid="back-btn"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge stage={project.stage} />
                  {healthStatus ? (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {healthStatus}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="font-mono text-[10px] uppercase">Assessment workspace</Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{project.title}</h1>
                <p className="text-sm text-muted-foreground">Track and complete your project competencies with clearer progress and focused actions.</p>
                <p className="text-xs text-muted-foreground">Created {formatDate(project.created_at)}{project.last_activity_at ? ` ? Last activity ${formatRelative(project.last_activity_at)}` : ''}</p>
              </div>
              <div className="w-full rounded-xl border border-border bg-background/60 p-4 lg:max-w-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Progress</span>
                  <span className="font-mono text-foreground">{milestoneProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${milestoneProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{completedMilestones} completed ? {remainingMilestones} remaining</p>
                <p className="mt-1 text-xs text-muted-foreground">Next: {nextStepLabel}</p>
              </div>
            </div>

            {project.import_provenance?.source === 'github' && project.import_provenance.github_repo_full_name && (
              <p className="text-xs text-muted-foreground" data-testid="import-provenance-note">
                Imported from GitHub ({project.import_provenance.github_repo_full_name}
                {project.import_provenance.imported_at
                  ? ` ? ${new Date(project.import_provenance.imported_at).toLocaleString()}`
                  : ''}
                )
              </p>
            )}

            {project.description && <p className="max-w-4xl text-sm text-muted-foreground">{project.description}</p>}

            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.tech_stack.map((tech, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-border bg-background/70 px-2.5 py-1 text-xs font-mono text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {project.support_needed && (
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-sm text-foreground">
                  <strong>Looking for:</strong> {project.support_needed}
                </p>
              </div>
            )}

            {project.user && (
              <div className="space-y-2">
                <Link
                  to={`/user/${project.user.id}`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {project.user.name?.[0]?.toUpperCase() || project.user.email?.[0]?.toUpperCase()}
                  </div>
                  {project.user.name || project.user.email?.split('@')[0]}
                </Link>
                <TrustSignalsRow
                  band={project.user.builder_score_band}
                  completedProjects={project.user.completed_projects_count}
                  receipts={project.user.receipts_count}
                  lastActiveAt={project.user.last_active_at}
                />
                {project.verification_status && (
                  <Badge variant={badgeVariantForStatus(project.verification_status)} className="font-mono">
                    {humanize(project.verification_status)}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {isOwner ? (
                <>
                  {project.stage !== 'completed' && (
                    <Button type="button" onClick={handleCompleteProject} data-testid="complete-project-btn">
                      <Trophy className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                  <Button type="button" asChild variant="outline" data-testid="edit-project-btn">
                    <Link to={`/projects/${id}/edit`}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDeleteProject} data-testid="delete-project-btn">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  {project.repo_connected && (
                    <Button type="button" variant="outline" onClick={handleRefreshRepo} disabled={isRefreshingRepo}>
                      {isRefreshingRepo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      {isRefreshingRepo ? 'Refreshing...' : 'Refresh Repo'}
                    </Button>
                  )}
                </>
              ) : (
                isAuthenticated && (
                  <Button type="button" variant="outline" onClick={handleToggleBookmark} disabled={bookmarkBusy}>
                    {project.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
                    <Badge variant="outline" className="ml-2 font-mono">{project.bookmark_count || 0}</Badge>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Main Content */}
          <div className="order-2 space-y-6 lg:order-2">
            {project.repo_summary && (
              <div id="repo" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Github className="w-5 h-5 text-primary" />
                  Repository Truth
                </h2>
                <a href={project.repo_summary.repo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {project.repo_summary.repo_full_name}
                </a>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                  <div>Stars: {project.repo_summary.stars_count || 0}</div>
                  <div>Forks: {project.repo_summary.forks_count || 0}</div>
                  <div>Issues: {project.repo_summary.open_issues_count || 0}</div>
                  <div>Branch: {project.repo_summary.default_branch || '-'}</div>
                </div>
                {project.languages?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.languages.map((lang) => (
                      <span key={lang.name} className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded-md border border-border">
                        {lang.name} {lang.percentage}%
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(project.detected_frameworks || []).map((framework) => (
                    <span key={framework} className="font-mono text-xs bg-accent text-primary px-2 py-1 rounded-md border border-primary/20">
                      {framework}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div id="readme" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                README Preview
              </h2>
              {project.readme_present ? (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap max-h-72 overflow-y-auto">{project.readme_excerpt}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">README is not available yet. Add one to help others understand this project quickly.</p>
              )}
            </div>

            {/* Updates Section */}
            <div id="updates" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Updates
              </h2>

              {isOwner && (
                <form onSubmit={handlePostUpdate} className="mb-6" aria-busy={isPostingUpdate}>
                  {updateError && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Could not post update</AlertTitle>
                      <AlertDescription>{updateError}</AlertDescription>
                    </Alert>
                  )}
                  {updateSuccess && (
                    <Alert className="mb-3">
                      <AlertTitle>Update posted</AlertTitle>
                      <AlertDescription>{updateSuccess}</AlertDescription>
                    </Alert>
                  )}
                  <div className="mb-2">
                    <input
                      value={newUpdateTitle}
                      onChange={(e) => setNewUpdateTitle(e.target.value)}
                      placeholder="Update title"
                      className={`w-full ${inputBase} px-4 py-2`}
                    />
                  </div>
                  <div className="mb-2">
                    <select
                      value={newUpdateType}
                      onChange={(e) => setNewUpdateType(e.target.value)}
                      className={`w-full ${inputBase} px-3 py-2`}
                    >
                      <option value="progress">Progress</option>
                      <option value="milestone">Milestone</option>
                      <option value="blocker">Blocker</option>
                      <option value="learning">Learning</option>
                      <option value="release">Release</option>
                    </select>
                  </div>
                  <textarea
                    value={newUpdateBody}
                    onChange={(e) => setNewUpdateBody(e.target.value)}
                    placeholder="Share an update on your progress..."
                    className={`w-full ${inputBase} px-4 py-3 resize-none`}
                    rows={3}
                    data-testid="update-input"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" disabled={isPostingUpdate} data-testid="post-update-btn">
                      {isPostingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isPostingUpdate ? 'Posting...' : 'Post Update'}
                    </Button>
                  </div>
                </form>
              )}

              {updates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-foreground font-medium">No updates yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Share progress, blockers, or lessons learned for this project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div
                      key={update.id}
                      className="bg-card border border-border p-4 rounded-xl shadow-card"
                      data-testid="update-item"
                    >
                      {editingUpdateId === update.id ? (
                        <form onSubmit={handleSaveEditUpdate} className="space-y-2" data-testid="edit-update-form">
                          <div className="mb-2">
                            <input
                              value={editUpdateTitle}
                              onChange={(e) => setEditUpdateTitle(e.target.value)}
                              className={`w-full ${inputBase} px-3 py-2 text-sm`}
                            />
                          </div>
                          <select
                            value={editUpdateType}
                            onChange={(e) => setEditUpdateType(e.target.value)}
                            className={`w-full ${inputBase} px-3 py-2 text-sm`}
                          >
                            <option value="progress">Progress</option>
                            <option value="milestone">Milestone</option>
                            <option value="blocker">Blocker</option>
                            <option value="learning">Learning</option>
                            <option value="release">Release</option>
                          </select>
                          <textarea
                            value={editUpdateBody}
                            onChange={(e) => setEditUpdateBody(e.target.value)}
                            className={`w-full ${inputBase} px-3 py-2 text-sm resize-none`}
                            rows={3}
                            data-testid="edit-update-body"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="ghost" onClick={cancelEditUpdate} data-testid="cancel-update-btn">
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingEdit} data-testid="save-update-btn">
                              {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Save
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <Badge variant={badgeVariantForStatus(update.update_type)} className="font-mono">{humanize(update.update_type)}</Badge>
                              <p className="text-foreground font-medium">{update.title}</p>
                            </div>
                            {isOwner && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button type="button" variant="ghost" size="sm" onClick={() => startEditUpdate(update)} data-testid="edit-update-btn" aria-label="Edit update">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteUpdate(update)} data-testid="delete-update-btn" aria-label="Delete update">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">{update.body}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-2">
                            {formatDate(update.created_at)}
                            {update.author && (
                              <span className="text-muted-foreground"> · {update.author.name || update.author.email?.split('@')[0] || 'Author'}</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Milestones */}
            <div id="milestones" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Milestones
              </h3>

              {isOwner && (
                <form onSubmit={handleAddMilestone} className="mb-4" aria-busy={isCreatingMilestone}>
                  {milestoneError && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Milestone error</AlertTitle>
                      <AlertDescription>{milestoneError}</AlertDescription>
                    </Alert>
                  )}
                  {milestoneSuccess && (
                    <Alert className="mb-3">
                      <AlertTitle>Milestone updated</AlertTitle>
                      <AlertDescription>{milestoneSuccess}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Milestone title"
                      className={`flex-1 ${inputBase} px-3 py-2 text-sm`}
                      data-testid="milestone-input"
                    />
                    <textarea
                      value={newMilestoneDescription}
                      onChange={(e) => setNewMilestoneDescription(e.target.value)}
                      placeholder="Milestone description (optional)"
                      className={`w-full ${inputBase} px-3 py-2 text-sm resize-none`}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <select value={newMilestoneStatus} onChange={(e) => setNewMilestoneStatus(e.target.value)} className={`${inputBase} px-2 py-2 text-sm`}>
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="done">Done</option>
                        <option value="dropped">Dropped</option>
                      </select>
                      <input type="datetime-local" value={newMilestoneDueDate} onChange={(e) => setNewMilestoneDueDate(e.target.value)} className={`flex-1 ${inputBase} px-2 py-2 text-sm`} />
                      <Button type="submit" disabled={isCreatingMilestone} data-testid="add-milestone-btn">
                        {isCreatingMilestone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isCreatingMilestone ? 'Saving...' : 'Add Milestone'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {milestones.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-foreground font-medium">No milestones yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Break the project into trackable goals so progress is easier to follow.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {milestones.map(milestone => (
                    <div key={milestone.id} className="flex items-center gap-3" data-testid="milestone-item">
                      {isOwner ? (
                        <button
                          onClick={() => handleToggleMilestone(milestone)}
                          className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                            milestone.status === 'done'
                              ? 'bg-primary border-primary'
                              : 'border-border hover:border-primary'
                          }`}
                          disabled={milestoneBusyId === milestone.id}
                          data-testid="toggle-milestone-btn"
                        >
                          {milestoneBusyId === milestone.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                          ) : (
                            milestone.status === 'done' && <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </button>
                      ) : (
                        <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                          milestone.status === 'done'
                            ? 'bg-primary border-primary'
                            : 'border-border'
                        }`}>
                          {milestone.status === 'done' && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      )}
                      <span className={`text-sm ${
                        milestone.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>
                        {milestone.title}
                      </span>
                      <Badge variant={badgeVariantForStatus(milestone.status)} className="font-mono">
                        {humanize(milestone.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4">Activity</h3>
              {activityItems.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-foreground font-medium">No activity yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Activity will appear here once commits, updates, or milestones are added.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((item) => (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{activityHeading(item)} — {item.title}</p>
                        <Badge variant="outline" className="font-mono">{humanize(item.type)}</Badge>
                      </div>
                      {item.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.body}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatRelative(item.timestamp)}{item.actor && !isLikelyId(item.actor) ? ` • ${item.actor}` : ''} • {formatDateTime(item.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="timeline" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4">Build Timeline</h3>
              <ProjectTimeline items={timelineItems} />
            </div>

            {/* Comments Section */}
            <div id="comments" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Comments ({comments.length})
              </h2>

              {isAuthenticated && (
                <form onSubmit={handlePostComment} className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a comment..."
                    className={`w-full ${inputBase} px-4 py-3 resize-none`}
                    rows={2}
                    data-testid="comment-input"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" variant="secondary" disabled={!newComment.trim() || isPostingComment} data-testid="post-comment-btn">
                      Comment
                    </Button>
                  </div>
                </form>
              )}

              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className="border-b border-border pb-4 last:border-0"
                      data-testid="comment-item"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
                            {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {comment.user?.name || 'Anonymous'}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        {isAuthenticated && (isOwner || user?.id === comment.user_id) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={commentBusyId === comment.id}
                            onClick={() => handleDeleteComment(comment)}
                            data-testid="delete-comment-btn"
                            aria-label="Delete comment"
                          >
                            {commentBusyId === comment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground pl-8">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="order-1 space-y-6 lg:order-1 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-3">Workspace sections</h3>
              <nav className="space-y-2 text-sm">
                <a href="#repo" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Repository</a>
                <a href="#readme" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">README</a>
                <a href="#updates" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Updates</a>
                <a href="#milestones" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Milestones</a>
                <a href="#timeline" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Timeline</a>
                <a href="#comments" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Comments</a>
                <a href="#collaboration" className="block rounded-md border border-border/70 px-3 py-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">Collaboration</a>
              </nav>
            </div>

            {project.repo_connected && (
              <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
                <h3 className="font-semibold text-foreground mb-3">Sync Status</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Last synced: {project.last_synced_at ? formatDate(project.last_synced_at) : 'Not synced yet'}
                </p>
                {project.sync_status && (
                  <Badge variant={badgeVariantForStatus(project.sync_status)} className="font-mono">{humanize(project.sync_status)}</Badge>
                )}
                {(project.sync_error || syncFeedbackError) && (
                  <p className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                    {project.sync_error || syncFeedbackError}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-3">Project Health</h3>
              <Badge variant="outline" className="font-mono uppercase">{healthStatus || 'unknown'}</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Last activity: {project.last_activity_at ? formatDateTime(project.last_activity_at) : 'No activity yet'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Share Project</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleShareProject}>Copy Link</Button>
              </div>
              {shareFeedback ? <p className="mb-3 text-xs text-primary">{shareFeedback}</p> : null}
              <ProjectShareCard card={shareCard} />
            </div>

            <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Contributors
              </h3>
              {(project.contributors || []).length === 0 ? (
                <div>
                  <p className="text-foreground font-medium text-sm">No contributors yet</p>
                  <p className="text-sm text-muted-foreground">Contributors will appear after repository sync picks up commit history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.contributors.map((contributor, index) => (
                    <div key={`${contributor.github_username || 'contrib'}-${index}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {contributor.avatar_url ? (
                          <img src={contributor.avatar_url} alt={contributor.github_username || 'Contributor'} className="w-7 h-7 rounded-full border border-border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted border border-border" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{contributor.display_name || contributor.github_username || 'Unknown contributor'}</p>
                          <p className="text-xs text-muted-foreground truncate">@{contributor.github_username || 'unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="font-mono">{humanize(contributor.role || 'contributor')}</Badge>
                        {contributor.is_verified && <ShieldCheck className="w-4 h-4 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4">Key Files</h3>
              {(project.key_file_highlights || []).length === 0 ? (
                <div>
                  <p className="text-foreground font-medium text-sm">No key files yet</p>
                  <p className="text-sm text-muted-foreground">Add common project files like README, package manifest, or CI config to improve discoverability.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.key_file_highlights.map((file, idx) => (
                    <div key={`${file.path}-${idx}`} className="rounded-md border border-border p-2">
                      <p className="text-sm text-foreground break-all">{file.path}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.classification || 'file'} • {file.item_type || 'file'}{file.is_key_file ? ' • key' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {project.recent_commits?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <GitCommitHorizontal className="w-5 h-5 text-primary" />
                  Recent Commits
                </h3>
                <div className="space-y-2">
                  {project.recent_commits.slice(0, 5).map((commit) => (
                    <a key={commit.sha} href={commit.commit_url} target="_blank" rel="noreferrer" className="block text-sm hover:bg-muted rounded-md p-2">
                      <p className="text-foreground truncate">{commit.message_headline || commit.sha.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{commit.author_login || 'unknown'} • {commit.committed_at ? formatDateTime(commit.committed_at) : ''}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration */}
            <div id="collaboration" className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Collaboration
              </h3>

              {!isOwner && isAuthenticated && !alreadyRequested && (
                <>
                  {showCollabForm ? (
                    <form onSubmit={handleRequestCollaboration} className="mb-4">
                      <textarea
                        value={collabMessage}
                        onChange={(e) => setCollabMessage(e.target.value)}
                        placeholder="Why do you want to collaborate?"
                        className={`w-full ${inputBase} px-3 py-2 text-sm resize-none mb-2`}
                        rows={2}
                        data-testid="collab-message-input"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={isSubmittingCollab} data-testid="send-collab-btn">
                          Send Request
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowCollabForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mb-4"
                      onClick={() => setShowCollabForm(true)}
                      data-testid="request-collab-btn"
                    >
                      Request to Collaborate
                    </Button>
                  )}
                </>
              )}

              {alreadyRequested && !isOwner && (
                <p className="text-primary text-sm mb-4 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4" />
                  Collaboration requested
                </p>
              )}

              {collaborators.length === 0 ? (
                <p className="text-muted-foreground text-sm">No collaboration requests</p>
              ) : (
                <div className="space-y-3">
                  {collaborators.map(collab => (
                    <div 
                      key={collab.id} 
                      className="flex items-center justify-between"
                      data-testid="collaborator-item"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
                          {collab.requester?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-foreground">
                          {collab.requester?.name || 'Unknown'}
                        </span>
                      </div>
                      <Badge variant={badgeVariantForStatus(collab.status)} className="font-mono">
                        {humanize(collab.status)}
                      </Badge>
                      {isOwner && collab.status === 'accepted' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateReceipt(collab.id)}
                          disabled={creatingReceiptId === collab.id}
                        >
                          {creatingReceiptId === collab.id ? 'Generating...' : 'Generate Receipt'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isOwner && (
              <div className="rounded-xl border border-border bg-card p-6 ring-1 ring-border/40">
                <h3 className="font-semibold text-foreground mb-4">Suggested Collaborators</h3>
                {suggestedCollaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suggestions yet. Add roles needed to improve matching quality.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suggestedCollaborators.map((candidate) => (
                      <SuggestedCollaboratorCard key={candidate.user_id} candidate={candidate} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
