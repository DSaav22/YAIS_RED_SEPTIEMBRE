import React, { useEffect, useRef } from "react";
import { PASOS_PROTOCOLO_SEMILLA } from "./fixtures/seedData";

interface ProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtocolModal: React.FC<ProtocolModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="protocol-modal-title"
      tabIndex={-1}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.75rem",
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          borderRadius: "1rem",
          border: "1px solid #334155",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          padding: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-block",
                padding: "0.2rem 0.5rem",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 600,
                backgroundColor: "rgba(217, 119, 6, 0.2)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                marginBottom: "0.5rem",
              }}
            >
              [VALIDAR] Borrador no validado por Arianna
            </div>
            <h2
              id="protocol-modal-title"
              style={{ fontSize: "clamp(1.125rem, 4vw, 1.375rem)", fontWeight: 700, color: "#38bdf8", margin: 0, lineHeight: 1.3 }}
            >
              ¿Qué hago si un niño me cuenta algo?
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.8125rem", marginTop: "0.25rem", margin: "0.25rem 0 0 0" }}>
              Protocolo de Actuación Humana y Derivación Institucional Directa.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar protocolo"
            style={{
              background: "#1e293b",
              border: "1px solid #475569",
              color: "#f8fafc",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8125rem",
              minHeight: "40px",
              whiteSpace: "nowrap",
            }}
          >
            Cerrar (Esc)
          </button>
        </div>

        <hr style={{ borderColor: "#334155", margin: "0.875rem 0" }} />

        {/* Protocol Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {PASOS_PROTOCOLO_SEMILLA.map((paso) => (
            <div
              key={paso.numero}
              style={{
                display: "flex",
                gap: "0.875rem",
                backgroundColor: "#1e293b",
                padding: "0.875rem",
                borderRadius: "0.75rem",
                border: "1px solid #334155",
              }}
            >
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "50%",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {paso.numero}
              </div>
              <div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 0.25rem 0" }}>
                  {paso.titulo}
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "#cbd5e1", margin: 0, lineHeight: "1.4" }}>
                  {paso.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Numbers Direct Panel */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.875rem",
            backgroundColor: "rgba(14, 165, 233, 0.1)",
            border: "1px solid rgba(14, 165, 233, 0.3)",
            borderRadius: "0.75rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8", fontSize: "0.875rem" }}>
            📞 Contactos Oficiales de Derivación e Intervención
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#e2e8f0", fontSize: "0.8125rem", lineHeight: "1.5" }}>
            <li>
              <strong>Defensoría de la Niñez (DNA):</strong> Línea 800-11-30-40 (Gratuita)
            </li>
            <li>
              <strong>Línea de Apoyo Familia:</strong> 156 (Atención 24 hrs)
            </li>
            <li>
              <strong>Protección Colegio:</strong> Gabinete Psicológico / Dirección
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
