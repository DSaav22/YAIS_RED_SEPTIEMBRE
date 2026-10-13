// Raíz de la aplicación (T-001-05 & SPEC-002).
//
// Permite alternar libremente entre la experiencia de aula (Juego Episodio 1)
// y el Panel del Facilitador para la gestión docente.

import { useState } from "react";
import GameShell from "./game/GameShell";
import { PanelShell } from "./panel/PanelShell";

export default function App() {
  const [modo, setModo] = useState<"juego" | "panel">("juego");

  if (modo === "panel") {
    return <PanelShell onReturnToGame={() => setModo("juego")} />;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Botón flotante para acceder al Panel del Facilitador desde el juego */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setModo("panel")}
          aria-label="Ir al Panel del Facilitador"
          style={{
            backgroundColor: "#0284c7",
            color: "#ffffff",
            border: "1px solid #38bdf8",
            borderRadius: "0.5rem",
            padding: "0.5rem 0.875rem",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
          }}
        >
          📋 Panel Facilitador
        </button>
      </div>

      <GameShell />
    </div>
  );
}
