import React, { useEffect, useState } from 'react';
import { githubAPI, projectsAPI } from '../lib/api';
import { X, Loader2, Github, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stages = [
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
];

const fieldClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function CreateProjectModal({ onClose, onCreated }) {
  const [mode, setMode] = useState('github');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('');
  const [stage, setStage] = useState('idea');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [githubAccount, setGithubAccount] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [repoSearchInput, setRepoSearchInput] = useState('');
  const [repoSearch, setRepoSearch] = useState('');
  const [repoPage, setRepoPage] = useState(1);
  const [repoPerPage] = useState(8);
  const [repoTotal, setRepoTotal] = useState(0);

  useEffect(() => {
    if (mode !== 'github') {
      return;
    }
    const id = setTimeout(() => {
      setRepoPage(1);
      setRepoSearch(repoSearchInput.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [repoSearchInput, mode]);

  useEffect(() => {
    if (mode === 'github') {
      loadGitHub(repoPage, repoSearch);
    }
  }, [mode, repoPage, repoSearch]);

  const loadGitHub = async (page = 1, search = '') => {
    setRepoLoading(true);
    setRepoError('');
    try {
      const [accountRes, reposRes] = await Promise.all([
        githubAPI.getAccount(),
        githubAPI.listRepos({ page, per_page: repoPerPage, search }),
      ]);
      setGithubAccount(accountRes.data);
      setRepos(reposRes.data.items || []);
      setRepoTotal(reposRes.data.total || 0);
    } catch (_err) {
      setGithubAccount(null);
      setRepos([]);
      setRepoTotal(0);
      setRepoError('Failed to load repositories. Please retry.');
    } finally {
      setRepoLoading(false);
    }
  };

  const startGithubConnect = async () => {
    setRepoError('');
    try {
      const response = await githubAPI.connectStart();
      window.location.href = response.data.authorization_url;
    } catch (err) {
      setRepoError(err?.response?.data?.detail || 'Unable to start GitHub connection. Check backend GitHub OAuth env settings.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'idea' && !title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const techStackArray = techStack
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      let response;
      if (mode === 'github') {
        if (!selectedRepoId) {
          setError('Select a repository to import');
          setLoading(false);
          return;
        }
        response = await projectsAPI.importFromGithub({
          github_repo_id: Number(selectedRepoId),
          title: title.trim() || null,
          stage,
          short_pitch: supportNeeded.trim() || null,
          long_description: description.trim() || null,
        });
      } else {
        response = await projectsAPI.createManual({
          title: title.trim(),
          stage,
          short_pitch: supportNeeded.trim() || null,
          long_description: description.trim() || null,
          tags: techStackArray.length > 0 ? techStackArray : [],
          looking_for_help: false,
        });
      }

      onCreated(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        data-testid="create-project-modal"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Create Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
            data-testid="close-modal-btn"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={() => setMode('github')} variant={mode === 'github' ? 'default' : 'outline'}>
              <Github className="w-4 h-4" />
              Import from GitHub
            </Button>
            <Button type="button" onClick={() => setMode('idea')} variant={mode === 'idea' ? 'default' : 'outline'}>
              Start Idea Project
            </Button>
          </div>

          {mode === 'github' && (
            <div className="space-y-3 rounded-md border border-border p-3">
              {!githubAccount?.connected ? (
                <>
                  <Button type="button" onClick={startGithubConnect} variant="secondary" className="w-full">
                    Connect GitHub
                  </Button>
                  {repoError && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {repoError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Connected as @{githubAccount.username}</p>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={repoSearchInput}
                      onChange={(e) => setRepoSearchInput(e.target.value)}
                      placeholder="Search repositories..."
                      className={`${fieldClass} pl-9`}
                    />
                  </div>
                  {repoLoading ? (
                    <div className="py-8 flex items-center justify-center text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading repositories...
                    </div>
                  ) : repoError ? (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm">
                      <p className="text-destructive">{repoError}</p>
                      <Button type="button" variant="outline" className="mt-2" onClick={() => loadGitHub(repoPage, repoSearch)}>
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </Button>
                    </div>
                  ) : repos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No repositories found.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {repos.map((repo) => {
                        const selected = String(repo.github_repo_id) === selectedRepoId;
                        return (
                          <button
                            key={repo.github_repo_id}
                            type="button"
                            onClick={() => setSelectedRepoId(String(repo.github_repo_id))}
                            className={`w-full text-left rounded-md border p-3 transition-colors ${
                              selected ? 'border-primary bg-accent/40' : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-foreground">{repo.full_name}</p>
                              <div className="flex gap-1">
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">{repo.visibility}</span>
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                                  {repo.owner_match ? 'owner' : repo.contributor_match ? 'contributor' : 'external'}
                                </span>
                              </div>
                            </div>
                            {repo.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{repo.description}</p>}
                            <p className="text-xs text-muted-foreground mt-2">
                              {repo.language || 'Unknown'} • Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!repoLoading && repoTotal > repoPerPage && (
                    <div className="flex items-center justify-between pt-1">
                      <Button type="button" variant="outline" size="sm" disabled={repoPage <= 1} onClick={() => setRepoPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Page {repoPage} of {Math.max(1, Math.ceil(repoTotal / repoPerPage))}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={repoPage >= Math.ceil(repoTotal / repoPerPage)}
                        onClick={() => setRepoPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Project Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'github' ? 'Optional title override' : 'What are you building?'}
              className={fieldClass}
              data-testid="project-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mode === 'github' ? 'Add context/story beyond the repo...' : 'Describe your project...'}
              className={`${fieldClass} px-4 py-3 resize-none`}
              rows={3}
              data-testid="project-description-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Tech Stack</label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="React, Node.js, PostgreSQL (comma separated)"
              className={fieldClass}
              data-testid="project-techstack-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Current Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={fieldClass} data-testid="project-stage-select">
              {stages.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Looking for help with</label>
            <input
              type="text"
              value={supportNeeded}
              onChange={(e) => setSupportNeeded(e.target.value)}
              placeholder="e.g., UI design, backend development, testing"
              className={fieldClass}
              data-testid="project-support-input"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (mode === 'github' && !selectedRepoId)}
              data-testid="create-project-submit-btn"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'github' ? 'Import Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
