// Tests de la cámara orbital.
//
// Lo que se prueba no es que los números salgan: es que girar la cámara no
// rompa el control. Si «adelante» dejara de ser hacia donde se mira, el
// mundo se volvería injugable en cuanto alguien tocara el giro.

import { describe, expect, it } from "vitest";

import {
  ALTURA_DE_CAMARA,
  RADIO_DE_CAMARA,
  direccionRelativaALaCamara,
  giroDeTecla,
  giroDeTeclas,
  girarYawHacia,
  normalizarAngulo,
  posicionDeCamara,
  yawDetrasDeLaMarcha,
} from "./camara";

describe("giroDeTecla", () => {
  it("gira con Q y con E, en sentidos opuestos", () => {
    expect(giroDeTecla("KeyQ")).toBe(-1);
    expect(giroDeTecla("KeyE")).toBe(1);
  });

  it("no toca las flechas ni las teclas del diálogo", () => {
    for (const tecla of ["ArrowLeft", "ArrowRight", "Tab", "Enter", "Space", "KeyW"]) {
      expect(giroDeTecla(tecla)).toBeNull();
    }
  });

  it("dos teclas opuestas se anulan", () => {
    expect(giroDeTeclas(["KeyQ", "KeyE"])).toBe(0);
    expect(giroDeTeclas([])).toBe(0);
  });
});

describe("posicionDeCamara", () => {
  it("sin giro queda donde estaba la cámara fija: detrás, en +z", () => {
    const [x, y, z] = posicionDeCamara({ x: 0, z: 0 }, 0);

    expect(x).toBeCloseTo(0, 6);
    expect(y).toBe(ALTURA_DE_CAMARA);
    expect(z).toBeCloseTo(RADIO_DE_CAMARA, 6);
  });

  it("orbita sin acercarse ni alejarse del personaje", () => {
    const objetivo = { x: 3, z: -2 };
    for (const yaw of [0, 1, 2.5, -1.2, Math.PI]) {
      const [x, , z] = posicionDeCamara(objetivo, yaw);
      expect(Math.hypot(x - objetivo.x, z - objetivo.z)).toBeCloseTo(RADIO_DE_CAMARA, 6);
    }
  });

  it("sin altura del personaje se comporta igual que antes (mundo plano)", () => {
    const [, y] = posicionDeCamara({ x: 1, z: 1 }, 0.7);
    expect(y).toBe(ALTURA_DE_CAMARA);
  });

  it("sube con el personaje en una isla alta, sin cambiar radio ni orientación", () => {
    const objetivo = { x: 5, z: -3 };
    const yaw = 1.1;
    const [xBajo, yBajo, zBajo] = posicionDeCamara(objetivo, yaw, 0);
    const [xAlto, yAlto, zAlto] = posicionDeCamara(objetivo, yaw, 3);

    expect(yAlto).toBeCloseTo(yBajo + 3, 6);
    expect(xAlto).toBeCloseTo(xBajo, 6);
    expect(zAlto).toBeCloseTo(zBajo, 6);
  });

  it("sigue mirando al personaje a cualquier altura y mantiene la distancia", () => {
    const objetivo = { x: -2, z: 4 };
    for (const altura of [-1, 0, 2.4, 10]) {
      const [x, , z] = posicionDeCamara(objetivo, 0.5, altura);
      expect(Math.hypot(x - objetivo.x, z - objetivo.z)).toBeCloseTo(RADIO_DE_CAMARA, 6);
    }
  });

  it("no lanza con entradas absurdas", () => {
    expect(() => posicionDeCamara({ x: Number.NaN, z: 0 }, 0)).not.toThrow();
    expect(() => posicionDeCamara({ x: 0, z: 0 }, Number.POSITIVE_INFINITY)).not.toThrow();
    expect(() => posicionDeCamara({ x: 1e12, z: -1e12 }, 1, 1e12)).not.toThrow();
  });
});

describe("direccionRelativaALaCamara", () => {
  const adelante = { x: 0, z: -1 };
  const derecha = { x: 1, z: 0 };

  it("sin giro no cambia nada", () => {
    expect(direccionRelativaALaCamara(adelante, 0).x).toBeCloseTo(0, 6);
    expect(direccionRelativaALaCamara(adelante, 0).z).toBeCloseTo(-1, 6);
  });

  it("«adelante» siempre aleja de la cámara, gire donde gire", () => {
    // Ésta es la regla que hace jugable la cámara orbital: la dirección de W
    // tiene que apuntar del sitio de la cámara al personaje.
    for (const yaw of [0, 0.8, 2.1, -1.7, Math.PI / 2]) {
      const [camaraX, , camaraZ] = posicionDeCamara({ x: 0, z: 0 }, yaw);
      const haciaElPersonaje = { x: -camaraX / RADIO_DE_CAMARA, z: -camaraZ / RADIO_DE_CAMARA };
      const movimiento = direccionRelativaALaCamara(adelante, yaw);

      expect(movimiento.x).toBeCloseTo(haciaElPersonaje.x, 6);
      expect(movimiento.z).toBeCloseTo(haciaElPersonaje.z, 6);
    }
  });

  it("«derecha» es perpendicular a «adelante» y no se encoge al girar", () => {
    for (const yaw of [0, 1.3, -2.4]) {
      const frente = direccionRelativaALaCamara(adelante, yaw);
      const lado = direccionRelativaALaCamara(derecha, yaw);

      expect(Math.hypot(lado.x, lado.z)).toBeCloseTo(1, 6);
      expect(frente.x * lado.x + frente.z * lado.z).toBeCloseTo(0, 6);
    }
  });
});

describe("normalizarAngulo", () => {
  it("deja el ángulo en una sola vuelta", () => {
    expect(normalizarAngulo(0)).toBeCloseTo(0, 6);
    expect(normalizarAngulo(Math.PI * 2 + 0.5)).toBeCloseTo(0.5, 6);
    expect(Math.abs(normalizarAngulo(Math.PI * 3))).toBeCloseTo(Math.PI, 6);
  });
});

describe("yawDetrasDeLaMarcha", () => {
  it("con yaw=0, caminar de frente deja al personaje mirando a π: la relación inversa da yaw=0", () => {
    const adelante = { x: 0, z: -1 };
    const orden = direccionRelativaALaCamara(adelante, 0);
    const anguloDeMarcha = Math.atan2(orden.x, orden.z);

    expect(Math.abs(anguloDeMarcha)).toBeCloseTo(Math.PI, 6);
    expect(yawDetrasDeLaMarcha(anguloDeMarcha)).toBeCloseTo(0, 6);
  });

  it("es la inversa exacta para cualquier yaw: caminar de frente con ese yaw da de vuelta el mismo yaw", () => {
    const adelante = { x: 0, z: -1 };
    for (const yaw of [0, 0.7, -1.3, 2.9, -Math.PI + 0.01]) {
      const orden = direccionRelativaALaCamara(adelante, yaw);
      const anguloDeMarcha = Math.atan2(orden.x, orden.z);
      expect(normalizarAngulo(yawDetrasDeLaMarcha(anguloDeMarcha) - yaw)).toBeCloseTo(0, 5);
    }
  });
});

describe("girarYawHacia", () => {
  it("llega de un salto si el objetivo está a menos del máximo por cuadro", () => {
    expect(girarYawHacia(0, 0.1, 0.5)).toBeCloseTo(0.1, 6);
  });

  it("se detiene en el máximo por cuadro si el objetivo está más lejos", () => {
    expect(girarYawHacia(0, 2, 0.3)).toBeCloseTo(0.3, 6);
    expect(girarYawHacia(0, -2, 0.3)).toBeCloseTo(-0.3, 6);
  });

  it("toma el camino corto del círculo, no el largo", () => {
    // De 3.0 a -3.0 el camino corto cruza π, no vuelve por 0.
    const resultado = girarYawHacia(3.0, -3.0, 10);
    expect(normalizarAngulo(resultado)).toBeCloseTo(normalizarAngulo(-3.0), 5);
  });

  it("no lanza con ángulos absurdos", () => {
    expect(() => girarYawHacia(Number.NaN, 0, 0.1)).not.toThrow();
    expect(() => girarYawHacia(0, 0, -1)).not.toThrow();
  });
});
