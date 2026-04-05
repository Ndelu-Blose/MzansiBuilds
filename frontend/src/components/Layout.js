import React from 'react';
import SiteHeader from './SiteHeader';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="app" />
      <main>{children}</main>
    </div>
  );
}
