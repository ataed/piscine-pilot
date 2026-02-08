/**
 * Create User Modal
 * Admin can create new staff users (cashier, manager, admin)
 */

import { useState } from "react";

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string;
}

export function CreateUserModal({
  onClose,
  onSuccess,
  sessionId,
}: CreateUserModalProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"cashier" | "manager" | "admin">("cashier");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePinClick = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (username.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères");
      return;
    }

    if (fullName.length < 2) {
      setError("Le nom complet doit contenir au moins 2 caractères");
      return;
    }

    if (pin.length !== 4) {
      setError("Le code PIN doit contenir 4 chiffres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3000/api/local/auth/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            username: username.toLowerCase(),
            pin,
            role,
            full_name: fullName,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(
          data.error?.message || "Échec de la création de l'utilisateur",
        );
      }
    } catch (error) {
      console.error("Create user error:", error);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Créer un Utilisateur</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Username */}
          <div className="form-group">
            <label>Nom d'utilisateur *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Ex: ahmed, fatima"
              className="form-input"
              required
              disabled={loading}
              autoFocus
            />
            <small>
              Utilisé pour la connexion (lettres et chiffres uniquement)
            </small>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label>Nom complet *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Ahmed Bennani"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div className="form-group">
            <label>Rôle *</label>
            <div className="role-buttons">
              <button
                type="button"
                onClick={() => setRole("cashier")}
                className={`role-btn ${role === "cashier" ? "active" : ""}`}
                disabled={loading}
              >
                <span className="role-icon">💰</span>
                <span className="role-name">Caissier</span>
                <small>Créer des transactions</small>
              </button>

              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`role-btn ${role === "manager" ? "active" : ""}`}
                disabled={loading}
              >
                <span className="role-icon">📊</span>
                <span className="role-name">Gérant</span>
                <small>Dashboard + Transactions</small>
              </button>

              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`role-btn ${role === "admin" ? "active" : ""}`}
                disabled={loading}
              >
                <span className="role-icon">⚙️</span>
                <span className="role-name">Admin</span>
                <small>Accès complet</small>
              </button>
            </div>
          </div>

          {/* PIN */}
          <div className="form-group">
            <label>Code PIN (4 chiffres) *</label>
            <div className="pin-display">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="pin-dot">
                  {pin.length > i ? "●" : "○"}
                </div>
              ))}
            </div>

            <div className="pin-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinClick(digit.toString())}
                  className="pin-button"
                  disabled={loading || pin.length >= 4}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin("")}
                className="pin-button clear"
                disabled={loading}
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => handlePinClick("0")}
                className="pin-button"
                disabled={loading || pin.length >= 4}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="pin-button backspace"
                disabled={loading || pin.length === 0}
              >
                ⌫
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="error-message">{error}</div>}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !username || !fullName || pin.length !== 4}
            >
              {loading ? "⏳ Création..." : "✅ Créer l'utilisateur"}
            </button>
          </div>
        </form>

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
            z-index: 1000;
            padding: 20px;
            overflow-y: auto;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 600px;
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

          .modal-form {
            padding: 30px;
          }

          .form-group {
            margin-bottom: 25px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
          }

          .form-input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            transition: border 0.3s;
          }

          .form-input:focus {
            outline: none;
            border-color: #3d896c;
          }

          .form-group small {
            display: block;
            margin-top: 6px;
            color: #666;
            font-size: 12px;
          }

          .role-buttons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .role-btn {
            padding: 20px 15px;
            border: 2px solid #e0e0e0;
            background: white;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }

          .role-btn:hover:not(:disabled) {
            border-color: #3d896c;
            background: #f0fdf4;
          }

          .role-btn.active {
            border-color: #3d896c;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            box-shadow: 0 4px 12px rgba(61, 137, 108, 0.2);
          }

          .role-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .role-icon {
            font-size: 32px;
          }

          .role-name {
            font-weight: 600;
            font-size: 14px;
            color: #333;
          }

          .role-btn small {
            font-size: 11px;
            color: #666;
            text-align: center;
          }

          .pin-display {
            display: flex;
            justify-content: center;
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 15px;
          }

          .pin-dot {
            font-size: 28px;
            color: #3d896c;
          }

          .pin-pad {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .pin-button {
            padding: 18px;
            font-size: 20px;
            font-weight: 600;
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .pin-button:hover:not(:disabled) {
            background: #3d896c;
            color: white;
            border-color: #3d896c;
            transform: scale(1.05);
          }

          .pin-button:active:not(:disabled) {
            transform: scale(0.95);
          }

          .pin-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .pin-button.clear {
            background: #fee2e2;
            color: #dc2626;
            border-color: #fca5a5;
          }

          .pin-button.clear:hover:not(:disabled) {
            background: #dc2626;
            color: white;
          }

          .pin-button.backspace {
            background: #fef3c7;
            color: #d97706;
            border-color: #fde68a;
          }

          .pin-button.backspace:hover:not(:disabled) {
            background: #d97706;
            color: white;
          }

          .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            border: 2px solid #fca5a5;
          }

          .modal-actions {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 12px;
            margin-top: 30px;
          }

          .btn-secondary,
          .btn-primary {
            padding: 14px 24px;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s;
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
            box-shadow: 0 4px 12px rgba(61, 137, 108, 0.3);
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(61, 137, 108, 0.4);
          }

          .btn-primary:disabled,
          .btn-secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 600px) {
            .role-buttons {
              grid-template-columns: 1fr;
            }

            .modal-actions {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
