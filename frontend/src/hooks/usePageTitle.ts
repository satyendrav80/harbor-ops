import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/sprints': 'Sprints',
  '/servers': 'Servers',
  '/services': 'Services',
  '/credentials': 'Credentials',
  '/domains': 'Domains',
  '/tags': 'Tags',
  '/release-notes': 'Release Notes',
  '/groups': 'Groups',
  '/users': 'Users & Roles',
  '/profile': 'Profile',
  '/login': 'Sign In',
  '/signup': 'Sign Up',
  '/forgot': 'Forgot Password',
  '/resource-map': 'Resource Map',
};

const APP_NAME = 'Harbor-Ops';

/**
 * Hook to update document title based on current route.
 * Optionally pass a titleOverride for pages that want a custom label.
 */
export function usePageTitle(titleOverride?: string) {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const pageName = titleOverride || PAGE_TITLES[path] || 'Harbor-Ops';
    document.title = `${pageName} - ${APP_NAME}`;
  }, [location.pathname, titleOverride]);
}

