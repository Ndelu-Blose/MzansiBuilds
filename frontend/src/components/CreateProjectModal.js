import React, { useState } from 'react';
import { projectsAPI } from '../lib/api';
import { X, Loader2 } from 'lucide-react';

const stages = [
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' }
];

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
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await projectsAPI.create({
        title: title.trim(),
        description: description.trim() || null,
        tech_stack: techStackArray.length > 0 ? techStackArray : null,
        stage,
        support_needed: supportNeeded.trim() || null
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-zinc-900 border border-zinc-800 rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto"
        data-testid="create-project-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Project Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you building?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="project-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              rows={3}
              data-testid="project-description-input"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Tech Stack
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="React, Node.js, PostgreSQL (comma separated)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="project-techstack-input"
            />
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Current Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="project-stage-select"
            >
              {stages.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Support Needed */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Looking for help with
            </label>
            <input
              type="text"
              value={supportNeeded}
              onChange={(e) => setSupportNeeded(e.target.value)}
              placeholder="e.g., UI design, backend development, testing"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="project-support-input"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="create-project-submit-btn"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
