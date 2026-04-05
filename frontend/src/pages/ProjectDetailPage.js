import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, updatesAPI, milestonesAPI, commentsAPI, collaborationAPI } from '../lib/api';
import { 
  Loader2, ArrowLeft, Edit2, Trash2, CheckCircle, 
  Send, Users, MessageSquare, Target, Plus, Check,
  Zap, Trophy, Code, Clock
} from 'lucide-react';
import Layout from '../components/Layout';
import StageBadge from '../components/StageBadge';

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
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-zinc-400">Project not found</p>
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
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Project Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StageBadge stage={project.stage} />
                <span className="font-mono text-xs text-zinc-500">
                  {formatDate(project.created_at)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-3">
                {project.title}
              </h1>
              {project.description && (
                <p className="text-zinc-400 mb-4 max-w-2xl">{project.description}</p>
              )}
              
              {/* Tech Stack */}
              {project.tech_stack && project.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack.map((tech, i) => (
                    <span 
                      key={i} 
                      className="font-mono text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Support Needed */}
              {project.support_needed && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-sm">
                  <p className="text-sm text-amber-400">
                    <strong>Looking for:</strong> {project.support_needed}
                  </p>
                </div>
              )}

              {/* Owner Info */}
              {project.user && (
                <Link 
                  to={`/user/${project.user.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
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
                    onClick={handleCompleteProject}
                    className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-sm hover:bg-green-500/20 transition-colors flex items-center gap-2"
                    data-testid="complete-project-btn"
                  >
                    <Trophy className="w-4 h-4" />
                    Mark Complete
                  </button>
                )}
                <Link
                  to={`/projects/${id}/edit`}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-sm hover:bg-zinc-700 transition-colors flex items-center gap-2"
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
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Updates
              </h2>

              {isOwner && (
                <form onSubmit={handlePostUpdate} className="mb-6">
                  <textarea
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder="Share an update on your progress..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                    rows={3}
                    data-testid="update-input"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newUpdate.trim() || submitting}
                      className="bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                      data-testid="post-update-btn"
                    >
                      <Send className="w-4 h-4" />
                      Post Update
                    </button>
                  </div>
                </form>
              )}

              {updates.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No updates yet</p>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div 
                      key={update.id} 
                      className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm"
                      data-testid="update-item"
                    >
                      <p className="text-white whitespace-pre-wrap">{update.content}</p>
                      <p className="font-mono text-xs text-zinc-500 mt-2">
                        {formatDate(update.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Comments ({comments.length})
              </h2>

              {isAuthenticated && (
                <form onSubmit={handlePostComment} className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a comment..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                    rows={2}
                    data-testid="comment-input"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="bg-zinc-800 text-white px-4 py-2 rounded-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
                      data-testid="post-comment-btn"
                    >
                      Comment
                    </button>
                  </div>
                </form>
              )}

              {comments.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className="border-b border-zinc-800 pb-4 last:border-0"
                      data-testid="comment-item"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
                          {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {comment.user?.name || 'Anonymous'}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-zinc-300 pl-8">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Milestones */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
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
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                      data-testid="milestone-input"
                    />
                    <button
                      type="submit"
                      disabled={!newMilestone.trim() || submitting}
                      className="bg-amber-500 text-zinc-950 p-2 rounded-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                      data-testid="add-milestone-btn"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {milestones.length === 0 ? (
                <p className="text-zinc-500 text-sm">No milestones set</p>
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
                              ? 'bg-green-500 border-green-500' 
                              : 'border-zinc-600 hover:border-amber-500'
                          }`}
                          data-testid="toggle-milestone-btn"
                        >
                          {milestone.is_completed && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ) : (
                        <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                          milestone.is_completed 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-zinc-600'
                        }`}>
                          {milestone.is_completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <span className={`text-sm ${
                        milestone.is_completed ? 'text-zinc-500 line-through' : 'text-white'
                      }`}>
                        {milestone.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collaboration */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none mb-2"
                        rows={2}
                        data-testid="collab-message-input"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 bg-amber-500 text-zinc-950 font-semibold py-2 rounded-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                          data-testid="send-collab-btn"
                        >
                          Send Request
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCollabForm(false)}
                          className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowCollabForm(true)}
                      className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 py-2 rounded-sm hover:bg-amber-500/20 transition-colors mb-4"
                      data-testid="request-collab-btn"
                    >
                      Request to Collaborate
                    </button>
                  )}
                </>
              )}

              {alreadyRequested && !isOwner && (
                <p className="text-amber-500 text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Collaboration requested
                </p>
              )}

              {collaborators.length === 0 ? (
                <p className="text-zinc-500 text-sm">No collaboration requests</p>
              ) : (
                <div className="space-y-3">
                  {collaborators.map(collab => (
                    <div 
                      key={collab.id} 
                      className="flex items-center justify-between"
                      data-testid="collaborator-item"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
                          {collab.requester?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-white">
                          {collab.requester?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-sm ${
                        collab.status === 'accepted' 
                          ? 'bg-green-500/10 text-green-400' 
                          : collab.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-amber-500/10 text-amber-400'
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
