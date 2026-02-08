import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "../lib/auth-context"; // Assuming you have this
import Head from "next/head";

export default function TicketScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [verificationStatus, setStatus] = useState<
    "idle" | "loading" | "valid" | "invalid" | "error"
  >("idle");
  const [ticketData, setTicketData] = useState<any>(null);
  const { isAuthenticated } = useAuth(); // Only logged in staff can scan

  // Play sounds for feedback (Optional but Pro)
  const playSound = (type: "success" | "error") => {
    const audio = new Audio(
      type === "success" ? "/sounds/success.mp3" : "/sounds/error.mp3",
    );
    audio.play().catch((e) => console.log("Audio play failed", e));
  };

  const handleScan = async (data: string) => {
    if (
      !data ||
      verificationStatus === "loading" ||
      verificationStatus === "valid"
    )
      return;

    // Use the raw text from the QR
    setScanResult(data);
    verifyTicket(data);
  };

  const verifyTicket = async (qrString: string) => {
    setStatus("loading");

    try {
      // 1. Parse the QR JSON
      // Expected format: {"id":"...", "amt":5000, "sig":"..."}
      const parsed = JSON.parse(qrString);

      if (!parsed.id) throw new Error("Invalid QR Code");

      // 2. Ask the Server: "Is this ID real and does it match?"
      // Note: You need to create this simple API endpoint or use existing transaction fetch
      const res = await fetch(`/api/local/transactions/${parsed.id}`);
      const serverData = await res.json();

      if (!res.ok || !serverData.success) {
        setStatus("invalid");
        playSound("error");
        return;
      }

      const transaction = serverData.data;

      // 3. SECURITY CHECK: Compare the Hash (Signature)
      // The QR code claims a signature. Does it match the database?
      // AND does it match the transaction ID?
      const isValid =
        transaction.hash.startsWith(parsed.sig) &&
        transaction.amount === parsed.amt;

      if (isValid) {
        setTicketData(transaction);
        setStatus("valid");
        playSound("success");
      } else {
        setStatus("invalid"); // It's a fake ticket (cloned or modified)
        playSound("error");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      playSound("error");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setStatus("idle");
    setTicketData(null);
  };

  if (!isAuthenticated)
    return <div className="p-4">Access Denied. Please Login.</div>;

  return (
    <div className="scanner-container">
      <Head>
        <title>Club Scanner</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      <div className="scanner-header">
        <h1>🎟️ SCANNER TICKET</h1>
        <p>Alignez le QR Code dans le cadre</p>
      </div>

      <div className="scanner-viewport">
        {/* Only show camera if we are scanning */}
        {verificationStatus === "idle" || verificationStatus === "error" ? (
          <Scanner
            onScan={(results) => {
              // 1. Fix: It returns an array, so we take the first item
              if (results && results.length > 0) {
                handleScan(results[0].rawValue);
              }
            }}
            onError={(error) => {
              // 2. Fix: specific TypeScript cast
              if (error instanceof Error) {
                console.log(error.message);
              } else {
                console.log("Unknown scanner error");
              }
            }}
            // 3. Fix: 'options' object is replaced by direct props in v2
            scanDelay={500}
            allowMultiple={true}
          />
        ) : null}
      </div>

      {/* RESULT OVERLAY */}
      {verificationStatus !== "idle" && (
        <div className={`result-overlay ${verificationStatus}`}>
          {verificationStatus === "loading" && (
            <div className="status-box">
              <div className="spinner">🔄</div>
              <h2>Vérification...</h2>
            </div>
          )}

          {verificationStatus === "valid" && ticketData && (
            <div className="status-box success">
              <div className="icon">✅</div>
              <h2>TICKET VALIDE</h2>
              <div className="ticket-details">
                <p>
                  <strong>Type:</strong> {ticketData.type.toUpperCase()}
                </p>
                <p>
                  <strong>Prix:</strong> {(ticketData.amount / 100).toFixed(2)}{" "}
                  MAD
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(ticketData.created_at).toLocaleTimeString()}
                </p>
                {/* Check for duplicate use: logic could be added here */}
              </div>
              <button onClick={resetScanner}>Scanner le suivant</button>
            </div>
          )}

          {(verificationStatus === "invalid" ||
            verificationStatus === "error") && (
            <div className="status-box error">
              <div className="icon">⛔</div>
              <h2>INVALIDE / FRAUDE</h2>
              <p>Ce ticket n'est pas reconnu par le système.</p>
              <button onClick={resetScanner}>Réessayer</button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .scanner-container {
          min-height: 100vh;
          background: #000;
          color: white;
          display: flex;
          flex-direction: column;
        }

        .scanner-header {
          padding: 20px;
          text-align: center;
          background: #1a1a1a;
          z-index: 10;
        }

        .scanner-viewport {
          flex: 1;
          position: relative;
          background: #000;
        }

        .result-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: slideUp 0.3s ease-out;
        }

        .result-overlay.valid {
          background: rgba(39, 174, 96, 0.95);
        }
        .result-overlay.invalid {
          background: rgba(192, 57, 43, 0.95);
        }
        .result-overlay.error {
          background: rgba(192, 57, 43, 0.95);
        }
        .result-overlay.loading {
          background: rgba(0, 0, 0, 0.8);
        }

        .status-box {
          background: white;
          color: #333;
          padding: 30px;
          border-radius: 20px;
          text-align: center;
          width: 100%;
          max-width: 350px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .icon {
          font-size: 60px;
          margin-bottom: 10px;
        }

        h2 {
          margin: 0 0 10px 0;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ticket-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin: 15px 0;
          text-align: left;
        }

        .ticket-details p {
          margin: 5px 0;
          font-size: 16px;
          border-bottom: 1px dashed #ddd;
          padding-bottom: 5px;
        }

        button {
          background: #333;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          font-size: 18px;
          font-weight: bold;
          width: 100%;
          cursor: pointer;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
