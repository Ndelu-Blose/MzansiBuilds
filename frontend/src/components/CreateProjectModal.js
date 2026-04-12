import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { githubAPI, projectsAPI } from '../lib/api';
import { X, Loader2, Github, Search, RefreshCw, ChevronLeft, ChevronRight, Star, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TechStackPicker } from '@/components/TechStackPicker';

const stages = [
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
];

const fieldClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

function inferTagsFromRepo(repo) {
  const raw = [];
  if (repo.language) raw.push(String(repo.language).trim());
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  topics.slice(0, 10).forEach((t) => {
    if (t) raw.push(String(t).trim());
  });
  const seen = new Set();
  const out = [];
  raw.forEach((tag) => {
    if (!tag) return;
    const k = tag.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(tag);
    }
  });
  return out;
}

function topLanguageKeys(languagesObj, limit = 5) {
  if (!languagesObj || typeof languagesObj !== 'object') return [];
  return Object.entries(languagesObj)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, limit)
    .map(([k]) => k);
}

function mergeUniqueTags(prev, incoming) {
  const seen = new Set(prev.map((t) => String(t).toLowerCase()));
  const merged = [...prev];
  incoming.forEach((tag) => {
    const t = String(tag).trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(t);
    }
  });
  return merged;
}

function suggestStageFromRepo(repo, languagesObj) {
  const pushed = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
  const recent = pushed && Date.now() - pushed < 14 * 86400000;
  const langCount = languagesObj ? Object.keys(languagesObj).length : 0;
  const stars = repo.stargazers_count || 0;
  if (recent && (langCount > 2 || stars > 5)) return 'in_progress';
  if ((repo.description || '').length > 80) return 'planning';
  return 'idea';
}

function formatRelativeDate(iso) {
  if (!iso) return 'N/A';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'N/A';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

/** POST /api/integrations/github/connect/start — avoid blaming OAuth when the request never hits FastAPI. */
function githubConnectStartErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  const status = err?.response?.status;
  if (status === 405) {
    return (
      'Could not reach your API (HTTP 405). The browser may be posting to the frontend host instead of Railway. ' +
      'Set REACT_APP_BACKEND_URL in Vercel to your FastAPI origin (https://…railway.app, no /api suffix), then redeploy.'
    );
  }
  if (!err?.response) {
    return (
      'Could not reach the backend. Set REACT_APP_BACKEND_URL to your Railway API URL (build-time on Vercel), redeploy, and try again.'
    );
  }
  return 'Unable to start GitHub connection. If REACT_APP_BACKEND_URL is correct, check backend GitHub OAuth (GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI).';
}

const githubHintClass = 'text-xs text-muted-foreground mt-1';

/** Non-blocking review hints: description length below this nudges a fuller story. */
const IMPORT_REVIEW_DESCRIPTION_MIN_CHARS = 40;

/** @typedef {'suggestion' | 'notice' | 'important'} ReviewWarningSeverity */

function reviewWarningSurfaceClass(severity) {
  switch (severity) {
    case 'important':
      return 'border-l-[3px] border-destructive/75 bg-destructive/[0.06]';
    case 'notice':
      return 'border-l-[3px] border-amber-500/80 bg-amber-500/[0.09]';
    default:
      return 'border-l-[3px] border-muted-foreground/35 bg-muted/35';
  }
}

function FieldSourceBadge({ source }) {
  if (!source) return null;
  const map = {
    github: 'From GitHub',
    readme: 'From README',
    lang: 'From language detection',
    mixed: 'Mixed sources',
    manual: 'Edited manually',
  };
  return <p className={`${githubHintClass} font-medium text-foreground/70`}>{map[source] || source}</p>;
}

function formatReviewValue(value, emptyLabel = '— (using default)') {
  if (value === null || value === undefined) return emptyLabel;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length ? t : emptyLabel;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : emptyLabel;
  }
  return String(value);
}

export default function CreateProjectModal({ onClose, onCreated }) {
  const [mode, setMode] = useState('github');
  const [importStep, setImportStep] = useState('edit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackTags, setTechStackTags] = useState([]);
  const [stage, setStage] = useState('idea');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [githubAccount, setGithubAccount] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [selectedRepoPreview, setSelectedRepoPreview] = useState(null);
  const [tagMergeMode, setTagMergeMode] = useState('merge');
  const [dirtyTitle, setDirtyTitle] = useState(false);
  const [dirtyDescription, setDirtyDescription] = useState(false);
  const [dirtyTags, setDirtyTags] = useState(false);
  const [provTitle, setProvTitle] = useState(null);
  const [provDescription, setProvDescription] = useState(null);
  const [provTags, setProvTags] = useState(null);
  const [suggestedStage, setSuggestedStage] = useState(null);
  const [repoLanguages, setRepoLanguages] = useState(null);
  const [langsLoading, setLangsLoading] = useState(false);
  const [readmeText, setReadmeText] = useState(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [repoMetaLoaded, setRepoMetaLoaded] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [repoSearchInput, setRepoSearchInput] = useState('');
  const [repoSearch, setRepoSearch] = useState('');
  const [repoPage, setRepoPage] = useState(1);
  const [repoPerPage] = useState(8);
  const [repoTotal, setRepoTotal] = useState(0);
  const fetchSeq = useRef(0);
  const descriptionInputRef = useRef(null);
  const tagMergeModeRef = useRef(tagMergeMode);
  tagMergeModeRef.current = tagMergeMode;

  const focusFieldInEditStep = useCallback((target) => {
    setImportStep('edit');
    setError('');
    const run = () => {
      if (target === 'title') {
        document.getElementById('project-title-input')?.focus();
        return;
      }
      if (target === 'description') {
        descriptionInputRef.current?.focus();
        return;
      }
      if (target === 'tags') {
        document.querySelector('[data-testid="project-techstack-input"]')?.focus();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  useEffect(() => {
    setImportStep('edit');
  }, [mode]);

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

  const loadGitHub = useCallback(async (page = 1, search = '') => {
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
  }, [repoPerPage]);

  useEffect(() => {
    if (mode === 'github') {
      loadGitHub(repoPage, repoSearch);
    }
  }, [mode, repoPage, repoSearch, loadGitHub]);

  useEffect(() => {
    if (mode !== 'idea') return;
    setSelectedRepoId('');
    setSelectedRepoPreview(null);
    setRepoLanguages(null);
    setReadmeText(null);
    setSuggestedStage(null);
    setDirtyTitle(false);
    setDirtyDescription(false);
    setDirtyTags(false);
    setProvTitle(null);
    setProvDescription(null);
    setProvTags(null);
    setRepoMetaLoaded(false);
  }, [mode]);

  useEffect(() => {
    if (!selectedRepoId || mode !== 'github') {
      setRepoLanguages(null);
      setReadmeText(null);
      setLangsLoading(false);
      setReadmeLoading(false);
      setRepoMetaLoaded(false);
      return undefined;
    }
    const seq = ++fetchSeq.current;
    const t = setTimeout(async () => {
      setLangsLoading(true);
      setReadmeLoading(true);
      setRepoMetaLoaded(false);
      try {
        const [langRes, readmeRes] = await Promise.all([
          githubAPI.repoLanguages(selectedRepoId).catch(() => ({ data: { languages: {} } })),
          githubAPI.repoReadmeSummary(selectedRepoId).catch(() => ({ data: { text: null } })),
        ]);
        if (seq !== fetchSeq.current) return;
        const langs = langRes.data?.languages || {};
        setRepoLanguages(langs);
        setReadmeText(readmeRes.data?.text ?? null);
        const top = topLanguageKeys(langs, 5);
        setTechStackTags((prev) => {
          const merge = tagMergeModeRef.current === 'merge';
          if (!merge) {
            const base = inferTagsFromRepo(selectedRepoPreview || {});
            return mergeUniqueTags(base, top);
          }
          return mergeUniqueTags(prev, top);
        });
        if (top.length > 0) {
          setProvTags((p) => {
            if (p === 'manual' || p === 'mixed') return 'mixed';
            if (p === 'github') return 'mixed';
            if (!p) return 'lang';
            return 'mixed';
          });
        }
        const sug = suggestStageFromRepo(selectedRepoPreview || {}, langs);
        setSuggestedStage(sug);
      } finally {
        if (seq === fetchSeq.current) {
          setLangsLoading(false);
          setReadmeLoading(false);
          setRepoMetaLoaded(true);
        }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [selectedRepoId, mode, selectedRepoPreview]);

  const startGithubConnect = async () => {
    setRepoError('');
    try {
      const response = await githubAPI.connectStart();
      window.location.href = response.data.authorization_url;
    } catch (err) {
      setRepoError(githubConnectStartErrorMessage(err));
    }
  };

  const applyTagsForRepo = useCallback((repo, merge) => {
    const inferred = inferTagsFromRepo(repo);
    if (merge) {
      setTechStackTags((prev) => mergeUniqueTags(prev, inferred));
    } else {
      setTechStackTags(inferred);
    }
  }, []);

  const handleRepoSelect = useCallback(
    (repo) => {
      const nextId = String(repo.github_repo_id);
      if (selectedRepoId && selectedRepoId !== nextId && (dirtyTitle || dirtyDescription || dirtyTags)) {
        const ok = window.confirm(
          'Switching repositories will replace imported fields where you made changes. Continue?'
        );
        if (!ok) return;
      }
      setDirtyTitle(false);
      setDirtyDescription(false);
      setDirtyTags(false);
      setImportStep('edit');
      setSelectedRepoId(nextId);
      setSelectedRepoPreview(repo);
      setTitle(repo.name || '');
      setDescription(repo.description ?? '');
      const hasDesc = !!(repo.description && String(repo.description).trim());
      setProvTitle('github');
      setProvDescription(hasDesc ? 'github' : null);
      setProvTags('github');
      applyTagsForRepo(repo, tagMergeModeRef.current === 'merge');
      setRepoLanguages(null);
      setReadmeText(null);
      setRepoMetaLoaded(false);
      setSuggestedStage(suggestStageFromRepo(repo, null));
    },
    [selectedRepoId, dirtyTitle, dirtyDescription, dirtyTags, applyTagsForRepo]
  );

  const clearImportedGithub = useCallback(() => {
    setSelectedRepoId('');
    setSelectedRepoPreview(null);
    setTitle('');
    setDescription('');
    setTechStackTags([]);
    setRepoLanguages(null);
    setReadmeText(null);
    setSuggestedStage(null);
    setDirtyTitle(false);
    setDirtyDescription(false);
    setDirtyTags(false);
    setProvTitle(null);
    setProvDescription(null);
    setProvTags(null);
    setImportStep('edit');
    setRepoMetaLoaded(false);
    fetchSeq.current += 1;
  }, []);

  const applyReadmeToDescription = useCallback(() => {
    if (!readmeText) return;
    setDescription(readmeText.slice(0, 4000));
    setDirtyDescription(true);
    setProvDescription('readme');
  }, [readmeText]);

  const performImport = async () => {
    setLoading(true);
    setError('');

    try {
      let response;
      if (mode === 'github') {
        if (!selectedRepoId) {
          setError('Select a repository to import');
          setLoading(false);
          return;
        }
        const homepage = selectedRepoPreview?.homepage?.trim() || null;
        response = await projectsAPI.importFromGithub({
          github_repo_id: Number(selectedRepoId),
          title: title.trim() || null,
          stage,
          short_pitch: supportNeeded.trim() || null,
          long_description: description.trim() || null,
          tags: techStackTags,
          demo_url: homepage || undefined,
        });
      } else {
        response = await projectsAPI.createManual({
          title: title.trim(),
          stage,
          short_pitch: supportNeeded.trim() || null,
          long_description: description.trim() || null,
          tags: techStackTags.length > 0 ? techStackTags : [],
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

  const goToReview = () => {
    if (!selectedRepoId) {
      setError('Select a repository to import');
      return;
    }
    setError('');
    setImportStep('review');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'idea') {
      if (!title.trim()) {
        setError('Title is required');
        return;
      }
      await performImport();
      return;
    }
    if (mode === 'github' && importStep === 'edit') {
      goToReview();
    }
  };

  const showGithubHints = mode === 'github' && !!selectedRepoId && importStep === 'edit';
  const thinRepoCopy =
    mode === 'github' &&
    selectedRepoId &&
    repoMetaLoaded &&
    !(selectedRepoPreview?.description || '').trim() &&
    !readmeText;
  const prefilledChips =
    mode === 'github' &&
    !!selectedRepoId &&
    (!!title.trim() || !!description.trim() || techStackTags.length > 0);
  const showEditorFields = mode === 'idea' || (mode === 'github' && importStep === 'edit');
  const showGithubPicker = mode === 'github' && importStep === 'edit';
  const homepage = selectedRepoPreview?.homepage?.trim() || null;

  const importReviewWarnings = useMemo(() => {
    if (mode !== 'github' || importStep !== 'review') return [];
    /** @type {{ key: string; text: string; severity: ReviewWarningSeverity; jumpTo?: 'title' | 'description' | 'tags' }[]} */
    const items = [];
    if (!title.trim()) {
      items.push({
        key: 'title',
        severity: 'suggestion',
        jumpTo: 'title',
        text: 'No custom title — the GitHub repository name will be used as the project title.',
      });
    }
    const desc = description.trim();
    if (!desc) {
      items.push({
        key: 'desc-empty',
        severity: 'important',
        jumpTo: 'description',
        text: 'No description — adding a short summary makes the project much easier to understand.',
      });
    } else if (desc.length < IMPORT_REVIEW_DESCRIPTION_MIN_CHARS) {
      items.push({
        key: 'desc-short',
        severity: 'notice',
        jumpTo: 'description',
        text: 'Description is quite short — a fuller story helps collaborators and visitors.',
      });
    }
    if (techStackTags.length === 0) {
      items.push({
        key: 'tags',
        severity: 'suggestion',
        jumpTo: 'tags',
        text: 'No tech tags — adding languages or topics helps others discover this project.',
      });
    }
    return items;
  }, [mode, importStep, title, description, techStackTags]);

  const hasStrongReviewWarning = importReviewWarnings.some((w) => w.severity === 'important');
  const descCharCount = description.trim().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto transition-shadow duration-200"
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

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={() => setMode('github')} variant={mode === 'github' ? 'default' : 'outline'}>
              <Github className="w-4 h-4" />
              Import from GitHub
            </Button>
            <Button type="button" onClick={() => setMode('idea')} variant={mode === 'idea' ? 'default' : 'outline'}>
              Start Idea Project
            </Button>
          </div>

          {mode === 'github' && githubAccount?.connected && (
            <div
              className="flex flex-wrap gap-2 transition-opacity duration-200"
              data-testid="github-import-summary-chips"
              aria-label="Import progress"
            >
              <span className="text-xs rounded-full border border-border px-2 py-0.5 bg-muted/40 text-foreground">GitHub connected</span>
              {selectedRepoId ? (
                <span className="text-xs rounded-full border border-primary/40 px-2 py-0.5 bg-primary/10 text-foreground">Repo selected</span>
              ) : (
                <span className="text-xs rounded-full border border-dashed border-border px-2 py-0.5 text-muted-foreground">Pick a repo</span>
              )}
              {prefilledChips ? (
                <span className="text-xs rounded-full border border-primary/40 px-2 py-0.5 bg-primary/5 text-foreground">Fields prefilled</span>
              ) : null}
              {importStep === 'review' ? (
                <span className="text-xs rounded-full border border-border px-2 py-0.5 text-foreground">Reviewing import</span>
              ) : selectedRepoId ? (
                <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">Ready to review</span>
              ) : null}
            </div>
          )}

          {showGithubPicker && (
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
                            onClick={() => handleRepoSelect(repo)}
                            className={`w-full text-left rounded-md border p-3 transition-all duration-150 ${
                              selected ? 'border-primary bg-accent/40 shadow-sm' : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                {repo.owner_avatar_url ? (
                                  <img
                                    src={repo.owner_avatar_url}
                                    alt=""
                                    className="h-8 w-8 rounded-full shrink-0 border border-border"
                                    width={32}
                                    height={32}
                                  />
                                ) : null}
                                <p className="font-medium text-sm text-foreground truncate">{repo.full_name}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                                  {repo.visibility}
                                </span>
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                                  {repo.owner_match ? 'owner' : repo.contributor_match ? 'contributor' : 'external'}
                                </span>
                              </div>
                            </div>
                            {repo.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{repo.description}</p>}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-2">
                              <span>{repo.language || 'Unknown'}</span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3" aria-hidden />
                                {repo.stargazers_count ?? 0}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <GitFork className="w-3 h-3" aria-hidden />
                                {repo.forks_count ?? 0}
                              </span>
                              <span>· Updated {formatRelativeDate(repo.updated_at)}</span>
                            </div>
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

          {showGithubPicker && selectedRepoPreview && githubAccount?.connected && (
            <div
              className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 transition-all duration-200"
              data-testid="github-repo-preview"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Selected repository</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearImportedGithub}>
                  Clear imported data
                </Button>
              </div>
              <div className="flex gap-3">
                {selectedRepoPreview.owner_avatar_url ? (
                  <img
                    src={selectedRepoPreview.owner_avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full border border-border shrink-0"
                    width={40}
                    height={40}
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedRepoPreview.full_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {(selectedRepoPreview.description || '').trim()
                      ? selectedRepoPreview.description
                      : 'No description on GitHub — add your own below, or use README if available.'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Language: {selectedRepoPreview.language || '—'}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3" />
                      {selectedRepoPreview.stargazers_count ?? 0} stars
                    </span>
                    <span className="flex items-center gap-0.5">
                      <GitFork className="w-3 h-3" />
                      {selectedRepoPreview.forks_count ?? 0} forks
                    </span>
                    <span>{selectedRepoPreview.visibility || '—'}</span>
                    <span>Updated {formatRelativeDate(selectedRepoPreview.updated_at)}</span>
                    <span>Pushed {formatRelativeDate(selectedRepoPreview.pushed_at)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Topics: </span>
                    {Array.isArray(selectedRepoPreview.topics) && selectedRepoPreview.topics.length > 0
                      ? selectedRepoPreview.topics.join(', ')
                      : '—'}
                  </div>
                  {(langsLoading || readmeLoading) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading languages & README…
                    </p>
                  )}
                  {repoMetaLoaded && (!repoLanguages || Object.keys(repoLanguages).length === 0) && !langsLoading && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Languages: </span>
                      No language breakdown from GitHub for this repo.
                    </p>
                  )}
                  {repoLanguages && Object.keys(repoLanguages).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Languages: </span>
                      {topLanguageKeys(repoLanguages, 8).join(', ')}
                    </p>
                  )}
                  {readmeText ? (
                    <div className="pt-1 space-y-1">
                      <p className="text-xs font-medium text-foreground/80">README preview</p>
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{readmeText.slice(0, 400)}</p>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={applyReadmeToDescription}>
                        Use README in description
                      </Button>
                    </div>
                  ) : repoMetaLoaded && !readmeLoading ? (
                    <div className="pt-1 space-y-1">
                      <p className="text-xs font-medium text-foreground/80">README</p>
                      <p className="text-xs text-muted-foreground">No README found on the default branch.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {showGithubPicker && githubAccount?.connected && (
            <fieldset className="space-y-1.5 rounded-md border border-border p-3">
              <legend className="text-xs font-medium text-foreground px-1">Tech stack from GitHub</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tag-merge" checked={tagMergeMode === 'merge'} onChange={() => setTagMergeMode('merge')} />
                  Merge with my tags
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tag-merge" checked={tagMergeMode === 'replace'} onChange={() => setTagMergeMode('replace')} />
                  Replace with detected stack
                </label>
              </div>
            </fieldset>
          )}

          {showGithubPicker && suggestedStage && selectedRepoId && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Suggested stage:</span>
              <span className="font-medium text-foreground">{stages.find((s) => s.value === suggestedStage)?.label || suggestedStage}</span>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStage(suggestedStage)}>
                Apply suggestion
              </Button>
            </div>
          )}

          {mode === 'github' && importStep === 'review' && selectedRepoPreview && (
            <div
              className="rounded-lg border border-border bg-muted/15 p-4 space-y-3 text-sm"
              data-testid="github-import-review"
            >
              <p className="font-medium text-foreground">Review import</p>
              <p className="text-xs text-muted-foreground">
                These values will be sent to <span className="font-mono">POST /projects/import/github</span>. Defaults apply where noted.
              </p>
              {importReviewWarnings.length > 0 ? (
                <div
                  className="rounded-md border border-border bg-muted/20 px-3 py-2.5 text-xs text-foreground space-y-2"
                  data-testid="github-import-review-warnings"
                  role="status"
                >
                  <p className="font-medium text-foreground">
                    {hasStrongReviewWarning ? 'Heads up — import is still allowed' : 'Suggestions — import is not blocked'}
                  </p>
                  <ul className="space-y-2 list-none p-0 m-0">
                    {importReviewWarnings.map((w) => (
                      <li key={w.key} className={`rounded-r-md pl-2.5 pr-2 py-2 ${reviewWarningSurfaceClass(w.severity)}`}>
                        <p className="text-muted-foreground leading-snug">{w.text}</p>
                        {w.jumpTo ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 mt-1 text-xs font-medium text-primary"
                            onClick={() => focusFieldInEditStep(w.jumpTo)}
                            data-testid={`github-import-review-jump-${w.jumpTo}`}
                          >
                            {w.jumpTo === 'title' && 'Back to edit title'}
                            {w.jumpTo === 'description' && 'Back to edit description'}
                            {w.jumpTo === 'tags' && 'Back to edit tags'}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Repository</dt>
                  <dd className="font-medium text-foreground">{selectedRepoPreview.full_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Title</dt>
                  <dd>{formatReviewValue(title.trim() || null, '— (repo name)')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Description</dt>
                  <dd className="space-y-1 m-0">
                    <p
                      className="text-[11px] text-muted-foreground font-normal normal-case"
                      data-testid="github-import-review-desc-count"
                    >
                      {descCharCount} character{descCharCount === 1 ? '' : 's'}
                      {descCharCount < IMPORT_REVIEW_DESCRIPTION_MIN_CHARS
                        ? ` · recommended ${IMPORT_REVIEW_DESCRIPTION_MIN_CHARS}+`
                        : ' · looks good'}
                    </p>
                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {formatReviewValue(description.trim() || null)}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Tags</dt>
                  <dd>{formatReviewValue(techStackTags)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Stage</dt>
                  <dd>{stages.find((s) => s.value === stage)?.label || stage}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Looking for help (short pitch)</dt>
                  <dd>{formatReviewValue(supportNeeded.trim() || null)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Demo URL (from repo homepage)</dt>
                  <dd>{formatReviewValue(homepage)}</dd>
                </div>
              </dl>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">{error}</div>
          )}

          {showEditorFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-title-input">
                  Project Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="project-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTitle(v);
                    if (mode === 'github' && selectedRepoId) {
                      setDirtyTitle(true);
                      setProvTitle(v.trim() ? 'manual' : null);
                    }
                  }}
                  placeholder={mode === 'github' ? 'Optional title override' : 'What are you building?'}
                  className={fieldClass}
                  data-testid="project-title-input"
                />
                {mode === 'github' && selectedRepoId ? <FieldSourceBadge source={provTitle} /> : null}
                {showGithubHints ? <p className={githubHintClass}>Prefilled from GitHub — you can edit anytime.</p> : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-description-input">
                  Description
                </label>
                <textarea
                  ref={descriptionInputRef}
                  id="project-description-input"
                  value={description}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDescription(v);
                    if (mode === 'github' && selectedRepoId) {
                      setDirtyDescription(true);
                      setProvDescription(v.trim() ? 'manual' : null);
                    }
                  }}
                  placeholder={
                    mode === 'github'
                      ? thinRepoCopy
                        ? 'No GitHub description or README yet — describe the project in your own words.'
                        : 'Add context/story beyond the repo...'
                      : 'Describe your project...'
                  }
                  className={`${fieldClass} px-4 py-3 resize-none`}
                  rows={3}
                  data-testid="project-description-input"
                />
                {mode === 'github' && selectedRepoId ? <FieldSourceBadge source={provDescription} /> : null}
                {showGithubHints ? <p className={githubHintClass}>Detected from repository metadata when available.</p> : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-tech-stack">
                  Tech Stack
                </label>
                <TechStackPicker
                  id="project-tech-stack"
                  value={techStackTags}
                  onChange={(next) => {
                    setTechStackTags(next);
                    if (mode === 'github' && selectedRepoId) {
                      setDirtyTags(true);
                      setProvTags(next.length ? 'manual' : null);
                    }
                  }}
                  triggerTestId="project-techstack-input"
                />
                {mode === 'github' && selectedRepoId ? <FieldSourceBadge source={provTags} /> : null}
                {showGithubHints ? <p className={githubHintClass}>Language, topics, and repo language breakdown can be merged into tags.</p> : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-stage-select">
                  Current Stage
                </label>
                <select
                  id="project-stage-select"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className={fieldClass}
                  data-testid="project-stage-select"
                >
                  {stages.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="project-support-input">
                  Looking for help with
                </label>
                <input
                  id="project-support-input"
                  type="text"
                  value={supportNeeded}
                  onChange={(e) => setSupportNeeded(e.target.value)}
                  placeholder="e.g., UI design, backend development, testing"
                  className={fieldClass}
                  data-testid="project-support-input"
                />
              </div>
            </>
          )}

          <div className="pt-4 space-y-2">
            {mode === 'github' && importStep === 'review' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:flex-1"
                  disabled={loading}
                  onClick={() => setImportStep('edit')}
                  data-testid="github-import-back-to-edit-btn"
                >
                  Back to edit
                </Button>
                <Button
                  type="button"
                  className="sm:flex-1"
                  disabled={loading || !selectedRepoId}
                  onClick={() => performImport()}
                  data-testid="github-import-confirm-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                  Import project
                </Button>
              </div>
            ) : mode === 'github' && importStep === 'edit' ? (
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !selectedRepoId}
                data-testid="github-import-review-step-btn"
              >
                Review import
              </Button>
            ) : (
              <Button type="submit" className="w-full" disabled={loading} data-testid="create-project-submit-btn">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Project
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
