import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileAPI } from '../lib/api';
import { 
  Loader2, Github, Code, Trophy, Zap, ExternalLink,
  FolderKanban, Calendar
} from 'lucide-react';
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
      year: 'numeric'
    });
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

  if (!userData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-zinc-400">User not found</p>
        </div>
      </Layout>
    );
  }

  const { profile, stats, recent_projects } = userData;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="user-profile-page">
        {/* Profile Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            {userData.picture ? (
              <img 
                src={userData.picture} 
                alt={userData.name} 
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <div className="w-24 h-24 bg-zinc-700 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                {userData.name?.[0]?.toUpperCase() || userData.email?.[0]?.toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {userData.name || 'Developer'}
              </h1>
              <p className="text-zinc-400 mb-4">{userData.email}</p>

              {profile?.bio && (
                <p className="text-zinc-300 mb-4">{profile.bio}</p>
              )}

              {/* Skills */}
              {profile?.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.skills.map((skill, i) => (
                    <span 
                      key={i}
                      className="font-mono text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="flex items-center gap-4">
                {profile?.github_url && (
                  <a 
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Github className="w-5 h-5" />
                    GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="text-zinc-500 text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(userData.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm text-center">
            <FolderKanban className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-white">{stats?.total_projects || 0}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Projects</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm text-center">
            <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-white">{stats?.active_projects || 0}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Active</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm text-center">
            <Trophy className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="font-mono text-2xl font-bold text-white">{stats?.completed_projects || 0}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed</p>
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-500" />
            Projects
          </h2>

          {!recent_projects || recent_projects.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-8 text-center">
              <FolderKanban className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No projects yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recent_projects.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  showOwner={false}
                />
              ))}
            </div>
          )}

          {stats?.total_projects > 5 && (
            <div className="mt-4 text-center">
              <Link 
                to={`/explore?user_id=${id}`}
                className="text-amber-500 hover:text-amber-400 text-sm"
              >
                View all {stats.total_projects} projects
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
