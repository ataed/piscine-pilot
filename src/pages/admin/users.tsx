/**
 * User Management Page (Admin Only)
 * View, create, and manage staff users
 */

import { useState, useEffect } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { UserHeader } from "../../components/UserHeader";
import { useAuth } from "../../lib/auth-context";
import { CreateUserModal } from "../../components/CreateUserModal";
import { UserDetailsModal } from "../../components/UserDetailsModal";
interface User {
  id: string;
  username: string;
  role: "cashier" | "manager" | "admin";
  full_name: string;
  location_id: string;
  last_login_at?: string;
  created_at: string;
}
// Helper to safely format dates
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "Jamais";
  try {
    // Handle both "YYYY-MM-DD HH:MM:SS" and ISO formats
    const date = new Date(
      dateString.replace(" ", "T") + (dateString.includes("Z") ? "" : "Z"),
    );
    if (isNaN(date.getTime())) return "Jamais";
    return date.toLocaleDateString("fr-FR", {
      timeZone: "Africa/Casablanca", // ← Morocco timezone

      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Jamais";
  }
};

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { sessionId } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:3000/api/local/auth/users",
        {
          headers: {
            "x-session-id": sessionId || "",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrateur", color: "#dc2626", bg: "#fef2f2" };
      case "manager":
        return { label: "Gérant", color: "#d97706", bg: "#fffbeb" };
      case "cashier":
        return { label: "Caissier", color: "#3d896c", bg: "#f0fdf4" };
      default:
        return { label: role, color: "#666", bg: "#f5f5f5" };
    }
  };

  return (
    <ProtectedRoute requireRole="admin">
      <div className="users-container">
        {/* Header */}
        <header className="users-header">
          <div className="header-left">
            <h1>👥 Gestion des Utilisateurs</h1>
            <p className="subtitle">Gérer les comptes du personnel</p>
          </div>
          <UserHeader />
        </header>

        {/* Navigation */}
        <div className="nav-links">
          <a href="/admin" className="nav-link">
            ← Retour Admin
          </a>
          <a href="/dashboard" className="nav-link">
            📊 Dashboard
          </a>
          <a href="/" className="nav-link">
            🏊 Kiosque
          </a>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total Utilisateurs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {users.filter((u) => u.role === "admin").length}
            </div>
            <div className="stat-label">Administrateurs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {users.filter((u) => u.role === "manager").length}
            </div>
            <div className="stat-label">Gérants</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {users.filter((u) => u.role === "cashier").length}
            </div>
            <div className="stat-label">Caissiers</div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            ➕ Créer Utilisateur
          </button>

          <input
            type="text"
            placeholder="🔍 Rechercher par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <button onClick={loadUsers} className="btn-refresh">
            🔄 Actualiser
          </button>
        </div>

        {/* Users Table */}
        <div className="users-section">
          {loading ? (
            <div className="loading">⏳ Chargement...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nom d'utilisateur</th>
                    <th>Nom complet</th>
                    <th>Rôle</th>
                    <th>Dernière connexion</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="no-data">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const badge = getRoleBadge(user.role);
                      return (
                        <tr key={user.id}>
                          <td>
                            <strong>{user.username}</strong>
                          </td>
                          <td>{user.full_name}</td>
                          <td>
                            <span
                              className="role-badge"
                              style={{
                                color: badge.color,
                                backgroundColor: badge.bg,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            {user.last_login_at
                              ? formatDate(user.last_login_at)
                              : "Jamais"}
                          </td>
                          <td>{formatDate(user.created_at)}</td>
                          <td>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="btn-action"
                              title="Voir détails"
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadUsers();
            }}
            sessionId={sessionId || ""}
          />
        )}

        {/* User Details Modal */}
        {selectedUser && (
          <UserDetailsModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={loadUsers}
            sessionId={sessionId || ""}
          />
        )}

        <style jsx>{`
          .users-container {
            min-height: 100vh;
            background: #f0f2f5;
            padding: 30px;
          }

          .users-header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-left h1 {
            margin: 0;
            color: #1a1a1a;
            font-size: 28px;
          }

          .subtitle {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
          }

          .nav-links {
            display: flex;
            gap: 12px;
            margin-bottom: 25px;
          }

          .nav-link {
            padding: 10px 20px;
            background: white;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .nav-link:hover {
            background: #f5f5f5;
            transform: translateY(-2px);
          }

          .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
          }

          .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            text-align: center;
          }

          .stat-number {
            font-size: 36px;
            font-weight: 700;
            color: #3d896c;
            margin-bottom: 8px;
          }

          .stat-label {
            font-size: 14px;
            color: #666;
          }

          .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 25px;
            align-items: center;
          }

          .btn-primary {
            padding: 12px 24px;
            background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(61, 137, 108, 0.3);
          }

          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(61, 137, 108, 0.4);
          }

          .search-input {
            flex: 1;
            padding: 12px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            transition: border 0.3s;
          }

          .search-input:focus {
            outline: none;
            border-color: #3d896c;
          }

          .btn-refresh {
            padding: 12px 24px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          }

          .btn-refresh:hover {
            border-color: #3d896c;
            background: #f0fdf4;
          }

          .users-section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .loading {
            text-align: center;
            padding: 60px;
            font-size: 24px;
            color: #666;
          }

          .table-container {
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead {
            background: #f8f9fa;
          }

          th {
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            font-size: 13px;
            text-transform: uppercase;
          }

          td {
            padding: 15px 12px;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
            font-size: 14px;
          }

          tbody tr:hover {
            background: #f8f9fa;
          }

          .role-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }

          .btn-action {
            padding: 8px 12px;
            background: #f0f0f0;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            margin: 0 4px;
          }

          .btn-action:hover {
            background: #3d896c;
            transform: scale(1.1);
          }

          .no-data {
            text-align: center;
            padding: 60px !important;
            color: #999;
            font-style: italic;
          }

          @media (max-width: 768px) {
            .users-header {
              flex-direction: column;
              gap: 20px;
            }

            .nav-links {
              flex-direction: column;
            }

            .controls {
              flex-direction: column;
              align-items: stretch;
            }

            .stats-row {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
