import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PanelShell } from "../PanelShell";

describe("PanelShell — Panel del Facilitador (SPEC-002)", () => {
  it("renders the facilitator view by default with classroom seed data", () => {
    render(<PanelShell />);
    expect(screen.getByText(/Panel del Facilitador — Mis Aulas/i)).toBeInTheDocument();
    expect(screen.getByText(/Aula 3° A/i)).toBeInTheDocument();
    expect(screen.getByText(/Aula 3° B/i)).toBeInTheDocument();
  });

  it("opens the ProtocolModal when clicking the protocol emergency button", () => {
    render(<PanelShell />);
    const button = screen.getByRole("button", { name: /Abrir protocolo/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/\[VALIDAR\] Borrador no validado por Arianna/i)).toBeInTheDocument();
    expect(screen.getByText(/Escuchar con calma y contención/i)).toBeInTheDocument();
  });

  it("closes the ProtocolModal when pressing Escape", () => {
    render(<PanelShell />);
    const button = screen.getByRole("button", { name: /Abrir protocolo/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches to Coordinator view when changing role in selector", () => {
    render(<PanelShell />);
    const select = screen.getByLabelText(/Rol:/i);
    fireEvent.change(select, { target: { value: "coordinador" } });

    expect(screen.getByText(/Coordinación Institucional — Reportes Agregados/i)).toBeInTheDocument();
    expect(screen.getByText(/Aulas Activas/i)).toBeInTheDocument();
  });

  it("navigates to Materials tab when clicking Materiales navigation tab", () => {
    render(<PanelShell />);
    const materialsTab = screen.getByRole("button", { name: /^Materiales$/i });
    fireEvent.click(materialsTab);

    expect(screen.getByText(/Centro de Materiales y Guías Docentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Guía del Facilitador — La Isla de los Acuerdos/i)).toBeInTheDocument();
  });

  it("increments weekly follow-up count when clicking '+ Registré seguimiento'", () => {
    render(<PanelShell />);
    const incrementBtn = screen.getByRole("button", { name: /Registrar seguimiento para Aula 3° A/i });
    
    expect(screen.getAllByText(/Seguimientos esta semana:/i).length).toBeGreaterThan(0);
    fireEvent.click(incrementBtn);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
