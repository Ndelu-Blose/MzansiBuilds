import React, { useState } from 'react';
import { projectsAPI } from '../lib/api';
import { X, Loader2 } from 'lucide-react';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState('');
  const [stage, setStage] = useState('idea');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
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

      const response = await projectsAPI.create({
        title: title.trim(),
        description: description.trim() || null,
        tech_stack: techStackArray.length > 0 ? techStackArray : null,
        stage,
        support_needed: supportNeeded.trim() || null,
      });

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
          <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
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
              placeholder="What are you building?"
              className={fieldClass}
              data-testid="project-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
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
            <Button type="submit" className="w-full" disabled={loading} data-testid="create-project-submit-btn">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
