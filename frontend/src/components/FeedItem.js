import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Zap } from 'lucide-react';
import StageBadge from './StageBadge';
import { formatRelativeTime } from '../lib/utils';

export default function FeedItem({ item, index }) {
  return (
    <div
      className="feed-item bg-transparent border-b border-border py-6 pl-4 border-l-2 border-l-border transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      data-testid="feed-item"
    >
      <div className="flex items-start gap-4">
        <Link to={`/user/${item.project?.user?.id}`}>
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-sm font-medium shrink-0 text-foreground">
            {item.project?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              to={`/user/${item.project?.user?.id}`}
              className="text-foreground font-medium hover:text-primary transition-colors"
            >
              {item.project?.user?.name || 'Anonymous'}
            </Link>
            <span className="text-muted-foreground">posted an update on</span>
            <Link
              to={`/projects/${item.project?.id}`}
              className="text-primary hover:text-primary-hover transition-colors font-medium truncate"
            >
              {item.project?.title}
            </Link>
          </div>

          <div className="mb-3">
            <StageBadge stage={item.project?.stage} showIcon={false} />
          </div>

          <div className="bg-card/80 border border-border p-4 rounded-xl shadow-card mb-3">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-foreground whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="font-mono text-xs">{formatRelativeTime(item.created_at)}</span>
            <Link
              to={`/projects/${item.project?.id}`}
              className="flex items-center gap-1 text-xs hover:text-primary transition-colors"
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
