import React, { useState } from "react";
import { MATERIALES_SEMILLA } from "./fixtures/seedData";

export const MaterialsView: React.FC = () => {
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todas");

  const categorias = ["Todas", "Guía Docente", "Protocolo Imprimible", "Actividad de Refuerzo"];

  const materialesFiltrados =
    categoriaFiltro === "Todas"
      ? MATERIALES_SEMILLA
      : MATERIALES_SEMILLA.filter((m) => m.categoria === categoriaFiltro);

  const handleDescarga = (titulo: string) => {
    alert(`Iniciando descarga local de: ${titulo}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
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
          📂 Centro de Materiales y Guías Docentes
        </h1>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.875rem", lineHeight: 1.4 }}>
          Descarga manuales, recursos para el aula y protocolos en formato PDF e imprimibles.
        </p>
      </div>

      {/* Filter Tabs Segmented */}
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaFiltro(cat)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: categoriaFiltro === cat ? "#0284c7" : "#1e293b",
              color: categoriaFiltro === cat ? "#ffffff" : "#94a3b8",
              border: "1px solid #334155",
              minHeight: "36px",
              flex: "1 1 auto",
              textAlign: "center",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Materials Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {materialesFiltrados.map((mat) => (
          <div
            key={mat.id}
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "#0f172a",
                  color: "#38bdf8",
                  marginBottom: "0.5rem",
                }}
              >
                {mat.categoria}
              </div>
              <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.5rem 0", lineHeight: 1.3 }}>
                {mat.titulo}
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>{mat.descripcion}</p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #334155",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                {mat.tipo} • {mat.tamano}
              </span>
              <button
                onClick={() => handleDescarga(mat.titulo)}
                aria-label={`Descargar recurso ${mat.titulo}`}
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.5rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "center",
                  minHeight: "38px",
                }}
              >
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
