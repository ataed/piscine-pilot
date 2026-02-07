/**
 * User Header Component
 * Shows logged-in user info and logout button
 */

import { useAuth } from '../lib/auth-context';

export function UserHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return { label: 'Administrateur', color: '#dc2626' };
      case 'manager':
        return { label: 'Gérant', color: '#d97706' };
      case 'cashier':
        return { label: 'Caissier', color: '#3d896c' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="user-header">
      <div className="user-info">
        <div className="user-avatar">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <p className="user-name">{user.full_name}</p>
          <span className="user-role" style={{ backgroundColor: roleBadge.color }}>
            {roleBadge.label}
          </span>
        </div>
      </div>

      <button onClick={logout} className="logout-button">
        🚪 Déconnexion
      </button>

      <style jsx>{`
        .user-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-name {
          margin: 0;
          font-weight: 600;
          color: #333;
          font-size: 15px;
        }

        .user-role {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .logout-button {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          color: #333;
        }

        .logout-button:hover {
          background: #e0e0e0;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .user-header {
            flex-direction: column;
            align-items: stretch;
          }

          .logout-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
