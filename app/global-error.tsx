"use client";

// Dernier filet de sécurité si la mise en page elle-même plante : styles intégrés, aucune dépendance.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f1e6",
          color: "#1b1714",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.15 }}>
            Quelque chose a coincé de notre côté.
          </h1>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#5a524b" }}>
            Réessaie dans un instant. Si ça recommence, reviens à l’accueil.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                minHeight: 56,
                padding: "0 24px",
                borderRadius: 16,
                border: 0,
                background: "#d93a1f",
                color: "#fff",
                fontSize: "1.1rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement complet voulu */}
            <a
              href="/"
              style={{
                minHeight: 56,
                padding: "0 24px",
                borderRadius: 16,
                border: "2px solid #1b1714",
                display: "inline-flex",
                alignItems: "center",
                color: "#1b1714",
                fontSize: "1.1rem",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Retour à l’accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
