import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Zap } from 'lucide-react';
import StageBadge from './StageBadge';
import { formatRelativeTime } from '../lib/utils';

export default function FeedItem({ item, index }) {
  return (
    <div 
      className="feed-item bg-transparent border-b border-zinc-800 py-6 pl-4 border-l-2 border-l-zinc-800 hover:border-l-amber-500 transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      data-testid="feed-item"
    >
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <Link to={`/user/${item.project?.user?.id}`}>
          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium shrink-0">
            {item.project?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link 
              to={`/user/${item.project?.user?.id}`}
              className="text-white font-medium hover:text-amber-500 transition-colors"
            >
              {item.project?.user?.name || 'Anonymous'}
            </Link>
            <span className="text-zinc-500">posted an update on</span>
            <Link 
              to={`/projects/${item.project?.id}`}
              className="text-amber-500 hover:text-amber-400 transition-colors font-medium truncate"
            >
              {item.project?.title}
            </Link>
          </div>

          {/* Project Stage */}
          <div className="mb-3">
            <StageBadge stage={item.project?.stage} showIcon={false} />
          </div>

          {/* Update Content */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm mb-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-zinc-300 whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-zinc-500">
            <span className="font-mono text-xs">
              {formatRelativeTime(item.created_at)}
            </span>
            <Link 
              to={`/projects/${item.project?.id}`}
              className="flex items-center gap-1 text-xs hover:text-amber-500 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              View project
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
