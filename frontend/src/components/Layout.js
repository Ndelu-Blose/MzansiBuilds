import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import AppSidebar from './AppSidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="app" />
      <div className="lg:pl-72">
        <AppSidebar />
        <main className="min-h-[calc(100vh-4rem)]">{children || <Outlet />}</main>
      </div>
    </div>
  );
}
