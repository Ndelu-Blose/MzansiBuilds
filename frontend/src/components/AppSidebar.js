import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Code,
  FolderKanban,
  LogOut,
  PartyPopper,
  Rss,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collaborationAPI, notificationsAPI } from '../lib/api';
import { cn } from '../lib/utils';

function SidebarLink({ to, label, icon: Icon, badge, onClick, isDanger = false }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors',
          isDanger
            ? 'text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-transparent'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:border-border/80',
          isActive && !isDanger && 'bg-primary/10 text-foreground border-primary/30 font-semibold'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex items-center gap-2.5">
            {!isDanger && (
              <span
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full opacity-0 transition-opacity',
                  isActive && 'opacity-100 bg-primary'
                )}
                aria-hidden
              />
            )}
            <Icon className={cn('h-4 w-4 shrink-0', isDanger ? 'text-destructive' : isActive ? 'text-primary' : '')} />
            <span>{label}</span>
          </span>
          {typeof badge === 'number' && badge > 0 ? (
            <span className="min-w-[1.4rem] rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-center text-xs font-semibold text-primary">
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarGroup({ title, children }) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

export default function AppSidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifUnread, setNotifUnread] = useState(0);
  const [pendingCollabs, setPendingCollabs] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const displayName = user?.name || user?.email?.split('@')[0] || 'Builder';

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifUnread(0);
      setPendingCollabs(0);
      return;
    }
    try {
      const [notifRes, collabRes] = await Promise.all([
        notificationsAPI.list({ limit: 1, offset: 0 }),
        collaborationAPI.getMyRequests(),
      ]);
      setNotifUnread(typeof notifRes.data.unread_count === 'number' ? notifRes.data.unread_count : 0);
      const pending = (collabRes.data.items || []).filter((item) => item.status === 'pending');
      setPendingCollabs(pending.length);
    } catch (_err) {
      setNotifUnread(0);
      setPendingCollabs(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCounts();
    const timer = setInterval(refreshCounts, 45000);
    return () => clearInterval(timer);
  }, [refreshCounts, location.pathname]);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/');
    } catch (_err) {
      setLogoutError('Sign out failed. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 flex-col border-r border-border bg-card/60 backdrop-blur">
      <div className="px-5 py-4 border-b border-border">
        <Link to="/" className="text-xl font-bold text-foreground">
          Mzansi<span className="text-primary">Builds</span>
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Build in public workspace</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <SidebarGroup title="Main">
          <SidebarLink to="/dashboard" label="Dashboard" icon={FolderKanban} />
          <SidebarLink to="/explore" label="Explore" icon={Code} />
          <SidebarLink to="/feed" label="Feed" icon={Rss} />
          <SidebarLink to="/open-roles" label="Open Roles" icon={Users} />
          <SidebarLink to="/celebration" label="Celebration" icon={PartyPopper} />
        </SidebarGroup>

        <SidebarGroup title="Workspace">
          <SidebarLink to="/my-projects" label="My Projects" icon={FolderKanban} />
          <SidebarLink to="/collaboration-requests" label="Collaboration Requests" icon={Users} badge={pendingCollabs} />
          <SidebarLink to="/notifications" label="Notifications" icon={Bell} badge={notifUnread} />
        </SidebarGroup>

        <SidebarGroup title="Account">
          <SidebarLink to="/profile" label="Profile" icon={User} />
          <SidebarLink to="/settings" label="Settings" icon={Settings} />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className={cn(
                'w-full group relative flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-transparent',
                isSigningOut && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span className="flex items-center gap-2.5">
                <LogOut className="h-4 w-4 shrink-0 text-destructive" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </span>
            </button>
          ) : (
            <SidebarLink to="/login" label="Sign in" icon={User} />
          )}
          {logoutError ? <p className="px-1 text-xs text-destructive">{logoutError}</p> : null}
        </SidebarGroup>
      </div>

      <div className="m-4 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt={displayName} className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-muted text-foreground flex items-center justify-center text-sm font-semibold">
              {displayName[0]?.toUpperCase() || 'M'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground">
              View profile
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
