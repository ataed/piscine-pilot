/**
 * Kiosk Interface - Customer-Facing
 * Touch-friendly interface for creating transactions
 */
import { ProtectedRoute } from "../components/ProtectedRoute";
import { UserHeader } from "../components/UserHeader";
import { useAuth } from "../lib/auth-context";
import { useState } from "react";
import { ReceiptPreview } from "../components/ReceiptPreview";

const QUICK_AMOUNTS = [
  { label: "Entrée Enfant", amount: 20, type: "entry" },
  { label: "Entrée Adulte", amount: 30, type: "entry" },
  { label: "Abonnement Mensuel", amount: 200, type: "membership" },
  { label: "Cours de Natation", amount: 150, type: "lesson" },
];

const TRANSACTION_TYPES = [
  { value: "entry", label: "🏊 Entrée" },
  { value: "membership", label: "📋 Abonnement" },
  { value: "lesson", label: "🎓 Cours" },
  { value: "rental", label: "🏖️ Location" },
  { value: "other", label: "📦 Autre" },
];

export default function Kiosk() {
  const { user, sessionId } = useAuth();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("entry");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const handleQuickAmount = (quickAmount: (typeof QUICK_AMOUNTS)[0]) => {
    setAmount(quickAmount.amount.toString());
    setType(quickAmount.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:3000/api/local/transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId || "",
          },
          body: JSON.stringify({
            amount: parseInt(amount) * 100,
            type,
            payment_method: paymentMethod,
            customer_name: customerName || undefined,
            notes: notes || undefined,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setLastTransaction(data.data.transaction);
        setShowReceipt(true);
        setMessage("✅ Transaction créée avec succès!");

        // Reset form
        setTimeout(() => {
          setAmount("");
          setCustomerName("");
          setNotes("");
          setMessage("");
        }, 3000);
      } else {
        setMessage(`❌ Erreur: ${data.error.message}`);
      }
    } catch (error) {
      setMessage("❌ Échec de la création de la transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAmount("");
    setCustomerName("");
    setNotes("");
    setMessage("");
  };

  return (
    <ProtectedRoute requireRole="cashier">
      <div className="kiosk-container">
        {/* Header */}
        <header className="kiosk-header">
          <div className="club-logo">
            {/* <div className="logo-circle">🏊</div> */}
            <div className="logo-circle">
              <img
                src="/logo.webp"
                alt="Club Tangerois"
                // style={{ width: "50px", height: "50px", objectFit: "contain" }}
                className="logo-image"
              />
            </div>
            <div className="club-info">
              <h1>CLUB TANGEROIS</h1>
              <p>Piscine Municipale</p>
            </div>
          </div>
          <div className="staff-link">
            <a href="/dashboard">👤 Espace Personnel</a>
          </div>
          <UserHeader />
        </header>

        <main className="kiosk-main">
          <h2 className="welcome-text">Bienvenue! Choisissez votre service</h2>

          {/* Quick Amount Buttons */}
          <div className="quick-amounts">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick.label}
                onClick={() => handleQuickAmount(quick)}
                className={`quick-btn ${amount === quick.amount.toString() && type === quick.type ? "active" : ""}`}
                type="button"
              >
                <span className="quick-label">{quick.label}</span>
                <span className="quick-price">{quick.amount} MAD</span>
              </button>
            ))}
          </div>

          <div className="divider">
            <span>ou personnalisé</span>
          </div>

          {/* Custom Transaction Form */}
          <form onSubmit={handleSubmit} className="transaction-form">
            {/* Amount */}
            <div className="form-group">
              <label>Montant (MAD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="form-input amount-input"
                placeholder="0"
                min="1"
              />
            </div>

            {/* Type */}
            <div className="form-group">
              <label>Type de service</label>
              <div className="type-buttons">
                {TRANSACTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`type-btn ${type === t.value ? "active" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>Mode de paiement</label>
              <div className="payment-buttons">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`payment-btn ${paymentMethod === "cash" ? "active" : ""}`}
                >
                  💵 Espèces
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`payment-btn ${paymentMethod === "card" ? "active" : ""}`}
                >
                  💳 Carte
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("transfer")}
                  className={`payment-btn ${paymentMethod === "transfer" ? "active" : ""}`}
                >
                  📱 Virement
                </button>
              </div>
            </div>

            {/* Optional Fields */}
            <details className="optional-fields">
              <summary>📝 Informations optionnelles</summary>
              <div className="optional-content">
                <div className="form-group">
                  <label>Nom du client</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="form-input"
                    placeholder="Facultatif"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="form-input"
                    placeholder="Remarques..."
                  />
                </div>
              </div>
            </details>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-secondary"
                disabled={loading}
              >
                🔄 Réinitialiser
              </button>
              <button
                type="submit"
                disabled={loading || !amount}
                className="btn btn-primary"
              >
                {loading ? "⏳ Traitement..." : "✅ Confirmer"}
              </button>
            </div>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`message ${message.startsWith("✅") ? "success" : "error"}`}
            >
              {message}
            </div>
          )}
        </main>

        {/* Receipt Preview */}
        {showReceipt && lastTransaction && (
          <ReceiptPreview
            transaction={lastTransaction}
            onClose={() => setShowReceipt(false)}
          />
        )}

        <style jsx>{`
          .kiosk-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
            padding: 20px;
          }

          .kiosk-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
          }

          .club-logo {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .logo-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden; /* Crops to circle */
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #3d896c;
            background: white;
            flex-shrink: 0;
          }
          .logo-image {
            width: 100%; /* Zoom in to fill circle */
            height: 100%;
            object-fit: cover; /* Cover fills and crops */
            object-position: center;
          }

          .club-info h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }

          .club-info p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }

          .staff-link a {
            background: #f0f0f0;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            transition: background 0.3s;
          }

          .staff-link a:hover {
            background: #e0e0e0;
          }

          .kiosk-main {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }

          .welcome-text {
            text-align: center;
            color: #333;
            font-size: 28px;
            margin-bottom: 30px;
          }

          .quick-amounts {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }

          .quick-btn {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border: 3px solid transparent;
            padding: 30px;
            border-radius: 15px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .quick-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }

          .quick-btn.active {
            background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
            border-color: #3d896c;
            color: white;
          }

          .quick-label {
            font-size: 18px;
            font-weight: 600;
          }

          .quick-price {
            font-size: 24px;
            font-weight: 700;
          }

          .divider {
            text-align: center;
            margin: 30px 0;
            position: relative;
          }

          .divider::before,
          .divider::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 40%;
            height: 1px;
            background: #ddd;
          }

          .divider::before {
            left: 0;
          }
          .divider::after {
            right: 0;
          }

          .divider span {
            background: white;
            padding: 0 20px;
            color: #999;
            font-size: 14px;
          }

          .transaction-form {
            margin-top: 30px;
          }

          .form-group {
            margin-bottom: 25px;
          }

          .form-group label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: #333;
            font-size: 16px;
          }

          .form-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            transition: border 0.3s;
          }

          .form-input:focus {
            outline: none;
            border-color: #3d896c;
          }

          .amount-input {
            font-size: 32px;
            font-weight: 700;
            text-align: center;
          }

          .type-buttons,
          .payment-buttons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .type-btn,
          .payment-btn {
            padding: 15px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
          }

          .type-btn:hover,
          .payment-btn:hover {
            border-color: #3d896c;
            background: #f5f7fa;
          }

          .type-btn.active,
          .payment-btn.active {
            background: #3d896c;
            color: white;
            border-color: #3d896c;
          }

          .optional-fields {
            margin: 30px 0;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
          }

          .optional-fields summary {
            cursor: pointer;
            font-weight: 600;
            color: #3d896c;
            list-style: none;
          }

          .optional-content {
            margin-top: 20px;
          }

          .action-buttons {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 15px;
            margin-top: 30px;
          }

          .btn {
            padding: 20px;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: #f0f0f0;
            color: #333;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #e0e0e0;
          }

          .btn-primary {
            background: linear-gradient(135deg, #3d896c 0%, #2d6d56 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(212, 152, 42, 0.5);
          }

          .btn-primary:hover:not(:disabled) {
            background: linear-gradient(
              135deg,
              #3d896c 0%,
              #d4982a 100%
            ); /* Forest → Gold */
            box-shadow: 0 6px 20px rgba(212, 152, 42, 0.5);
          }

          .message {
            margin-top: 20px;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
          }

          .message.success {
            background: #d4edda;
            color: #155724;
            border: 2px solid #c3e6cb;
          }

          .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 2px solid #f5c6cb;
          }

          @media (max-width: 768px) {
            .quick-amounts {
              grid-template-columns: 1fr;
            }

            .type-buttons,
            .payment-buttons {
              grid-template-columns: 1fr;
            }

            .action-buttons {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
