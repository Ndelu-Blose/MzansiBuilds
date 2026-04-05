import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, Users, Trophy, ArrowRight, Code, Zap, Target } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold text-white">
              Mzansi<span className="text-amber-500">Builds</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/explore" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Explore</Link>
              <Link to="/feed" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Feed</Link>
              <Link to="/celebration" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Celebration Wall</Link>
            </nav>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link 
                  to="/dashboard" 
                  className="bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-sm hover:bg-amber-400 transition-colors"
                  data-testid="dashboard-btn"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    data-testid="signin-btn"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/login" 
                    className="bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded-sm hover:bg-amber-400 transition-colors"
                    data-testid="get-started-btn"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section 
        className="relative py-24 md:py-32"
        style={{
          backgroundImage: 'url(/images/hero-landing.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-zinc-950/80"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-500 mb-6">
              <Code className="w-4 h-4" />
              Build in Public
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none mb-6">
              Ship your projects.<br />
              <span className="text-amber-500">Share your journey.</span>
            </h1>
            <p className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-xl">
              MzansiBuilds is where South African developers come to build in public, 
              track progress, collaborate, and celebrate completed projects.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/login" 
                className="bg-amber-500 text-zinc-950 font-semibold px-8 py-3 rounded-sm hover:bg-amber-400 transition-colors inline-flex items-center gap-2"
                data-testid="hero-cta-btn"
              >
                Start Building
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to="/feed" 
                className="bg-transparent text-white border border-zinc-700 px-8 py-3 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
                data-testid="explore-feed-btn"
              >
                Explore Feed
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4">
              Everything you need to build in public
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              From idea to completion, track your progress and connect with the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-sm flex items-center justify-center mb-6">
                <Rocket className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Track Progress</h3>
              <p className="text-zinc-400">
                Move through project stages from idea to completion. Set milestones and share updates along the way.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-sm flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Collaborate</h3>
              <p className="text-zinc-400">
                Find collaborators for your projects. Comment, request to join, and build together with the community.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-sm flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Celebrate</h3>
              <p className="text-zinc-400">
                When you ship, your project joins the Celebration Wall. Get recognized for completing what you started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stages */}
      <section className="py-24 border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
              Project Lifecycle
            </h2>
            <p className="text-zinc-400">Track your project through every stage</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { stage: 'idea', icon: Zap, label: 'Idea' },
              { stage: 'planning', icon: Target, label: 'Planning' },
              { stage: 'in_progress', icon: Code, label: 'In Progress' },
              { stage: 'testing', icon: Rocket, label: 'Testing' },
              { stage: 'completed', icon: Trophy, label: 'Completed' }
            ].map((item, index) => (
              <div key={item.stage} className="flex items-center">
                <div className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider badge-${item.stage} flex items-center gap-2`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {index < 4 && <ArrowRight className="w-4 h-4 text-zinc-600 mx-2 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4">
            Ready to build in public?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Join the community of South African developers shipping projects and sharing their journey.
          </p>
          <Link 
            to="/login" 
            className="bg-amber-500 text-zinc-950 font-semibold px-8 py-3 rounded-sm hover:bg-amber-400 transition-colors inline-flex items-center gap-2"
            data-testid="cta-signup-btn"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold text-white">
              Mzansi<span className="text-amber-500">Builds</span>
            </div>
            <p className="text-zinc-500 text-sm">
              Built with pride in South Africa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
