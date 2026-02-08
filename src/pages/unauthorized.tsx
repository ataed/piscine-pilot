export default function Unauthorized() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fa",
      }}
    >
      <h1 style={{ fontSize: "48px", margin: 0 }}>🚫</h1>
      <h2 style={{ marginTop: "20px" }}>Accès Refusé</h2>
      <p style={{ color: "#666", marginTop: "10px" }}>
        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
      </p>
      <a
        href="/"
        style={{
          marginTop: "30px",
          padding: "12px 24px",
          background: "#3d896c",
          color: "white",
          textDecoration: "none",
          borderRadius: "8px",
        }}
      >
        Retour à l'accueil
      </a>
    </div>
  );
}
