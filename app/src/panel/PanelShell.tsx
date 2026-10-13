import React, { useState } from "react";
import { FacilitatorDashboardView } from "./FacilitatorDashboardView";
import { CoordinatorDashboardView } from "./CoordinatorDashboardView";
import { MaterialsView } from "./MaterialsView";
import { ProtocolModal } from "./ProtocolModal";

export type RoleModo = "facilitador" | "coordinador";
export type TabSeccion = "dashboard" | "materiales";

interface PanelShellProps {
  onReturnToGame?: () => void;
}

export const PanelShell: React.FC<PanelShellProps> = ({ onReturnToGame }) => {
  const [rolActivo, setRolActivo] = useState<RoleModo>("facilitador");
  const [tabActiva, setTabActiva] = useState<TabSeccion>("dashboard");
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Responsive Header Navbar */}
      <header
        style={{
          backgroundColor: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "1rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
          }}
        >
          {/* Header Top Row: Brand & Status Badges */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.125rem",
                  color: "#38bdf8",
                  whiteSpace: "nowrap",
                }}
              >
                🌴 YAIS Panel
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                [VALIDAR] Borrador
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  color: "#4ade80",
                  whiteSpace: "nowrap",
                }}
              >
                Modo Offline
              </span>
            </div>

            {/* Role Switcher & Game Return */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <label htmlFor="role-select" style={{ color: "#94a3b8", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                  Rol:
                </label>
                <select
                  id="role-select"
                  value={rolActivo}
                  onChange={(e) => setRolActivo(e.target.value as RoleModo)}
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    borderRadius: "0.375rem",
                    padding: "0.375rem 0.625rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="facilitador">Docente Facilitador</option>
                  <option value="coordinador">Coordinador Institucional</option>
                </select>
              </div>

              {onReturnToGame && (
                <button
                  onClick={onReturnToGame}
                  aria-label="Volver al juego interactivo"
                  style={{
                    backgroundColor: "#334155",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    borderRadius: "0.375rem",
                    padding: "0.375rem 0.75rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    minHeight: "36px",
                  }}
                >
                  🎮 Volver al Juego
                </button>
              )}
            </div>
          </div>

          {/* Navigation Segmented Tabs */}
          <nav
            style={{
              display: "flex",
              backgroundColor: "#0f172a",
              padding: "0.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #334155",
              gap: "0.25rem",
            }}
            aria-label="Navegación del panel"
          >
            <button
              onClick={() => setTabActiva("dashboard")}
              style={{
                flex: 1,
                backgroundColor: tabActiva === "dashboard" ? "#0284c7" : "transparent",
                color: tabActiva === "dashboard" ? "#ffffff" : "#cbd5e1",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              Principal
            </button>
            <button
              onClick={() => setTabActiva("materiales")}
              style={{
                flex: 1,
                backgroundColor: tabActiva === "materiales" ? "#0284c7" : "transparent",
                color: tabActiva === "materiales" ? "#ffffff" : "#cbd5e1",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              Materiales
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main
        style={{
          flex: 1,
          padding: "1.25rem 1rem",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {tabActiva === "materiales" ? (
          <MaterialsView />
        ) : rolActivo === "facilitador" ? (
          <FacilitatorDashboardView
            onOpenProtocol={() => setIsProtocolOpen(true)}
            onNavigateToMaterials={() => setTabActiva("materiales")}
          />
        ) : (
          <CoordinatorDashboardView />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #334155",
          padding: "1rem",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "#64748b",
          backgroundColor: "#0f172a",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        La Isla de los Acuerdos — Panel de Gestión Institucional • Sin datos identificables de menores por diseño (Constitución I & II)
      </footer>

      {/* Emergency Protocol Modal */}
      <ProtocolModal isOpen={isProtocolOpen} onClose={() => setIsProtocolOpen(false)} />
    </div>
  );
};
