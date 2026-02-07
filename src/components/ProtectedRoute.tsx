/**
 * Protected Route Component
 * Wraps pages that require authentication
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'cashier' | 'manager' | 'admin';
}

export function ProtectedRoute({ children, requireRole = 'cashier' }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requireRole && !hasRole(requireRole)) {
        router.push('/unauthorized');
      }
    }
  }, [isAuthenticated, loading, requireRole, hasRole, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Vérification de la session...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f5f7fa;
          }

          .loading-spinner {
            font-size: 64px;
            animation: spin 2s linear infinite;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          p {
            margin-top: 20px;
            color: #666;
            font-size: 18px;
          }
        `}</style>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || (requireRole && !hasRole(requireRole))) {
    return null;
  }

  return <>{children}</>;
}
