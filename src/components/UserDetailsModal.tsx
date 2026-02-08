/**
 * User Details Modal (FIXED VERSION)
 * - Proper date formatting (handles invalid dates)
 * - Fixed modal centering (no scroll needed)
 */

import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  role: "cashier" | "manager" | "admin";
  full_name: string;
  location_id: string;
  last_login_at?: string;
  created_at: string;
}

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
  sessionId: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  customer_name: string | null;
  created_at: string;
}

export function UserDetailsModal({
  user,
  onClose,
  onUpdate,
  sessionId,
}: UserDetailsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_transactions: 0,
    total_revenue: 0,
  });

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

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleString("fr-FR", {
        timeZone: "Africa/Casablanca",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  useEffect(() => {
    loadUserTransactions();
  }, [user.id]);

  async function loadUserTransactions() {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:3000/api/local/transactions?limit=100",
        {
          headers: {
            "x-session-id": sessionId,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        const userTransactions = data.data.transactions.filter(
          (t: any) => t.user_id === user.id,
        );

        setTransactions(userTransactions);

        const totalRevenue = userTransactions.reduce(
          (sum: number, t: Transaction) => sum + t.amount,
          0,
        );

        setStats({
          total_transactions: userTransactions.length,
          total_revenue: totalRevenue / 100,
        });
      }
    } catch (error) {
      console.error("Failed to load user transactions:", error);
    } finally {
      setLoading(false);
    }
  }

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

  const badge = getRoleBadge(user.role);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Détails de l'Utilisateur</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="user-info-card">
            <div className="user-avatar">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h3>{user.full_name}</h3>
              <p className="username">@{user.username}</p>
              <span
                className="role-badge"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.label}
              </span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">🎫</div>
              <div className="stat-value">{stats.total_transactions}</div>
              <div className="stat-label">Transactions</div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">💰</div>
              <div className="stat-value">
                {stats.total_revenue.toFixed(2)} MAD
              </div>
              <div className="stat-label">Revenu Total</div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">📅</div>
              <div className="stat-value">{formatDate(user.last_login_at)}</div>
              <div className="stat-label">Dernière Connexion</div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">🕐</div>
              <div className="stat-value">{formatDate(user.created_at)}</div>
              <div className="stat-label">Créé le</div>
            </div>
          </div>

          <div className="transactions-section">
            <h4>📋 Transactions Créées</h4>

            {loading ? (
              <div className="loading">⏳ Chargement...</div>
            ) : transactions.length === 0 ? (
              <div className="no-data">
                Aucune transaction créée par cet utilisateur
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-info">
                      <span className="transaction-type">
                        {transaction.type === "entry"
                          ? "🏊 Entrée"
                          : transaction.type === "membership"
                            ? "📋 Abonnement"
                            : transaction.type === "lesson"
                              ? "🎓 Cours"
                              : transaction.type === "rental"
                                ? "🏖️ Location"
                                : "📦 Autre"}
                      </span>
                      <span className="transaction-date">
                        {formatDateTime(transaction.created_at)}
                      </span>
                    </div>
                    <div className="transaction-amount">
                      {(transaction.amount / 100).toFixed(2)} MAD
                    </div>
                  </div>
                ))}

                {transactions.length > 10 && (
                  <div className="more-transactions">
                    + {transactions.length - 10} autres transactions...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-close">
            Fermer
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
            overflow-y: auto;
          }

          .modal-content.large {
            background: white;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            margin: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 25px 30px;
            border-bottom: 2px solid #f0f0f0;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            transition: all 0.3s;
          }

          .close-btn:hover {
            background: #f0f0f0;
            color: #333;
          }

          .modal-body {
            padding: 30px;
          }

          .user-info-card {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 25px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-radius: 12px;
            margin-bottom: 25px;
          }

          .user-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(61, 137, 108, 0.3);
            flex-shrink: 0;
          }

          .user-details h3 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: #333;
          }

          .username {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 14px;
          }

          .role-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }

          .stat-box {
            background: white;
            border: 2px solid #f0f0f0;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }

          .stat-icon {
            font-size: 32px;
            margin-bottom: 10px;
          }

          .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            margin-bottom: 5px;
            word-break: break-word;
          }

          .stat-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .transactions-section {
            margin-top: 25px;
          }

          .transactions-section h4 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #333;
          }

          .loading {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 18px;
          }

          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
            font-style: italic;
            background: #f8f9fa;
            border-radius: 10px;
          }

          .transactions-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .transaction-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            transition: all 0.3s;
          }

          .transaction-item:hover {
            background: #f0f0f0;
            transform: translateX(5px);
          }

          .transaction-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex: 1;
            min-width: 0;
          }

          .transaction-type {
            font-weight: 600;
            font-size: 14px;
            color: #333;
          }

          .transaction-date {
            font-size: 12px;
            color: #666;
          }

          .transaction-amount {
            font-size: 18px;
            font-weight: 700;
            color: #3d896c;
            flex-shrink: 0;
            margin-left: 15px;
          }

          .more-transactions {
            text-align: center;
            padding: 15px;
            color: #666;
            font-style: italic;
            font-size: 14px;
          }

          .modal-footer {
            padding: 20px 30px;
            border-top: 2px solid #f0f0f0;
            display: flex;
            justify-content: flex-end;
            position: sticky;
            bottom: 0;
            background: white;
          }

          .btn-close {
            padding: 12px 30px;
            background: #f0f0f0;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          }

          .btn-close:hover {
            background: #e0e0e0;
          }

          @media (max-width: 600px) {
            .user-info-card {
              flex-direction: column;
              text-align: center;
            }

            .stats-grid {
              grid-template-columns: 1fr 1fr;
            }

            .stat-value {
              font-size: 16px;
            }

            .transaction-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }

            .transaction-amount {
              margin-left: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
