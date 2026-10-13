import React from "react";
import { AULAS_SEMILLA } from "./fixtures/seedData";

export const CoordinatorDashboardView: React.FC = () => {
  const totalAulas = AULAS_SEMILLA.length;
  const totalIntegrantes = AULAS_SEMILLA.reduce((sum, a) => sum + a.conteoIntegrantes, 0);
  const aulasCompletadas = AULAS_SEMILLA.filter((a) => a.porcentajeAvance === 100).length;

  const handleExportReport = () => {
    alert("Simulación: Reporte institucional exportado en PDF para patrocinadores RSE / Dirección.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Top Banner */}
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
            Coordinación Institucional — Reportes Agregados
          </h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.875rem", lineHeight: 1.4 }}>
            Métricas de grupo y estado de implementación del colegio / organización.
          </p>
        </div>

        <button
          onClick={handleExportReport}
          aria-label="Exportar reporte institucional en PDF"
          style={{
            backgroundColor: "#0284c7",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid #38bdf8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            textAlign: "center",
            minHeight: "44px",
          }}
        >
          <span>📥</span>
          <span>Exportar Reporte PDF (RSE / Dirección)</span>
        </button>
      </div>

      {/* Institutional Metrics Overview Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Aulas Activas</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.25rem" }}>{totalAulas}</div>
          <div style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>Unidades de grupo</div>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Integrantes</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#c084fc", marginTop: "0.25rem" }}>
            {totalIntegrantes}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>Alumnos en grupos</div>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Docentes Capacitados</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#4ade80", marginTop: "0.25rem" }}>100%</div>
          <div style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>Protocolo revisado</div>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Aulas en Cierre</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#facc15", marginTop: "0.25rem" }}>
            {aulasCompletadas} / {totalAulas}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#cbd5e1" }}>Episodio 1 completado</div>
        </div>
      </div>

      {/* Aggregated Progress Table Container */}
      <div
        style={{
          backgroundColor: "#1e293b",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          border: "1px solid #334155",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#38bdf8", margin: "0 0 1rem 0" }}>
          📊 Estado de Avance por Aula (Datos Agregados)
        </h2>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#f8fafc", fontSize: "0.8125rem", minWidth: "500px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                <th style={{ padding: "0.625rem" }}>Aula / Grupo</th>
                <th style={{ padding: "0.625rem" }}>Grado</th>
                <th style={{ padding: "0.625rem" }}>Total Grupo</th>
                <th style={{ padding: "0.625rem" }}>Estado del Episodio</th>
                <th style={{ padding: "0.625rem" }}>Avance %</th>
              </tr>
            </thead>
            <tbody>
              {AULAS_SEMILLA.map((aula) => (
                <tr key={aula.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "0.625rem", fontWeight: 600 }}>{aula.etiqueta}</td>
                  <td style={{ padding: "0.625rem", color: "#94a3b8" }}>{aula.grado}</td>
                  <td style={{ padding: "0.625rem", color: "#94a3b8" }}>{aula.conteoIntegrantes} alumnos</td>
                  <td style={{ padding: "0.625rem" }}>{aula.episodioActual}</td>
                  <td style={{ padding: "0.625rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          height: "6px",
                          width: "60px",
                          backgroundColor: "#0f172a",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${aula.porcentajeAvance}%`,
                            backgroundColor: "#0284c7",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.75rem" }}>{aula.porcentajeAvance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
