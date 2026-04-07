import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, updatesAPI, milestonesAPI, commentsAPI, collaborationAPI } from '../lib/api';
import {
  Loader2, ArrowLeft, Edit2, Trash2,
  Send, Users, MessageSquare, Target, Plus, Check,
  Zap, Trophy, Clock
} from 'lucide-react';
import Layout from '../components/Layout';
import StageBadge from '../components/StageBadge';
import { Button } from '@/components/ui/button';

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
  const [loading, setLoading] = useState(true);
  
  const [newUpdate, setNewUpdate] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [newComment, setNewComment] = useState('');
  const [collabMessage, setCollabMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [showCollabForm, setShowCollabForm] = useState(false);

  const isOwner = user && project?.user_id === user.id;

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, updatesRes, milestonesRes, commentsRes, collabsRes] = await Promise.all([
        projectsAPI.get(id),
        updatesAPI.list(id),
        milestonesAPI.list(id),
        commentsAPI.list(id),
        collaborationAPI.list(id)
      ]);

      setProject(projectRes.data);
      setUpdates(updatesRes.data.items || []);
      setMilestones(milestonesRes.data.items || []);
      setComments(commentsRes.data.items || []);
      setCollaborators(collabsRes.data.items || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      if (error.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await updatesAPI.create(id, { content: newUpdate });
      setUpdates([response.data, ...updates]);
      setNewUpdate('');
    } catch (error) {
      console.error('Error posting update:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await milestonesAPI.create(id, { title: newMilestone });
      setMilestones([...milestones, response.data]);
      setNewMilestone('');
    } catch (error) {
      console.error('Error adding milestone:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    try {
      const response = await milestonesAPI.update(milestone.id, { is_completed: !milestone.is_completed });
      setMilestones(milestones.map(m => m.id === milestone.id ? response.data : m));
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await commentsAPI.create(id, { content: newComment });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCollaboration = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      const response = await collaborationAPI.request(id, { message: collabMessage });
      setCollaborators([response.data, ...collaborators]);
      setCollabMessage('');
      setShowCollabForm(false);
    } catch (error) {
      console.error('Error requesting collaboration:', error);
      alert(error.response?.data?.detail || 'Failed to request collaboration');
    } finally {
      setSubmitting(false);
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  if (!project) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </Layout>
    );
  }

  const alreadyRequested = collaborators.some(c => c.requester_user_id === user?.id);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="project-detail">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Project Header */}
        <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StageBadge stage={project.stage} />
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDate(project.created_at)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">
                {project.title}
              </h1>
              {project.description && (
                <p className="text-muted-foreground mb-4 max-w-2xl">{project.description}</p>
              )}
              
              {/* Tech Stack */}
              {project.tech_stack && project.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack.map((tech, i) => (
                    <span 
                      key={i} 
                      className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded-md border border-border"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Support Needed */}
              {project.support_needed && (
                <div className="bg-accent border border-border p-3 rounded-md">
                  <p className="text-sm text-foreground">
                    <strong>Looking for:</strong> {project.support_needed}
                  </p>
                </div>
              )}

              {/* Owner Info */}
              {project.user && (
                <Link 
                  to={`/user/${project.user.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
                    {project.user.name?.[0]?.toUpperCase() || project.user.email?.[0]?.toUpperCase()}
                  </div>
                  {project.user.name || project.user.email?.split('@')[0]}
                </Link>
              )}
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                {project.stage !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleCompleteProject}
                    className="bg-accent text-primary border border-primary/30 px-4 py-2 rounded-md hover:bg-accent/80 transition-colors flex items-center gap-2 font-medium"
                    data-testid="complete-project-btn"
                  >
                    <Trophy className="w-4 h-4" />
                    Mark Complete
                  </button>
                )}
                <Link
                  to={`/projects/${id}/edit`}
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-muted border border-border transition-colors flex items-center gap-2"
                  data-testid="edit-project-btn"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={handleDeleteProject}
                  className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
                  data-testid="delete-project-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Updates Section */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Updates
              </h2>

              {isOwner && (
                <form onSubmit={handlePostUpdate} className="mb-6">
                  <textarea
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder="Share an update on your progress..."
                    className={`w-full ${inputBase} px-4 py-3 resize-none`}
                    rows={3}
                    data-testid="update-input"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" disabled={!newUpdate.trim() || submitting} data-testid="post-update-btn">
                      <Send className="w-4 h-4" />
                      Post Update
                    </Button>
                  </div>
                </form>
              )}

              {updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No updates yet</p>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div 
                      key={update.id} 
                      className="bg-card border border-border p-4 rounded-xl shadow-card"
                      data-testid="update-item"
                    >
                      <p className="text-foreground whitespace-pre-wrap">{update.content}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-2">
                        {formatDate(update.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
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
                    <Button type="submit" variant="secondary" disabled={!newComment.trim() || submitting} data-testid="post-comment-btn">
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
                      <div className="flex items-center gap-2 mb-2">
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
                      <p className="text-muted-foreground pl-8">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Milestones */}
            <div className="bg-card border border-border rounded-xl shadow-card p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Milestones
              </h3>

              {isOwner && (
                <form onSubmit={handleAddMilestone} className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      placeholder="Add milestone..."
                      className={`flex-1 ${inputBase} px-3 py-2 text-sm`}
                      data-testid="milestone-input"
                    />
                    <Button type="submit" size="icon" disabled={!newMilestone.trim() || submitting} data-testid="add-milestone-btn">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}

              {milestones.length === 0 ? (
                <p className="text-muted-foreground text-sm">No milestones set</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map(milestone => (
                    <div 
                      key={milestone.id} 
                      className="flex items-center gap-3"
                      data-testid="milestone-item"
                    >
                      {isOwner ? (
                        <button
                          onClick={() => handleToggleMilestone(milestone)}
                          className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                            milestone.is_completed 
                              ? 'bg-primary border-primary' 
                              : 'border-border hover:border-primary'
                          }`}
                          data-testid="toggle-milestone-btn"
                        >
                          {milestone.is_completed && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                      ) : (
                        <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                          milestone.is_completed 
                            ? 'bg-primary border-primary' 
                            : 'border-border'
                        }`}>
                          {milestone.is_completed && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      )}
                      <span className={`text-sm ${
                        milestone.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>
                        {milestone.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collaboration */}
            <div className="bg-card border border-border rounded-xl shadow-card p-6">
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
                        <Button type="submit" className="flex-1" disabled={submitting} data-testid="send-collab-btn">
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
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                        collab.status === 'accepted' 
                          ? 'bg-accent text-primary border-primary/25' 
                          : collab.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {collab.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
