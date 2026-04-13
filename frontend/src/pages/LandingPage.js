import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Users, Trophy, ArrowRight, Code, Zap, Target } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="marketing" />

      {/* Hero */}
      <section
        className="relative py-24 md:py-32"
        style={{
          backgroundImage: 'url(/images/hero-landing.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl rounded-xl border border-border bg-card/95 shadow-card p-8 md:p-10 backdrop-blur-sm">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary mb-6">
              <Code className="w-4 h-4" />
              Build in Public
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tighter leading-none mb-6">
              Ship your projects.
              <br />
              <span className="gradient-text">Share your journey.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              MzansiBuilds helps builders discover active opportunities, evaluate project momentum, and prove collaboration credibility.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" variant="brand">
                <Link to="/login" data-testid="hero-cta-btn">
                  Start Building
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/open-roles" data-testid="explore-feed-btn">
                  Browse Open Roles
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
              Everything you need to build in public
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From idea to completion, track your progress and connect with the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border p-8 rounded-xl shadow-card">
              <div className="w-12 h-12 bg-accent border border-border rounded-lg flex items-center justify-center mb-6">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Track Progress</h3>
              <p className="text-muted-foreground">
                Evaluate momentum with health, timeline, and activity signals instead of guessing.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-xl shadow-card">
              <div className="w-12 h-12 bg-accent border border-border rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Collaborate</h3>
              <p className="text-muted-foreground">
                Discover matched projects, suggested collaborators, and open roles that fit your skills.
              </p>
            </div>

            <div className="bg-card border border-border p-8 rounded-xl shadow-card">
              <div className="w-12 h-12 bg-accent border border-border rounded-lg flex items-center justify-center mb-6">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Celebrate</h3>
              <p className="text-muted-foreground">
                Build trust with builder score, receipts, and verifiable collaboration signals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stages */}
      <section className="py-24 border-t border-border bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-4">Project Lifecycle</h2>
            <p className="text-muted-foreground">Track your project through every stage</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { stage: 'idea', icon: Zap, label: 'Idea' },
              { stage: 'planning', icon: Target, label: 'Planning' },
              { stage: 'in_progress', icon: Code, label: 'In Progress' },
              { stage: 'testing', icon: Rocket, label: 'Testing' },
              { stage: 'completed', icon: Trophy, label: 'Completed' },
            ].map((item, index) => (
              <div key={item.stage} className="flex items-center">
                <div
                  className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider badge-${item.stage} flex items-center gap-2`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {index < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-2 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
            Ready to build in public?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the community of South African developers shipping projects and sharing their journey.
          </p>
          <Button asChild size="lg" variant="brand">
            <Link to="/login" data-testid="cta-signup-btn">
              Get Started for Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xl font-bold text-foreground">
              Mzansi<span className="text-primary">Builds</span>
            </div>
            <p className="text-muted-foreground text-sm">Built with pride in South Africa</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
