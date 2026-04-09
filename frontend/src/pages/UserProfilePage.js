import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileAPI } from '../lib/api';
import { Loader2, Github, Code, Trophy, Zap, ExternalLink, FolderKanban, Calendar, MapPin, Linkedin, Globe } from 'lucide-react';
import Layout from '../components/Layout';
import ProjectCard from '../components/ProjectCard';

export default function UserProfilePage() {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await profileAPI.getUser(id);
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!userData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </Layout>
    );
  }

  const { profile, stats, recent_projects } = userData;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="user-profile-page">
        <div className="bg-card border border-border rounded-xl shadow-card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {profile?.avatar_url || userData.picture ? (
              <img
                src={profile?.avatar_url || userData.picture}
                alt={userData.name || ''}
                className="w-24 h-24 rounded-full ring-2 ring-border object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-3xl font-bold text-foreground">
                {userData.name?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1">{profile?.display_name || userData.name || 'Developer'}</h1>
              {profile?.username && <p className="text-sm text-muted-foreground mb-1">@{profile.username}</p>}
              {profile?.headline && <p className="text-sm text-foreground/90 mb-2">{profile.headline}</p>}
              <p className="text-muted-foreground mb-4">{userData.email}</p>

              {profile?.bio && <p className="text-foreground mb-4">{profile.bio}</p>}

              {profile?.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded-md border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {profile?.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    <Github className="w-5 h-5" />
                    GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {profile?.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    <Linkedin className="w-5 h-5" />
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {profile?.portfolio_url && (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    <Globe className="w-5 h-5" />
                    Portfolio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {profile?.location && (
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(userData.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border p-4 rounded-xl shadow-card text-center">
            <FolderKanban className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats?.total_projects || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Projects</p>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-card text-center">
            <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats?.active_projects || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-card text-center">
            <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats?.completed_projects || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Projects
          </h2>

          {!recent_projects || recent_projects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl shadow-card p-8 text-center">
              <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No projects yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recent_projects.map((project) => (
                <ProjectCard key={project.id} project={project} showOwner={false} />
              ))}
            </div>
          )}

          {stats?.total_projects > 5 && (
            <div className="mt-4 text-center">
              <Link to={`/explore?user_id=${id}`} className="text-primary hover:text-primary-hover text-sm font-medium">
                View all {stats.total_projects} projects
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
