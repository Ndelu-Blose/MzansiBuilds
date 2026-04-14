import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Rss, Trophy, FolderKanban, Menu, X, Code, Bell, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const desktopNavLink = ({ isActive }) =>
  cn(
    'flex h-16 items-center gap-1.5 px-3 text-sm font-medium border-b-2 transition-colors',
    isActive
      ? 'text-foreground border-primary'
      : 'text-muted-foreground border-transparent hover:text-foreground'
  );

function formatNotificationTime(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function notificationTypeLabel(type) {
  if (type === 'collaboration_request') return 'Collaboration';
  if (type === 'collaboration_decision') return 'Collaboration';
  if (type === 'project_comment') return 'Comment';
  if (type === 'milestone_completed') return 'Milestone';
  if (type === 'project_update_posted') return 'Update';
  return 'Alert';
}

const mobileNavLink = ({ isActive }) =>
  cn(
    'block rounded-md px-4 py-2.5 text-sm font-medium transition-colors border-l-4',
    isActive
      ? 'bg-accent text-foreground border-primary'
      : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
  );

/**
 * @param {{ variant?: 'app' | 'marketing' }} props
 */
export default function SiteHeader({ variant = 'app' }) {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await notificationsAPI.list({ limit: 15, offset: 0 });
      setNotifItems(data.items || []);
      setNotifUnread(typeof data.unread_count === 'number' ? data.unread_count : 0);
    } catch (_e) {
      /* ignore when offline or unauthenticated */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifItems([]);
      setNotifUnread(0);
      return undefined;
    }
    refreshNotifications();
    const t = setInterval(refreshNotifications, 45000);
    return () => clearInterval(t);
  }, [isAuthenticated, refreshNotifications]);

  useEffect(() => {
    if (notifOpen) {
      setNotifLoading(true);
      refreshNotifications().finally(() => setNotifLoading(false));
    }
  }, [notifOpen, refreshNotifications]);

  const handleNotificationClick = async (n) => {
    if (!n.read_at) {
      try {
        await notificationsAPI.markRead(n.id);
        setNotifItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
        );
        setNotifUnread((c) => Math.max(0, c - 1));
      } catch (_e) {
        /* ignore */
      }
    }
    if (n.project_id) {
      setNotifOpen(false);
      navigate(`/projects/${n.project_id}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-foreground shrink-0">
            Mzansi<span className="text-primary">Builds</span>
          </Link>

          {variant === 'marketing' ? (
            <nav className="hidden md:flex items-stretch gap-0">
              <NavLink to="/explore" className={desktopNavLink}>
                <Code className="w-4 h-4 shrink-0" />
                Explore
              </NavLink>
              <NavLink to="/open-roles" className={desktopNavLink}>
                <Users className="w-4 h-4 shrink-0" />
                Open Roles
              </NavLink>
              <NavLink to="/feed" className={desktopNavLink}>
                <Rss className="w-4 h-4 shrink-0" />
                Feed
              </NavLink>
              <NavLink to="/celebration" className={desktopNavLink}>
                <Trophy className="w-4 h-4 shrink-0" />
                Celebration Wall
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" className={desktopNavLink}>
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  Dashboard
                </NavLink>
              )}
            </nav>
          ) : (
            <div className="hidden md:block text-sm text-muted-foreground">Use the sidebar to navigate your workspace</div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && variant === 'app' && (
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors"
                    data-testid="notifications-bell"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notifUnread > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center"
                        data-testid="notifications-badge"
                      >
                        {notifUnread > 9 ? '9+' : notifUnread}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(100vw-1.5rem,24rem)] sm:w-[28rem] p-0 shadow-lg">
                  <div className="px-3 py-2.5 sm:px-4 border-b border-border flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground">Notifications</span>
                    {notifUnread > 0 ? (
                      <span className="text-xs text-muted-foreground">{notifUnread} unread</span>
                    ) : null}
                  </div>
                  <div className="max-h-[min(70vh,22rem)] overflow-y-auto">
                    {notifLoading ? (
                      <p className="p-3 text-sm text-muted-foreground">Loading…</p>
                    ) : notifItems.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground leading-relaxed">
                        No notifications yet. When someone comments, requests to collaborate, or you get project updates,
                        they will show up here. We will also email you when it matters.
                      </p>
                    ) : (
                      notifItems.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={cn(
                            'w-full text-left px-3 py-3 sm:px-4 border-b border-border last:border-0 hover:bg-muted/80 transition-colors text-sm',
                            !n.read_at && 'bg-primary/[0.06]'
                          )}
                          data-testid="notification-row"
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wide text-primary font-semibold shrink-0">
                              {notificationTypeLabel(n.type)}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatNotificationTime(n.created_at)}
                            </span>
                          </div>
                          <p className="font-medium text-foreground line-clamp-2">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-3 mt-0.5 leading-snug">{n.body}</p>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && variant === 'marketing' ? (
                <Button asChild>
                  <Link to="/dashboard" data-testid="dashboard-btn">
                    Dashboard
                  </Link>
                </Button>
              ) : !isAuthenticated && variant === 'marketing' ? (
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="signin-btn"
                  >
                    Sign In
                  </Link>
                  <Button asChild size="default">
                    <Link to="/login" data-testid="get-started-btn">
                      Get Started
                    </Link>
                  </Button>
                </div>
              ) : !isAuthenticated ? (
                <Button asChild>
                  <Link to="/login" data-testid="header-signin-btn">
                    Sign In
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted"
            data-testid="mobile-menu-btn"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1 max-w-7xl mx-auto">
            <NavLink to="/explore" className={mobileNavLink} onClick={closeMobile}>
              Explore Projects
            </NavLink>
            <NavLink to="/feed" className={mobileNavLink} onClick={closeMobile}>
              Feed
            </NavLink>
            <NavLink to="/celebration" className={mobileNavLink} onClick={closeMobile}>
              Celebration Wall
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={mobileNavLink} onClick={closeMobile}>
                  Dashboard
                </NavLink>
                <NavLink to="/my-projects" className={mobileNavLink} onClick={closeMobile}>
                  My Projects
                </NavLink>
                <NavLink to="/collaboration-requests" className={mobileNavLink} onClick={closeMobile}>
                  Collaboration Requests
                </NavLink>
                <NavLink to="/notifications" className={mobileNavLink} onClick={closeMobile}>
                  Notifications
                </NavLink>
                <NavLink to="/profile" className={mobileNavLink} onClick={closeMobile}>
                  Profile
                </NavLink>
                <NavLink to="/settings" className={mobileNavLink} onClick={closeMobile}>
                  Settings
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : variant === 'marketing' ? (
              <div className="pt-2 space-y-2 border-t border-border mt-2">
                <Link
                  to="/login"
                  className="block text-center text-sm font-medium text-muted-foreground py-2"
                  onClick={closeMobile}
                >
                  Sign In
                </Link>
                <Button asChild className="w-full">
                  <Link to="/login" onClick={closeMobile} data-testid="get-started-btn-mobile">
                    Get Started
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-border mt-2">
                <Button asChild className="w-full">
                  <Link to="/login" onClick={closeMobile}>
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
