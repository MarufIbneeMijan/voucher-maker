import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component guarding authenticated views.
 * If user is not authenticated (no user prop and no valid auth in localStorage),
 * redirects to /login.
 */
export default function ProtectedRoute({ user, children }) {
  const storedAuth = localStorage.getItem('traveledger_auth');
  const isAuthenticated = Boolean(user || storedAuth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
