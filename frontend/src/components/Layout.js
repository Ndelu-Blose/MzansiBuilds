import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, Rss, Trophy, FolderKanban, User, LogOut, Menu, X, Code 
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="text-xl font-bold text-white">
              Mzansi<span className="text-amber-500">Builds</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                to="/explore" 
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Code className="w-4 h-4" />
                Explore
              </Link>
              <Link 
                to="/feed" 
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Rss className="w-4 h-4" />
                Feed
              </Link>
              <Link 
                to="/celebration" 
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                Celebration
              </Link>
              {isAuthenticated && (
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <FolderKanban className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    data-testid="profile-link"
                  >
                    {user?.picture ? (
                      <img 
                        src={user.picture} 
                        alt={user.name} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="hidden lg:inline">{user?.name || user?.email?.split('@')[0]}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-zinc-400 hover:text-white transition-colors p-2"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-sm hover:bg-amber-400 transition-colors"
                  data-testid="header-signin-btn"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-zinc-400 hover:text-white p-2"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-t border-zinc-800">
            <div className="px-4 py-4 space-y-2">
              <Link 
                to="/explore" 
                className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore Projects
              </Link>
              <Link 
                to="/feed" 
                className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Feed
              </Link>
              <Link 
                to="/celebration" 
                className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Celebration Wall
              </Link>
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-800 rounded-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="block px-4 py-2 bg-amber-500 text-zinc-950 font-semibold rounded-sm hover:bg-amber-400 transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
