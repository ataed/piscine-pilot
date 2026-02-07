/**
 * Admin Panel - Manager View
 * Complete transaction management, search, filter, and export
 */

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  synced_status: string;
}

interface Stats {
  total_transactions: number;
  total_revenue_mad: number;
  pending_sync: number;
  synced: number;
  days_active: number;
}

export default function Admin() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all transactions
      const transRes = await fetch('http://localhost:3000/api/local/transactions?limit=100');
      const transData = await transRes.json();

      // Get stats
      const statsRes = await fetch('http://localhost:3000/api/local/transactions/stats');
      const statsData = await statsRes.json();

      if (transData.success) {
        setTransactions(transData.data.transactions);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = !searchTerm || 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesPayment = filterPayment === 'all' || t.payment_method === filterPayment;

    return matchesSearch && matchesType && matchesPayment;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'ID', 'Type', 'Montant (MAD)', 'Paiement', 'Client', 'Notes', 'Statut'];
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleString('fr-FR'),
      t.id,
      t.type,
      (t.amount / 100).toFixed(2),
      t.payment_method,
      t.customer_name || '',
      t.notes || '',
      t.synced_status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Chargement du panneau d'administration...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <h1>⚙️ Panneau d'Administration</h1>
          <p className="subtitle">Gestion complète du système</p>
        </div>
        <div className="header-right">
          <a href="/dashboard" className="btn-link">📊 Dashboard</a>
          <a href="/" className="btn-link">🏊 Kiosque</a>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-box">
          <div className="stat-icon">📊</div>
          <div>
            <p className="stat-label">Total Transactions</p>
            <p className="stat-number">{stats?.total_transactions || 0}</p>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">💰</div>
          <div>
            <p className="stat-label">Revenu Total</p>
            <p className="stat-number">{stats?.total_revenue_mad.toFixed(2) || '0.00'} MAD</p>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">☁️</div>
          <div>
            <p className="stat-label">Synchronisés</p>
            <p className="stat-number">{stats?.synced || 0}</p>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">⏳</div>
          <div>
            <p className="stat-label">En Attente</p>
            <p className="stat-number">{stats?.pending_sync || 0}</p>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Rechercher par ID ou nom client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les types</option>
            <option value="entry">Entrée</option>
            <option value="membership">Abonnement</option>
            <option value="lesson">Cours</option>
            <option value="rental">Location</option>
            <option value="other">Autre</option>
          </select>

          <select 
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous les paiements</option>
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
            <option value="transfer">Virement</option>
          </select>

          <button onClick={exportToCSV} className="btn-export">
            📥 Exporter CSV
          </button>

          <button onClick={loadData} className="btn-refresh">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <p>
          <strong>{filteredTransactions.length}</strong> transaction(s) trouvée(s)
          {filterType !== 'all' || filterPayment !== 'all' || searchTerm ? ' (filtrées)' : ''}
        </p>
      </div>

      {/* Transactions Table */}
      <div className="transactions-section">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>ID</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Paiement</th>
                <th>Client</th>
                <th>Notes</th>
                <th>Synchronisation</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="date-cell">
                      <div>{new Date(transaction.created_at).toLocaleDateString('fr-FR')}</div>
                      <div className="time">{new Date(transaction.created_at).toLocaleTimeString('fr-FR')}</div>
                    </td>
                    <td className="id-cell">
                      <code>{transaction.id.slice(0, 8)}...</code>
                    </td>
                    <td>
                      <span className={`badge type-${transaction.type}`}>
                        {transaction.type === 'entry' ? '🏊 Entrée' :
                         transaction.type === 'membership' ? '📋 Abonnement' :
                         transaction.type === 'lesson' ? '🎓 Cours' :
                         transaction.type === 'rental' ? '🏖️ Location' : '📦 Autre'}
                      </span>
                    </td>
                    <td className="amount-cell">
                      {(transaction.amount / 100).toFixed(2)} MAD
                    </td>
                    <td>
                      <span className={`badge payment-${transaction.payment_method}`}>
                        {transaction.payment_method === 'cash' ? '💵 Espèces' :
                         transaction.payment_method === 'card' ? '💳 Carte' : '📱 Virement'}
                      </span>
                    </td>
                    <td>{transaction.customer_name || '-'}</td>
                    <td className="notes-cell">{transaction.notes || '-'}</td>
                    <td>
                      <span className={`badge sync-${transaction.synced_status}`}>
                        {transaction.synced_status === 'synced' ? '✅ Synchronisé' :
                         transaction.synced_status === 'pending' ? '⏳ En attente' :
                         '❌ Échec'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background: #f0f2f5;
          padding: 30px;
        }

        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f2f5;
        }

        .loading-spinner {
          font-size: 48px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .admin-header {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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

        .header-right {
          display: flex;
          gap: 12px;
        }

        .btn-link {
          background: #f5f5f5;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          color: #333;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-link:hover {
          background: #e5e5e5;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }

        .stat-box {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 36px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
          border-radius: 10px;
        }

        .stat-label {
          margin: 0;
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .stat-number {
          margin: 5px 0 0 0;
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .controls-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          margin-bottom: 20px;
        }

        .search-box {
          margin-bottom: 15px;
        }

        .search-input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e5e5e5;
          border-radius: 8px;
          font-size: 15px;
          transition: border 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3d896c;
        }

        .filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 12px 15px;
          border: 2px solid #e5e5e5;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border 0.3s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3d896c;
        }

        .btn-export,
        .btn-refresh {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-export {
          background: #d4982a;
          color: white;
        }

        .btn-export:hover {
          background: #b87422;
        }

        .btn-refresh {
          background: #3d896c;
          color: white;
        }

        .btn-refresh:hover {
          background: #2d6d56;
        }

        .results-info {
          background: #fff;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .results-info p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .transactions-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
          white-space: nowrap;
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

        .date-cell {
          white-space: nowrap;
        }

        .date-cell .time {
          font-size: 12px;
          color: #999;
          margin-top: 3px;
        }

        .id-cell code {
          background: #f5f5f5;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .amount-cell {
          font-weight: 700;
          color: #3d896c;
          font-size: 15px;
        }

        .notes-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .badge {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge.type-entry { background: #dbeafe; color: #1e40af; }
        .badge.type-membership { background: #f3e8ff; color: #6b21a8; }
        .badge.type-lesson { background: #fed7aa; color: #c2410c; }
        .badge.type-rental { background: #d1fae5; color: #065f46; }
        .badge.type-other { background: #e5e7eb; color: #374151; }

        .badge.payment-cash { background: #d1fae5; color: #065f46; }
        .badge.payment-card { background: #dbeafe; color: #1e40af; }
        .badge.payment-transfer { background: #fce7f3; color: #9f1239; }

        .badge.sync-synced { background: #d1fae5; color: #065f46; }
        .badge.sync-pending { background: #fef3c7; color: #92400e; }
        .badge.sync-failed { background: #fee2e2; color: #991b1b; }

        .no-data {
          text-align: center;
          color: #999;
          padding: 60px !important;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .admin-header {
            flex-direction: column;
            gap: 15px;
          }

          .header-right {
            flex-direction: column;
            width: 100%;
          }

          .btn-link {
            width: 100%;
            text-align: center;
          }

          .stats-overview {
            grid-template-columns: 1fr;
          }

          .filters {
            flex-direction: column;
          }

          .filter-select,
          .btn-export,
          .btn-refresh {
            width: 100%;
          }

          .table-container {
            font-size: 12px;
          }

          th, td {
            padding: 10px 6px;
          }
        }
      `}</style>
    </div>
  );
}
