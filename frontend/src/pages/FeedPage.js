import React, { useState, useEffect, useCallback, useRef } from 'react';
import { feedAPI } from '../lib/api';
import { Loader2, RefreshCw, Rss } from 'lucide-react';
import Layout from '../components/Layout';
import FeedItem from '../components/FeedItem';

export default function FeedPage() {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;
  const offsetRef = useRef(0);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const fetchFeed = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const currentOffset = loadMore ? offsetRef.current : 0;
      const response = await feedAPI.get({ limit, offset: currentOffset });
      const items = response.data.items || [];

      if (loadMore) {
        setFeedItems(prev => [...prev, ...items]);
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
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  const handleRefresh = () => {
    setOffset(0);
    fetchFeed(false);
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="feed-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Rss className="w-8 h-8 text-amber-500" />
              Activity Feed
            </h1>
            <p className="text-zinc-400 mt-1">Latest updates from the community</p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-zinc-400 hover:text-white transition-colors p-2"
            data-testid="refresh-feed-btn"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Feed Items */}
        {feedItems.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-12 text-center">
            <Rss className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No updates yet</h3>
            <p className="text-zinc-400">
              Be the first to share an update on your project
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {feedItems.map((item, index) => (
              <FeedItem key={item.id} item={item} index={index} />
            ))}

            {hasMore && (
              <div className="pt-8 text-center">
                <button
                  onClick={() => fetchFeed(true)}
                  disabled={loadingMore}
                  className="bg-transparent text-white border border-zinc-700 px-6 py-2 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  data-testid="load-more-btn"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
