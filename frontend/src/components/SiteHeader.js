import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Rss, Trophy, FolderKanban, LogOut, Menu, X, Code } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const desktopNavLink = ({ isActive }) =>
  cn(
    'flex h-16 items-center gap-1.5 px-3 text-sm font-medium border-b-2 transition-colors',
    isActive
      ? 'text-foreground border-primary'
      : 'text-muted-foreground border-transparent hover:text-foreground'
  );

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
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.picture]);

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

          <nav className="hidden md:flex items-stretch gap-0">
            <NavLink to="/explore" className={desktopNavLink}>
              <Code className="w-4 h-4 shrink-0" />
              Explore
            </NavLink>
            <NavLink to="/feed" className={desktopNavLink}>
              <Rss className="w-4 h-4 shrink-0" />
              Feed
            </NavLink>
            <NavLink to="/celebration" className={desktopNavLink}>
              <Trophy className="w-4 h-4 shrink-0" />
              {variant === 'marketing' ? 'Celebration Wall' : 'Celebration'}
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/dashboard" className={desktopNavLink}>
                <FolderKanban className="w-4 h-4 shrink-0" />
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && variant === 'marketing' ? (
              <Button asChild>
                <Link to="/dashboard" data-testid="dashboard-btn">
                  Dashboard
                </Link>
              </Button>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="profile-link"
                >
                  {user?.picture && !avatarLoadFailed ? (
                    <img
                      src={user.picture}
                      alt={user.name || ''}
                      className="w-8 h-8 rounded-full ring-2 ring-border"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline max-w-[10rem] truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
                  data-testid="logout-btn"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : variant === 'marketing' ? (
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
            ) : (
              <Button asChild>
                <Link to="/login" data-testid="header-signin-btn">
                  Sign In
                </Link>
              </Button>
            )}
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
                <NavLink to="/profile" className={mobileNavLink} onClick={closeMobile}>
                  Profile
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
