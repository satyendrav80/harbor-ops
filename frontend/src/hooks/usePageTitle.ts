import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/servers': 'Servers',
  '/services': 'Services',
  '/credentials': 'Credentials',
  '/tags': 'Tags',
  '/release-notes': 'Release Notes',
  '/groups': 'Groups',
  '/users': 'Users & Roles',
  '/profile': 'Profile',
  '/login': 'Sign In',
  '/signup': 'Sign Up',
  '/forgot': 'Forgot Password',
};

const APP_NAME = 'Harbor-Ops';

/**
 * Hook to update document title based on current route
 */
export function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const pageName = PAGE_TITLES[path] || 'Harbor-Ops';
    document.title = `${pageName} - ${APP_NAME}`;
  }, [location.pathname]);
}

