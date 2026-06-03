import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import PersonaGalleryPage from '@/pages/PersonaGalleryPage';
import PersonaBuilderTextPage from '@/pages/PersonaBuilderTextPage';
import PersonaBuilderFilePage from '@/pages/PersonaBuilderFilePage';
import PersonaPreviewPage from '@/pages/PersonaPreviewPage';
import SessionPage from '@/pages/SessionPage';
import SessionReportPage from '@/pages/SessionReportPage';
import SessionHistoryPage from '@/pages/SessionHistoryPage';
import SettingsPage from '@/pages/SettingsPage';
import AnalysisPage from '@/pages/AnalysisPage';

function App() {
  return (
    <div className="App dark">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout><DashboardPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/personas"
              element={
                <ProtectedRoute>
                  <AppLayout><PersonaGalleryPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/personas/new/text"
              element={
                <ProtectedRoute>
                  <AppLayout><PersonaBuilderTextPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/personas/new/file"
              element={
                <ProtectedRoute>
                  <AppLayout><PersonaBuilderFilePage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/personas/new/preview"
              element={
                <ProtectedRoute>
                  <AppLayout><PersonaPreviewPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/session"
              element={
                <ProtectedRoute>
                  <SessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session/:id/report"
              element={
                <ProtectedRoute>
                  <AppLayout><SessionReportPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AppLayout><SessionHistoryPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout><SettingsPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <AppLayout><AnalysisPage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
