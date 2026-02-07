import type { Transaction } from "../../shared/types";

interface ReceiptPreviewProps {
  transaction: Transaction;
  onClose: () => void;
}

export function ReceiptPreview({ transaction, onClose }: ReceiptPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-paper">
          <div className="receipt-header">
            <h1>PISCINE PILOT</h1>
            <p>Swimming Club Receipt</p>
          </div>

          <div className="receipt-details">
            <p>
              <strong>Date:</strong>{" "}
              {new Date(transaction.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Receipt #:</strong> {transaction.id.slice(0, 8)}
            </p>
          </div>

          <div className="receipt-items">
            <h3>DETAILS</h3>
            <p>
              <strong>Type:</strong> {transaction.type.toUpperCase()}
            </p>
            <p>
              <strong>Payment:</strong>{" "}
              {transaction.payment_method.toUpperCase()}
            </p>
            {transaction.customer_name && (
              <p>
                <strong>Customer:</strong> {transaction.customer_name}
              </p>
            )}
            {transaction.notes && (
              <p>
                <strong>Notes:</strong> {transaction.notes}
              </p>
            )}
          </div>

          <div className="receipt-total">
            <h2>TOTAL: {(transaction.amount / 100).toFixed(2)} MAD</h2>
          </div>

          <div className="receipt-footer">
            <p>Thank you for your visit!</p>
            <p>Keep this receipt</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button onClick={handlePrint}>🖨️ Print Receipt</button>
          <button onClick={onClose}>❌ Close</button>
        </div>
      </div>

      <style jsx>{`
        .receipt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .receipt-container {
          background: white;
          padding: 20px;
          border-radius: 10px;
          max-width: 400px;
        }

        .receipt-paper {
          background: white;
          border: 2px dashed #ccc;
          padding: 20px;
          font-family: "Courier New", monospace;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }

        .receipt-header h1 {
          font-size: 24px;
          margin: 0;
        }

        .receipt-details,
        .receipt-items {
          margin: 15px 0;
        }

        .receipt-total {
          text-align: center;
          margin: 20px 0;
          font-size: 24px;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 10px 0;
        }

        .receipt-footer {
          text-align: center;
          font-size: 12px;
          margin-top: 15px;
        }

        .receipt-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .receipt-actions button {
          flex: 1;
          padding: 12px;
          font-size: 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .receipt-actions button:first-child {
          background: #0070f3;
          color: white;
        }

        .receipt-actions button:last-child {
          background: #e0e0e0;
        }

        @media print {
          .receipt-overlay {
            background: white;
          }
          .receipt-actions {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
