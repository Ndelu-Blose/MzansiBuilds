import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Zap, Trophy, Lightbulb, Users, ThumbsUp, Hand, Flame } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { feedAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function ActivityIcon({ type }) {
  if (type === 'completed') return <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
  if (type === 'idea') return <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
  if (type === 'collaboration') return <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
  return <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
}

export default function FeedItem({ item, index }) {
  const { isAuthenticated } = useAuth();
  const [reactionState, setReactionState] = useState(item.reactions || { like: 0, applaud: 0, inspired: 0 });
  const [viewerReactionState, setViewerReactionState] = useState(
    item.viewer_reactions || { liked: false, applauded: false, inspired: false }
  );
  const [busyReaction, setBusyReaction] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(item.recent_comments || []);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(Number(item.comments_count || 0));

  const displayName = item.author?.name || item.author?.username || 'Member';
  const avatarLetter = displayName[0]?.toUpperCase() || 'U';
  const activityLabel = useMemo(() => {
    if (item.activity_type === 'completed') return item.project?.id ? 'completed' : 'completed a build';
    if (item.activity_type === 'idea') return item.project?.id ? 'shared an idea for' : 'shared an idea';
    if (item.activity_type === 'collaboration') return item.project?.id ? 'opened a collaboration thread on' : 'opened a collaboration thread';
    return item.project?.id ? 'posted an update on' : 'posted an update';
  }, [item.activity_type, item.project?.id]);

  useEffect(() => {
    setReactionState(item.reactions || { like: 0, applaud: 0, inspired: 0 });
    setViewerReactionState(item.viewer_reactions || { liked: false, applauded: false, inspired: false });
    setComments(item.recent_comments || []);
    setCommentCount(Number(item.comments_count || 0));
    setShowComments(false);
    setCommentText('');
  }, [item]);

  const handleReaction = async (reactionType, activeKey) => {
    if (!isAuthenticated || busyReaction) return;
    setBusyReaction(reactionType);
    try {
      const isActive = Boolean(viewerReactionState[activeKey]);
      const response = isActive
        ? await feedAPI.unreact(item.id, reactionType)
        : await feedAPI.react(item.id, reactionType);
      setReactionState(response.data.reactions || { like: 0, applaud: 0, inspired: 0 });
      setViewerReactionState(response.data.viewer_reactions || { liked: false, applauded: false, inspired: false });
    } catch (error) {
      console.error('Failed to update feed reaction', error);
    } finally {
      setBusyReaction(null);
    }
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const response = await feedAPI.getComments(item.id, { limit: 20, offset: 0 });
        setComments(response.data || []);
      } catch (error) {
        console.error('Failed to load comments', error);
      }
    }
    setShowComments((prev) => !prev);
  };

  const postComment = async () => {
    if (!isAuthenticated || commentBusy || !commentText.trim()) return;
    setCommentBusy(true);
    try {
      const response = await feedAPI.comment(item.id, { content: commentText.trim() });
      setComments((prev) => [response.data, ...prev]);
      setCommentCount((prev) => prev + 1);
      setCommentText('');
      setShowComments(true);
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <div
      className="feed-item relative mb-5 rounded-xl border border-border bg-card/90 p-5 shadow-card transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      data-testid="feed-item"
    >
      <span className="absolute -left-[22px] top-6 h-3 w-3 rounded-full border border-primary/40 bg-primary/80" aria-hidden="true" />
      <div className="flex items-start gap-4">
        <Link to={`/user/${item.author?.id}`}>
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-sm font-medium shrink-0 text-foreground">
            {avatarLetter}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              to={`/user/${item.author?.id}`}
              className="text-foreground font-medium hover:text-primary transition-colors"
            >
              {displayName}
            </Link>
            <span className="text-muted-foreground">{activityLabel}</span>
            {item.project?.id && (
              <Link
                to={`/projects/${item.project?.id}`}
                className="text-primary hover:text-primary-hover transition-colors font-medium truncate"
              >
                {item.project?.title || 'Project'}
              </Link>
            )}
            <span className="text-muted-foreground text-xs">· {formatRelativeTime(item.created_at)}</span>
          </div>

          <div className="bg-card/80 border border-border p-4 rounded-xl shadow-card mb-3">
            <div className="flex items-start gap-2">
              <ActivityIcon type={item.activity_type} />
              <p className="text-foreground whitespace-pre-wrap">{item.content}</p>
            </div>
            {item.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
            <button
              type="button"
              onClick={() => handleReaction('like', 'liked')}
              disabled={!isAuthenticated || !!busyReaction}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                viewerReactionState.liked ? 'border-primary text-primary bg-primary/10' : 'border-border hover:text-foreground'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Like {reactionState.like || 0}
            </button>
            <button
              type="button"
              onClick={() => handleReaction('applaud', 'applauded')}
              disabled={!isAuthenticated || !!busyReaction}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                viewerReactionState.applauded ? 'border-primary text-primary bg-primary/10' : 'border-border hover:text-foreground'
              }`}
            >
              <Hand className="w-3.5 h-3.5" /> Applaud {reactionState.applaud || 0}
            </button>
            <button
              type="button"
              onClick={() => handleReaction('inspired', 'inspired')}
              disabled={!isAuthenticated || !!busyReaction}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                viewerReactionState.inspired ? 'border-primary text-primary bg-primary/10' : 'border-border hover:text-foreground'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Inspired {reactionState.inspired || 0}
            </button>
            <button
              type="button"
              onClick={toggleComments}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:text-foreground"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Comment {commentCount || comments.length || 0}
            </button>
            {item.project?.id && (
              <Link
                to={`/projects/${item.project?.id}`}
                className="flex items-center gap-1 text-xs hover:text-primary transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                View project
              </Link>
            )}
          </div>

          {showComments && (
            <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
              <div className="mb-3 space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <span className="font-medium text-foreground mr-1">
                      {comment.user?.name || comment.user?.username || 'Member'}
                    </span>
                    <span className="text-muted-foreground">{comment.content}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={postComment}
                  disabled={!commentText.trim() || commentBusy || !isAuthenticated}
                  className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
