import { Route, Routes, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { SignupPage } from './features/auth/pages/SignupPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { UsersRolesPage } from './features/users/pages/UsersRolesPage';
import { GroupsPage } from './features/groups/pages/GroupsPage';
import { ServersPage } from './features/servers/pages/ServersPage';
import { ServicesPage } from './features/services/pages/ServicesPage';
import { CredentialsPage } from './features/credentials/pages/CredentialsPage';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/common/RequireAuth';
import { RequirePermission } from './components/common/RequirePermission';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot" element={<ForgotPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequirePermission permission="dashboard:view">
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <RequirePermission permission="users:view">
              <AppLayout>
                <UsersRolesPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/servers"
        element={
          <RequireAuth>
            <RequirePermission permission="servers:view">
              <AppLayout>
                <ServersPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/services"
        element={
          <RequireAuth>
            <RequirePermission permission="services:view">
              <AppLayout>
                <ServicesPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/credentials"
        element={
          <RequireAuth>
            <RequirePermission permission="credentials:view">
              <AppLayout>
                <CredentialsPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/tags"
        element={
          <RequireAuth>
            <RequirePermission permission="tags:view">
              <AppLayout>
                <div className="p-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Tags</h1>
                  <p className="text-gray-600 dark:text-gray-400">Tags page coming soon...</p>
                </div>
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/release-notes"
        element={
          <RequireAuth>
            <RequirePermission permission="release-notes:view">
              <AppLayout>
                <div className="p-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Release Notes</h1>
                  <p className="text-gray-600 dark:text-gray-400">Release Notes page coming soon...</p>
                </div>
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route
        path="/groups"
        element={
          <RequireAuth>
            <RequirePermission permission="groups:view">
              <AppLayout>
                <GroupsPage />
              </AppLayout>
            </RequirePermission>
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}


