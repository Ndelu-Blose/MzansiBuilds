import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import EmailConfirmedPage from './pages/EmailConfirmedPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import FeedPage from './pages/FeedPage';
import CelebrationPage from './pages/CelebrationPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import UserProfilePage from './pages/UserProfilePage';
import OpenRolesPage from './pages/OpenRolesPage';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/celebration" element={<CelebrationPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/open-roles" element={<OpenRolesPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/user/:id" element={<UserProfilePage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
