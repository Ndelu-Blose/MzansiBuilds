import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { collaborationAPI } from '../lib/api';
import { Button } from '@/components/ui/button';

export default function CollaborationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await collaborationAPI.getMyRequests();
      setRequests((res.data.items || []).filter((r) => r.status === 'pending'));
    } catch (_err) {
      setError('Unable to load collaboration requests right now.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateRequest = async (id, status) => {
    setActingId(id);
    try {
      await collaborationAPI.update(id, { status });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (_err) {
      setError('Could not update request. Please try again.');
    } finally {
      setActingId('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collaboration Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Review incoming requests from builders who want to join your projects.</p>
          </div>
          <Button variant="outline" onClick={loadRequests}>Refresh</Button>
        </div>

        {loading ? (
          <div className="min-h-[35vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-5">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">No pending requests</h2>
            <p className="text-sm text-muted-foreground mt-1">New collaboration requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-foreground font-medium">{request.requester?.name || 'Unknown builder'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  wants to collaborate on <span className="text-foreground font-medium">{request.project_title || 'your project'}</span>
                </p>
                {request.message ? (
                  <p className="text-sm text-muted-foreground mt-2 border-l-2 border-border pl-3">{request.message}</p>
                ) : null}
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateRequest(request.id, 'accepted')}
                    disabled={actingId === request.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequest(request.id, 'rejected')}
                    disabled={actingId === request.id}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
