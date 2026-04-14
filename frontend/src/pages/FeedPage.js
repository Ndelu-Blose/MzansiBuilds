import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { feedAPI, projectsAPI } from '../lib/api';
import { Loader2, RefreshCw, Rss } from 'lucide-react';
import FeedItem from '../components/FeedItem';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

const FEED_TABS = [
  { id: 'all', label: 'All' },
  { id: 'following', label: 'Following' },
  { id: 'my_projects', label: 'My Projects' },
  { id: 'completed', label: 'Completed' },
  { id: 'trending', label: 'Trending' },
];

export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [composerBusy, setComposerBusy] = useState(false);
  const [myProjects, setMyProjects] = useState([]);
  const [composerProjectId, setComposerProjectId] = useState('');
  const [composerType, setComposerType] = useState('update');
  const [loadError, setLoadError] = useState('');
  const limit = 20;
  const offsetRef = useRef(0);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const fetchFeed = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const currentOffset = loadMore ? offsetRef.current : 0;
        const response = await feedAPI.get({ limit, offset: currentOffset, tab: activeTab });
        const items = response.data.items || [];
        setLoadError('');

        if (loadMore) {
          setFeedItems((prev) => [...prev, ...items]);
        } else {
          setFeedItems(items);
        }

        setHasMore(items.length === limit);
        if (loadMore) {
          setOffset(currentOffset + limit);
        } else {
          setOffset(limit);
        }
      } catch (error) {
        console.error('Error fetching feed:', error);
        setLoadError('Could not load feed updates right now.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, limit]
  );

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  useEffect(() => {
    if (!isAuthenticated) return;
    projectsAPI
      .getMyProjects({ limit: 100, offset: 0 })
      .then((response) => setMyProjects(response.data.items || []))
      .catch((error) => console.error('Error loading projects for feed composer:', error));
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setOffset(0);
    offsetRef.current = 0;
    fetchFeed(false);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setOffset(0);
    offsetRef.current = 0;
  };

  const handleCreatePost = async () => {
    if (!isAuthenticated || composerBusy || !composerText.trim()) return;
    setComposerBusy(true);
    try {
      const payload = {
        content: composerText.trim(),
        project_id: composerProjectId || null,
        activity_type: composerType,
      };
      const response = await feedAPI.createPost({
        ...payload,
      });
      setComposerText('');
      const nextItem = response.data;
      const includeInCurrentTab =
        activeTab === 'all' ||
        activeTab === 'trending' ||
        (activeTab === 'completed' && nextItem.activity_type === 'completed') ||
        (activeTab === 'my_projects' && (nextItem.author?.id === user?.id || nextItem.project?.id === composerProjectId));
      if (includeInCurrentTab) {
        setFeedItems((prev) => [nextItem, ...prev]);
      }
    } catch (error) {
      console.error('Error creating feed post:', error);
      setLoadError('Could not publish your update. Please try again.');
    } finally {
      setComposerBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl" data-testid="feed-page">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3 text-3xl">
              <Rss className="w-8 h-8 text-primary" />
              Activity Feed
            </h1>
            <p className="text-muted-foreground mt-1">Latest updates from the community</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
            data-testid="refresh-feed-btn"
            aria-label="Refresh feed"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-2">
          <div className="flex flex-wrap gap-2">
            {FEED_TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => handleTabChange(tab.id)}
                className={activeTab === tab.id ? '' : 'border border-border'}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground shrink-0">
              {(user?.name || user?.email || 'U')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder="What are you building?"
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!isAuthenticated || composerBusy}
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={composerProjectId}
                  onChange={(event) => setComposerProjectId(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">No linked project</option>
                  {myProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <select
                  value={composerType}
                  onChange={(event) => setComposerType(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="update">Update</option>
                  <option value="completed">Completed</option>
                  <option value="idea">Idea</option>
                  <option value="collaboration">Collaboration</option>
                </select>
                <span className="text-xs text-muted-foreground">Example: Built login flow and shipped password reset.</span>
                <Button type="button" onClick={handleCreatePost} disabled={!isAuthenticated || !composerText.trim() || composerBusy}>
                  Post
                </Button>
              </div>
              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground">Sign in to post updates, react, and comment.</p>
              )}
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-5 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-muted-foreground">
            {loadError}
          </div>
        ) : null}

        {feedItems.length === 0 ? (
          <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
            <Rss className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Start your feed momentum</h3>
            <p className="text-muted-foreground mb-4">Share your first update, then follow builders and projects to personalize this feed.</p>
            <div className="mb-4 rounded-md border border-border bg-background p-3 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Example post</p>
              <p className="mt-1">Built auth login today, shipped profile sync, and next up is notifications.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => document.querySelector('textarea')?.focus()}>
                Create update
              </Button>
              <Button type="button" onClick={handleRefresh} variant="outline">
                Refresh feed
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore">Follow projects</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-3 pl-8">
              {feedItems.map((item, index) => (
                <FeedItem key={item.id} item={item} index={index} />
              ))}

              {hasMore && (
                <div className="pt-8 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchFeed(true)}
                    disabled={loadingMore}
                    data-testid="load-more-btn"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
