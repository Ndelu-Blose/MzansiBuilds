import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2, CheckCircle2, MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { notificationsAPI } from '../lib/api';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 15;

  const loadNotifications = useCallback(async ({ append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const res = await notificationsAPI.list({
        limit: pageSize,
        offset: append ? items.length : 0,
        unread_only: showUnreadOnly,
      });
      const newItems = res.data.items || [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setUnread(typeof res.data.unread_count === 'number' ? res.data.unread_count : 0);
      setHasMore(newItems.length === pageSize);
    } catch (_err) {
      setError('Unable to load notifications right now.');
      if (!append) {
        setItems([]);
        setUnread(0);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [items.length, showUnreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, showUnreadOnly]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((c) => Math.max(0, c - 1));
    } catch (_err) {
      setError('Could not mark notification as read.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch (_err) {
      setError('Could not mark all notifications as read.');
    }
  };

  const todayItems = items.filter((item) => item.created_at && isToday(new Date(item.created_at)));
  const earlierItems = items.filter((item) => !item.created_at || !isToday(new Date(item.created_at)));

  const notificationIcon = (notification) => {
    const text = `${notification.title || ''} ${notification.body || ''}`.toLowerCase();
    if (text.includes('collab') || text.includes('join')) return UserPlus;
    if (text.includes('milestone') || text.includes('complete')) return CheckCircle2;
    return MessageSquare;
  };

  const renderNotification = (n) => (
    <div key={n.id} className={`rounded-xl border p-3 ${n.read_at ? 'border-border bg-card' : 'border-primary/30 bg-primary/5'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-full p-1.5 ${n.read_at ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
          {React.createElement(notificationIcon(n), { className: 'h-3.5 w-3.5' })}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${n.read_at ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>{n.title}</p>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : 'Recently'}
          </p>
        </div>
        {!n.read_at ? (
          <Button size="sm" variant="outline" onClick={() => markAsRead(n.id)}>
            Mark read
          </Button>
        ) : null}
      </div>
      <div className="mt-2 pl-8">
        {!n.read_at ? (
          <div className="mb-1 h-px w-full bg-primary/20" />
        ) : null}
        {n.project_id ? (
          <Link to={`/projects/${n.project_id}`} className="inline-block text-sm text-primary hover:underline">
            Open project
          </Link>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="page-shell max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">{unread} unread</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={showUnreadOnly ? 'default' : 'outline'} onClick={() => setShowUnreadOnly((v) => !v)}>
              {showUnreadOnly ? 'Showing unread' : 'Unread only'}
            </Button>
            <Button variant="outline" onClick={loadNotifications}>Refresh</Button>
            <Button variant="outline" onClick={markAllAsRead} disabled={unread === 0}>Mark all read</Button>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[35vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-5">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">All caught up</h2>
            <p className="text-sm text-muted-foreground mt-1">New activity will appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {todayItems.length > 0 ? (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today</h2>
                <div className="space-y-2">{todayItems.map(renderNotification)}</div>
              </section>
            ) : null}

            {earlierItems.length > 0 ? (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Earlier</h2>
                <div className="space-y-2">{earlierItems.map(renderNotification)}</div>
              </section>
            ) : null}

            {hasMore ? (
              <div className="pt-2">
                <Button variant="outline" onClick={() => loadNotifications({ append: true })} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
    </div>
  );
}
