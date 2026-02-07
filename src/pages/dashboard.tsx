/**
 * Staff Dashboard - Internal View
 * Shows today's revenue, stats, and recent transactions
 */

import { useState, useEffect } from 'react';

interface DashboardStats {
  today_revenue: number;
  today_count: number;
  cash_count: number;
  card_count: number;
  pending_sync: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  customer_name: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get all stats
      const statsRes = await fetch('http://localhost:3000/api/local/transactions/stats');
      const statsData = await statsRes.json();

      // Get recent transactions
      const transRes = await fetch('http://localhost:3000/api/local/transactions?limit=10');
      const transData = await transRes.json();

      if (statsData.success) {
        // Calculate today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = transData.success 
          ? transData.data.transactions.filter((t: Transaction) => 
              t.created_at.startsWith(today)
            )
          : [];

        const todayRevenue = todayTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        const cashCount = todayTransactions.filter((t: Transaction) => t.payment_method === 'cash').length;
        const cardCount = todayTransactions.filter((t: Transaction) => t.payment_method === 'card').length;

        setStats({
          today_revenue: todayRevenue / 100,
          today_count: todayTransactions.length,
          cash_count: cashCount,
          card_count: cardCount,
          pending_sync: statsData.data.pending_sync || 0,
        });

        setRecentTransactions(transData.success ? transData.data.transactions : []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📊 Tableau de Bord</h1>
          <p className="date">{new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        <div className="header-right">
          <a href="/" className="btn-link">🏊 Retour Kiosque</a>
          <a href="/admin" className="btn-link">⚙️ Admin</a>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <p className="stat-label">Recettes du Jour</p>
            <p className="stat-value">{stats?.today_revenue.toFixed(2)} MAD</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <p className="stat-label">Transactions</p>
            <p className="stat-value">{stats?.today_count}</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <p className="stat-label">Espèces</p>
            <p className="stat-value">{stats?.cash_count}</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <p className="stat-label">Cartes</p>
            <p className="stat-value">{stats?.card_count}</p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {stats && stats.pending_sync > 0 && (
        <div className="sync-alert">
          ⚠️ {stats.pending_sync} transaction(s) en attente de synchronisation
        </div>
      )}

      {/* Recent Transactions */}
      <div className="transactions-section">
        <div className="section-header">
          <h2>📋 Dernières Transactions</h2>
          <button onClick={loadDashboardData} className="btn-refresh">
            🔄 Actualiser
          </button>
        </div>

        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Heure</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Client</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="no-data">
                    Aucune transaction aujourd'hui
                  </td>
                </tr>
              ) : (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.created_at).toLocaleTimeString('fr-FR')}</td>
                    <td>
                      <span className={`badge type-${transaction.type}`}>
                        {transaction.type === 'entry' ? '🏊 Entrée' :
                         transaction.type === 'membership' ? '📋 Abonnement' :
                         transaction.type === 'lesson' ? '🎓 Cours' :
                         transaction.type === 'rental' ? '🏖️ Location' : '📦 Autre'}
                      </span>
                    </td>
                    <td className="amount">{(transaction.amount / 100).toFixed(2)} MAD</td>
                    <td>
                      <span className={`badge payment-${transaction.payment_method}`}>
                        {transaction.payment_method === 'cash' ? '💵' :
                         transaction.payment_method === 'card' ? '💳' : '📱'}
                        {' '}
                        {transaction.payment_method}
                      </span>
                    </td>
                    <td>{transaction.customer_name || '-'}</td>
                    <td>
                      <span className="badge status-success">✅ OK</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #f5f7fa;
          padding: 30px;
        }

        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f5f7fa;
        }

        .loading-spinner {
          font-size: 48px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .dashboard-header {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          margin: 0;
          color: #333;
          font-size: 28px;
        }

        .date {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }

        .header-right {
          display: flex;
          gap: 15px;
        }

        .btn-link {
          background: #f0f0f0;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          color: #333;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-link:hover {
          background: #e0e0e0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .stat-icon {
          font-size: 48px;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .stat-card.primary .stat-icon {
          background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
        }

        .stat-card.success .stat-icon {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        .stat-card.info .stat-icon {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-card.warning .stat-icon {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          margin: 0;
          color: #666;
          font-size: 14px;
          font-weight: 500;
        }

        .stat-value {
          margin: 5px 0 0 0;
          font-size: 32px;
          font-weight: 700;
          color: #333;
        }

        .sync-alert {
          background: #fff3cd;
          border: 2px solid #ffc107;
          color: #856404;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 30px;
          font-weight: 600;
          text-align: center;
        }

        .transactions-section {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .section-header h2 {
          margin: 0;
          color: #333;
          font-size: 24px;
        }

        .btn-refresh {
          background: #3d896c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-refresh:hover {
          background: #2d6d56;
        }

        .transactions-table {
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
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
        }

        td {
          padding: 15px;
          border-bottom: 1px solid #f0f0f0;
          color: #333;
        }

        tbody tr:hover {
          background: #f8f9fa;
        }

        .amount {
          font-weight: 700;
          font-size: 16px;
          color: #3d896c;
        }

        .badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.type-entry {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge.type-membership {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .badge.type-lesson {
          background: #fff3e0;
          color: #f57c00;
        }

        .badge.type-rental {
          background: #e8f5e9;
          color: #388e3c;
        }

        .badge.payment-cash {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .badge.payment-card {
          background: #e3f2fd;
          color: #1565c0;
        }

        .badge.payment-transfer {
          background: #fce4ec;
          color: #c2185b;
        }

        .badge.status-success {
          background: #d4edda;
          color: #155724;
        }

        .no-data {
          text-align: center;
          color: #999;
          padding: 40px !important;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .header-right {
            flex-direction: column;
            width: 100%;
          }

          .btn-link {
            width: 100%;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .transactions-table {
            font-size: 14px;
          }

          th, td {
            padding: 10px 5px;
          }
        }
      `}</style>
    </div>
  );
}
