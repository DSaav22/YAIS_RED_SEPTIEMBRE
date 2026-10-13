import React, { useState } from "react";
import { AULAS_SEMILLA, CHECKLIST_SEMILLA, MATERIALES_SEMILLA } from "./fixtures/seedData";

interface FacilitatorDashboardViewProps {
  onOpenProtocol: () => void;
  onNavigateToMaterials: () => void;
}

export const FacilitatorDashboardView: React.FC<FacilitatorDashboardViewProps> = ({
  onOpenProtocol,
  onNavigateToMaterials,
}) => {
  const [aulas] = useState(AULAS_SEMILLA);
  const [checklist, setChecklist] = useState(CHECKLIST_SEMILLA);
  const [conteoSeguimientos, setConteoSeguimientos] = useState<Record<string, number>>({
    "aula-3a": 2,
    "aula-3b": 1,
    "aula-4a": 0,
  });

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completado: !item.completado } : item))
    );
  };

  const registrarSeguimiento = (aulaId: string) => {
    setConteoSeguimientos((prev) => ({
      ...prev,
      [aulaId]: (prev[aulaId] || 0) + 1,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Responsive Header Banner */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          backgroundColor: "#1e293b",
          padding: "1.25rem",
          borderRadius: "1rem",
          border: "1px solid #334155",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 700,
              color: "#f8fafc",
              margin: "0 0 0.375rem 0",
              lineHeight: 1.25,
            }}
          >
            Panel del Facilitador — Mis Aulas
          </h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.875rem", lineHeight: 1.4 }}>
            Acompañamiento pedagógico y seguimiento agregado del grupo.
          </p>
        </div>

        {/* Emergency Action Button */}
        <button
          onClick={onOpenProtocol}
          aria-label="Abrir protocolo de actuación si un niño me cuenta algo"
          style={{
            backgroundColor: "#0284c7",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid #38bdf8",
            cursor: "pointer",
            boxShadow: "0 0 15px rgba(2, 132, 199, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            textAlign: "center",
            minHeight: "44px",
            lineHeight: 1.2,
          }}
        >
          <span>🛡️</span>
          <span>¿Qué hago si un niño me cuenta algo? (Protocolo)</span>
        </button>
      </div>

      {/* Main Grid: Classrooms + Readiness Checklist */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1.25rem" }}>
        {/* Left Column: Aulas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#38bdf8", margin: 0 }}>
            📚 Mis Aulas en Curso
          </h2>

          {aulas.map((aula) => (
            <div
              key={aula.id}
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                border: "1px solid #334155",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              {/* Classroom Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.25rem 0" }}>
                    {aula.etiqueta}
                  </h3>
                  <span style={{ fontSize: "0.8125rem", color: "#94a3b8", display: "block" }}>
                    {aula.grado} • {aula.conteoIntegrantes} integrantes
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.25rem 0.625rem",
                    borderRadius: "9999px",
                    backgroundColor: aula.porcentajeAvance === 100 ? "rgba(34, 197, 94, 0.2)" : "rgba(56, 189, 248, 0.2)",
                    color: aula.porcentajeAvance === 100 ? "#4ade80" : "#38bdf8",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {aula.porcentajeAvance === 100 ? "Completado" : `${aula.porcentajeAvance}% avance`}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ fontSize: "0.8125rem", color: "#cbd5e1", marginBottom: "0.375rem" }}>
                  {aula.episodioActual}
                </div>
                <div style={{ height: "8px", backgroundColor: "#0f172a", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${aula.porcentajeAvance}%`,
                      backgroundColor: "#0284c7",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Follow-up button */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginTop: "0.25rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid #334155",
                }}
              >
                <span style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>
                  Seguimientos esta semana: <strong>{conteoSeguimientos[aula.id] || 0}</strong>
                </span>
                <button
                  onClick={() => registrarSeguimiento(aula.id)}
                  aria-label={`Registrar seguimiento para ${aula.etiqueta}`}
                  style={{
                    backgroundColor: "#334155",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    minHeight: "36px",
                    flex: "1 1 auto",
                    textAlign: "center",
                  }}
                >
                  + Registré seguimiento
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Readiness Checklist + Quick Materials */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Checklist Card */}
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              border: "1px solid #334155",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#38bdf8", margin: "0 0 1rem 0" }}>
              📋 Preparación del Docente
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {checklist.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    fontSize: "0.875rem",
                    color: item.completado ? "#f8fafc" : "#cbd5e1",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.completado}
                    onChange={() => toggleChecklist(item.id)}
                    style={{
                      marginTop: "0.15rem",
                      accentColor: "#0284c7",
                      width: "18px",
                      height: "18px",
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {item.texto}
                    {item.obligatorio && <span style={{ color: "#ef4444", marginLeft: "0.25rem" }}>*</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Downloadable Materials Box */}
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#38bdf8", margin: 0, whiteSpace: "nowrap" }}>
                📁 Materiales Recientes
              </h2>
              <button
                onClick={onNavigateToMaterials}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  whiteSpace: "nowrap",
                }}
              >
                Ver todos
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {MATERIALES_SEMILLA.slice(0, 2).map((mat) => (
                <div
                  key={mat.id}
                  style={{
                    backgroundColor: "#0f172a",
                    padding: "0.875rem",
                    borderRadius: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f8fafc", lineHeight: 1.3 }}>
                      {mat.titulo}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                      {mat.tipo} • {mat.tamano}
                    </div>
                  </div>
                  <button
                    aria-label={`Descargar ${mat.titulo}`}
                    style={{
                      backgroundColor: "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.375rem",
                      padding: "0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "center",
                      minHeight: "36px",
                    }}
                    onClick={() => alert(`Simulando descarga de: ${mat.titulo}`)}
                  >
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
