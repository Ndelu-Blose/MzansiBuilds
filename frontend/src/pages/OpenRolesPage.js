import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { discoveryAPI } from '../lib/api';

export default function OpenRolesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stage: '', health_status: '', tech: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await discoveryAPI.getOpenRoles(filters);
        setItems(res.data.items || []);
      } catch (_err) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Open Roles Board</h1>
          <Link to="/explore" className="text-primary text-sm hover:underline">Back to Explore</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <input className="rounded-md border border-input px-3 py-2 bg-background" placeholder="Tech" value={filters.tech} onChange={(e) => setFilters((p) => ({ ...p, tech: e.target.value }))} />
          <select className="rounded-md border border-input px-3 py-2 bg-background" value={filters.stage} onChange={(e) => setFilters((p) => ({ ...p, stage: e.target.value }))}>
            <option value="">All stages</option><option value="idea">Idea</option><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="testing">Testing</option><option value="completed">Completed</option>
          </select>
          <select className="rounded-md border border-input px-3 py-2 bg-background" value={filters.health_status} onChange={(e) => setFilters((p) => ({ ...p, health_status: e.target.value }))}>
            <option value="">All health</option><option value="active">Active</option><option value="quiet">Quiet</option><option value="stalled">Stalled</option><option value="completed">Completed</option>
          </select>
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
          items.length === 0 ? <div className="border rounded-xl p-8 text-sm text-muted-foreground bg-card">No open roles match these filters.</div> : (
            <div className="space-y-4">
              {items.map((item) => (
                <Link to={`/projects/${item.id}`} key={item.id} className="block border rounded-xl p-4 bg-card hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <span className="text-xs text-muted-foreground">{item.health_status || 'unknown'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  <p className="text-xs mt-2 text-foreground">Roles: {(item.roles_needed || []).join(', ') || 'Not specified'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Owner trust: {item.owner_score_band || 'Unrated'} ({item.owner_score || 0})</p>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
