import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("ya no muestra el distintivo de borrador", () => {
    // Se apagó el 2026-09-18, con el guion aprobado y a petición de
    // producto. El motivo sigue explicado en `DistintivoBorrador.tsx`, junto
    // con lo que sigue sin cumplirse: esto no se ha probado con niñas y
    // niños (Constitución IX).
    render(<App />);

    expect(screen.queryByText("Borrador no validado")).not.toBeInTheDocument();
  });

  it("expone un encabezado principal", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });

  it("no escribe nada en el almacenamiento del navegador", () => {
    render(<App />);

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
