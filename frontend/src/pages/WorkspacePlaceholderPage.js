import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';

export default function WorkspacePlaceholderPage({ title, description }) {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <div className="mt-6 flex items-center gap-2">
            <Button asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/explore">Explore Projects</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
