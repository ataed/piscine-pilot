import { Transaction } from "../../shared/types";
import QRCode from "react-qr-code";

interface ReceiptPreviewProps {
  transaction: Transaction;
  onClose: () => void;
}

export function ReceiptPreview({ transaction, onClose }: ReceiptPreviewProps) {
  const verificationData = JSON.stringify({
    id: transaction.id,
    amt: transaction.amount,
    sig: transaction.hash.slice(0, 16),
  });

  const handlePrint = () => {
    // Get the receipt content
    const printContent = document.querySelector(".receipt-paper");
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Write clean HTML with only the receipt
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.id.slice(0, 8)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Courier New', monospace;
            background: white;
            padding: 10mm;
          }
          
          .receipt-paper {
            max-width: 80mm;
            margin: 0 auto;
            background: white;
            position: relative;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 30px;
            font-weight: bold;
            color: rgba(0, 0, 0, 0.05);
            pointer-events: none;
            white-space: nowrap;
          }
          
          .receipt-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .receipt-header img {
            width: 60px;
            margin-bottom: 10px;
          }
          
          .receipt-header h1 {
            font-size: 20px;
            margin: 5px 0;
          }
          
          .receipt-header p {
            font-size: 11px;
            margin: 3px 0;
          }
          
          .receipt-details,
          .receipt-items {
            margin: 12px 0;
            font-size: 12px;
          }
          
          .receipt-details p,
          .receipt-items p {
            margin: 5px 0;
          }
          
          .receipt-items h3 {
            font-size: 14px;
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
          }
          
          .receipt-total {
            text-align: center;
            margin: 15px 0;
            font-size: 20px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 10px 0;
          }
          
          .security-section {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 12px 0;
            padding: 8px;
            background: #f8f9fa;
            border: 1px dotted #999;
          }
          
          .security-info {
            font-size: 9px;
          }
          
          .hash-label {
            font-weight: bold;
            margin: 0;
          }
          
          .hash-code {
            font-family: monospace;
            margin: 2px 0;
            word-break: break-all;
          }
          
          .scan-instruction {
            color: #2d6d56;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
          }
          
          .receipt-footer {
            text-align: center;
            font-size: 11px;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px dashed #999;
          }
          
          .receipt-footer p {
            margin: 3px 0;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-paper">
          <div className="watermark">CLUB TANGEROIS</div>

          <div className="receipt-header">
            <img
              src="/logo.webp"
              alt="Club Logo"
              style={{ width: "80px", marginBottom: "10px" }}
            />
            <h1>CLUB TANGEROIS</h1>
            <p>Route de Tetouan, Tanger</p>
          </div>

          <div className="receipt-details">
            <p>
              <strong>Date:</strong>{" "}
              {new Date(transaction.created_at).toLocaleString("fr-MA", {
                timeZone: "Africa/Casablanca",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              <strong>Ticket #:</strong>{" "}
              {transaction.id.slice(0, 8).toUpperCase()}
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

          <div className="security-section">
            <div
              style={{
                background: "white",
                padding: "5px",
                display: "inline-block",
              }}
            >
              <QRCode value={verificationData} size={64} level="M" />
            </div>
            <div className="security-info">
              <p className="hash-label">SIGNATURE NUMÉRIQUE:</p>
              <p className="hash-code">{transaction.hash.slice(0, 16)}...</p>
              <p className="scan-instruction">Scan to Verify</p>
            </div>
          </div>

          <div className="receipt-footer">
            <p>Merci de votre visite !</p>
            <p>www.clubtangerois.ma</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button onClick={handlePrint}>🖨️ Imprimer</button>
          <button onClick={onClose}>❌ Fermer</button>
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
          width: 100%;
        }

        .receipt-paper {
          background: white;
          border: 2px dashed #ccc;
          padding: 20px;
          font-family: "Courier New", monospace;
          position: relative;
          overflow: hidden;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 30px;
          font-weight: bold;
          color: rgba(0, 0, 0, 0.05);
          pointer-events: none;
          white-space: nowrap;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }

        .receipt-header h1 {
          font-size: 22px;
          margin: 0;
          text-transform: uppercase;
        }

        .receipt-header p {
          margin: 5px 0 0 0;
          font-size: 12px;
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

        .security-section {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 15px;
          padding: 10px;
          background: #f8f9fa;
          border: 1px dotted #999;
        }

        .security-info {
          text-align: left;
          font-size: 10px;
        }

        .hash-label {
          font-weight: bold;
          margin: 0;
        }

        .hash-code {
          font-family: monospace;
          margin: 2px 0;
          word-break: break-all;
        }

        .scan-instruction {
          color: #2d6d56;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
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
          transition: all 0.3s;
        }

        .receipt-actions button:first-child {
          background: #3d896c;
          color: white;
        }

        .receipt-actions button:first-child:hover {
          background: #2d6d56;
        }

        .receipt-actions button:last-child {
          background: #e0e0e0;
        }

        .receipt-actions button:last-child:hover {
          background: #d0d0d0;
        }
      `}</style>
    </div>
  );
}
